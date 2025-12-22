import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useCreateProgram, useUpdateProgram, useCreateProgramsWithPackages, Program } from "@/hooks/usePrograms";
import { useReferenceData } from "@/hooks/useReferenceData";
import { format } from "date-fns";

interface ProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program | null;
}

export function ProgramDialog({ open, onOpenChange, program }: ProgramDialogProps) {
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const createProgramsWithPackages = useCreateProgramsWithPackages();
  const { data: levels } = useReferenceData("levels");
  const { data: categories } = useReferenceData("categories");
  const { data: locations } = useReferenceData("locations");
  const { data: seasons } = useReferenceData("seasons");

  // Base program fields
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    start_time: "",
    end_time: "",
    price: 0,
    max_registrations: 0,
    level_id: null as string | null,
    category_id: null as string | null,
    location_id: null as string | null,
    season_id: null as string | null,
  });

  // Package creation fields
  const [createPackage, setCreatePackage] = useState(false);
  const [packageData, setPackageData] = useState({
    numberOfWeeks: 1,
    numberOfPackages: 1,
    individualDayPrice: 0,
    packagePerDayPrice: 0,
    packagePriceOverride: "" as string,
    maxRegistrations: 0,
  });

  useEffect(() => {
    if (program) {
      setFormData({
        name: program.name,
        date: program.date,
        start_time: program.start_time,
        end_time: program.end_time,
        price: Number(program.price),
        max_registrations: program.max_registrations,
        level_id: program.level_id,
        category_id: program.category_id,
        location_id: program.location_id,
        season_id: program.season_id,
      });
      setCreatePackage(false);
    } else {
      setFormData({
        name: "",
        date: "",
        start_time: "",
        end_time: "",
        price: 0,
        max_registrations: 0,
        level_id: null,
        category_id: null,
        location_id: null,
        season_id: null,
      });
      setPackageData({
        numberOfWeeks: 1,
        numberOfPackages: 1,
        individualDayPrice: 0,
        packagePerDayPrice: 0,
        packagePriceOverride: "",
        maxRegistrations: 0,
      });
      setCreatePackage(false);
    }
  }, [program, open]);


  // Get selected level and category names for naming
  const selectedLevel = levels?.find((l) => l.id === formData.level_id);
  const selectedCategory = categories?.find((c) => c.id === formData.category_id);

  // Calculate package price preview
  const getPackagePricePreview = () => {
    if (!createPackage || packageData.numberOfWeeks <= 0 || packageData.numberOfPackages <= 0) {
      return null;
    }

    const weeksPerPackage = Math.floor(packageData.numberOfWeeks / packageData.numberOfPackages);
    const remainder = packageData.numberOfWeeks % packageData.numberOfPackages;
    const overridePrice = packageData.packagePriceOverride ? parseFloat(packageData.packagePriceOverride) : null;

    const packages: { weeks: number; price: number }[] = [];
    for (let i = 0; i < packageData.numberOfPackages; i++) {
      const weeks = weeksPerPackage + (i < remainder ? 1 : 0);
      const price = overridePrice ?? packageData.packagePerDayPrice * weeks;
      packages.push({ weeks, price });
    }

    return packages;
  };

  const pricePreview = getPackagePricePreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (program) {
      // Update existing program
      updateProgram.mutate({ id: program.id, ...formData }, { onSuccess: () => onOpenChange(false) });
    } else if (createPackage) {
      // Create packages with programs - use formData.date as start date
      const startDate = new Date(formData.date);
      createProgramsWithPackages.mutate(
        {
          startDate,
          numberOfWeeks: packageData.numberOfWeeks,
          numberOfPackages: packageData.numberOfPackages,
          individualDayPrice: packageData.individualDayPrice,
          packagePerDayPrice: packageData.packagePerDayPrice,
          packagePriceOverride: packageData.packagePriceOverride ? parseFloat(packageData.packagePriceOverride) : null,
          maxRegistrations: packageData.maxRegistrations,
          startTime: formData.start_time,
          endTime: formData.end_time,
          levelId: formData.level_id,
          categoryId: formData.category_id,
          locationId: formData.location_id,
          seasonId: formData.season_id,
          levelName: selectedLevel?.name ?? null,
          categoryName: selectedCategory?.name ?? null,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      // Create single program
      createProgram.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isSubmitting = createProgram.isPending || updateProgram.isPending || createProgramsWithPackages.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{program ? "Edit Program" : "Add Program"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reference Fields - Always show first */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Select value={formData.location_id ?? ""} onValueChange={(v) => setFormData({ ...formData, location_id: v || null })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category_id ?? ""} onValueChange={(v) => setFormData({ ...formData, category_id: v || null })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Level</Label>
              <Select value={formData.level_id ?? ""} onValueChange={(v) => setFormData({ ...formData, level_id: v || null })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {levels?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Season</Label>
              <Select value={formData.season_id ?? ""} onValueChange={(v) => setFormData({ ...formData, season_id: v || null })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {seasons?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time fields - Always show */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Date field - Always show (used as start date for packages) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{createPackage ? "Start Date" : "Date"}</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            {/* Name field - Only show when NOT creating package */}
            {(!createPackage || program) && (
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!createPackage}
                  placeholder="Program name"
                />
              </div>
            )}
          </div>

          {/* Single Program Fields - Only show when NOT creating package */}
          {(!createPackage || program) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Max Registrations</Label>
                <Input
                  type="number"
                  value={formData.max_registrations}
                  onChange={(e) => setFormData({ ...formData, max_registrations: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          {/* Create Package Toggle - Only show when adding new program */}
          {!program && (
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={createPackage} onCheckedChange={setCreatePackage} />
              <Label className="text-sm font-medium cursor-pointer" onClick={() => setCreatePackage(!createPackage)}>
                Create as package
              </Label>
            </div>
          )}

          {/* Package Fields - Show seamlessly when creating package */}
          {createPackage && !program && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Weeks</Label>
                  <Input
                    type="number"
                    min="1"
                    value={packageData.numberOfWeeks}
                    onChange={(e) => setPackageData({ ...packageData, numberOfWeeks: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div>
                  <Label>Number of Packages</Label>
                  <Input
                    type="number"
                    min="1"
                    max={packageData.numberOfWeeks}
                    value={packageData.numberOfPackages}
                    onChange={(e) => setPackageData({ ...packageData, numberOfPackages: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Individual Day Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageData.individualDayPrice}
                    onChange={(e) => setPackageData({ ...packageData, individualDayPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="Single session price"
                  />
                </div>
                <div>
                  <Label>Package Per-Day Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageData.packagePerDayPrice}
                    onChange={(e) => setPackageData({ ...packageData, packagePerDayPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="Discounted rate"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Package Price Override</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={packageData.packagePriceOverride}
                    onChange={(e) => setPackageData({ ...packageData, packagePriceOverride: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Max Registrations</Label>
                  <Input
                    type="number"
                    min="0"
                    value={packageData.maxRegistrations}
                    onChange={(e) => setPackageData({ ...packageData, maxRegistrations: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              {/* Price Preview - Subtle styling */}
              {pricePreview && pricePreview.length > 0 && (
                <div className="text-sm text-muted-foreground pt-2">
                  <div className="space-y-1">
                    {pricePreview.map((pkg, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>Package {idx + 1}: {pkg.weeks} weeks</span>
                        <span>${pkg.price.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium text-foreground pt-1 border-t border-border">
                      <span>Total ({packageData.numberOfWeeks} programs)</span>
                      <span>${pricePreview.reduce((sum, pkg) => sum + pkg.price, 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : createPackage ? "Create Package" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
