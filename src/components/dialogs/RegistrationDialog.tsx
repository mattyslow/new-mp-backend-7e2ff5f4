import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useCreateRegistration, useBatchCreateRegistrations } from "@/hooks/useRegistrations";
import { usePlayers } from "@/hooks/usePlayers";
import { usePrograms, Program } from "@/hooks/usePrograms";
import { usePackages, Package } from "@/hooks/usePackages";
import { useReferenceData } from "@/hooks/useReferenceData";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, X, MapPin, Clock, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPlayerId?: string;
}

interface Filters {
  dateFrom: Date | null;
  dateTo: Date | null;
  locationId: string | null;
  levelId: string | null;
  categoryId: string | null;
}

export function RegistrationDialog({ open, onOpenChange, preselectedPlayerId }: RegistrationDialogProps) {
  const createRegistration = useCreateRegistration();
  const batchCreateRegistrations = useBatchCreateRegistrations();
  const { data: players } = usePlayers();
  const { data: programs } = usePrograms();
  const { data: packages } = usePackages();
  const { data: locations } = useReferenceData("locations");
  const { data: levels } = useReferenceData("levels");
  const { data: categories } = useReferenceData("categories");

  const [playerId, setPlayerId] = useState(preselectedPlayerId ?? "");
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"program" | "package">("program");
  const [filters, setFilters] = useState<Filters>({
    dateFrom: null,
    dateTo: null,
    locationId: null,
    levelId: null,
    categoryId: null,
  });

  const clearFilters = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      locationId: null,
      levelId: null,
      categoryId: null,
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== null);

  const filteredPrograms = useMemo(() => {
    if (!programs) return [];
    return programs.filter((p) => {
      const programDate = startOfDay(parseISO(p.date));
      
      if (filters.dateFrom) {
        const fromDate = startOfDay(filters.dateFrom);
        // If no dateTo specified, only show programs on the exact dateFrom
        const toDate = filters.dateTo ? startOfDay(filters.dateTo) : fromDate;
        
        if (isBefore(programDate, fromDate)) return false;
        if (isAfter(programDate, toDate)) return false;
      }
      
      if (filters.locationId && p.location_id !== filters.locationId) return false;
      if (filters.levelId && p.level_id !== filters.levelId) return false;
      if (filters.categoryId && p.category_id !== filters.categoryId) return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [programs, filters]);

  const filteredPackages = useMemo(() => {
    if (!packages) return [];
    return packages.filter((p) => {
      if (filters.locationId && p.location_id !== filters.locationId) return false;
      return true;
    });
  }, [packages, filters.locationId]);

  const toggleProgramSelection = (programId: string) => {
    setSelectedProgramIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  const selectAllFilteredPrograms = () => {
    setSelectedProgramIds(new Set(filteredPrograms.map((p) => p.id)));
  };

  const clearProgramSelection = () => {
    setSelectedProgramIds(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === "program" && selectedProgramIds.size > 0) {
      const registrations = Array.from(selectedProgramIds).map((programId) => ({
        player_id: playerId,
        program_id: programId,
        package_id: null,
      }));
      batchCreateRegistrations.mutate(registrations, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    } else if (activeTab === "package" && selectedPackageId) {
      createRegistration.mutate({
        player_id: playerId,
        program_id: null,
        package_id: selectedPackageId,
      }, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    setPlayerId("");
    setSelectedProgramIds(new Set());
    setSelectedPackageId(null);
    setActiveTab("program");
    clearFilters();
  };

  const isPending = createRegistration.isPending || batchCreateRegistrations.isPending;
  
  const canSubmit =
    playerId &&
    ((activeTab === "program" && selectedProgramIds.size > 0) ||
      (activeTab === "package" && selectedPackageId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Registration</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Player Selection */}
          <div className="space-y-2">
            <Label>Player</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select player..." />
              </SelectTrigger>
              <SelectContent>
                {players?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.last_name}, {p.first_name}
                    {p.email && <span className="text-muted-foreground ml-2">({p.email})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs for Program vs Package */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "program" | "package")} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="program">Program</TabsTrigger>
              <TabsTrigger value="package">Package</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Filters</Label>
                {hasActiveFilters && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Date Range Filters - only for programs */}
              {activeTab === "program" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !filters.dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateFrom ? format(filters.dateFrom, "MMM d, yyyy") : "Any date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateFrom ?? undefined}
                          onSelect={(date) => setFilters({ ...filters, dateFrom: date ?? null })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !filters.dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateTo ? format(filters.dateTo, "MMM d, yyyy") : "Any date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateTo ?? undefined}
                          onSelect={(date) => setFilters({ ...filters, dateTo: date ?? null })}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Dropdown Filters */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <Select
                    value={filters.locationId ?? "all"}
                    onValueChange={(v) => setFilters({ ...filters, locationId: v === "all" ? null : v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeTab === "program" && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Level</Label>
                      <Select
                        value={filters.levelId ?? "all"}
                        onValueChange={(v) => setFilters({ ...filters, levelId: v === "all" ? null : v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          {levels?.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <Select
                        value={filters.categoryId ?? "all"}
                        onValueChange={(v) => setFilters({ ...filters, categoryId: v === "all" ? null : v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Program List */}
            <TabsContent value="program" className="flex-1 min-h-0 mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Programs{" "}
                  <span className="text-muted-foreground">
                    ({filteredPrograms.length}
                    {programs && filteredPrograms.length !== programs.length && ` of ${programs.length}`})
                  </span>
                </Label>
                <div className="flex gap-1">
                  {filteredPrograms.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={selectAllFilteredPrograms}
                    >
                      Select All
                    </Button>
                  )}
                  {selectedProgramIds.size > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={clearProgramSelection}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className={cn("border rounded-md", selectedProgramIds.size > 0 ? "h-[160px]" : "h-[200px]")}>
                <div className="p-2 space-y-1">
                  {filteredPrograms.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No programs match your filters
                    </p>
                  ) : (
                    filteredPrograms.map((program) => (
                      <ProgramItem
                        key={program.id}
                        program={program}
                        selected={selectedProgramIds.has(program.id)}
                        onToggle={() => toggleProgramSelection(program.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Selected Programs View - Inside TabsContent */}
              {selectedProgramIds.size > 0 && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Selected ({selectedProgramIds.size})
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={clearProgramSelection}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[72px]">
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedProgramIds).map((id) => {
                        const program = programs?.find((p) => p.id === id);
                        if (!program) return null;
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="flex items-center gap-1 py-0.5 px-2 text-xs"
                          >
                            <span className="max-w-[120px] truncate">{program.name}</span>
                            <span className="text-muted-foreground">
                              {format(parseISO(program.date), "M/d")}
                            </span>
                            <button
                              type="button"
                              className="ml-0.5 hover:text-destructive"
                              onClick={() => toggleProgramSelection(id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            {/* Package List */}
            <TabsContent value="package" className="flex-1 min-h-0 mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">
                  Packages{" "}
                  <span className="text-muted-foreground">
                    ({filteredPackages.length}
                    {packages && filteredPackages.length !== packages.length && ` of ${packages.length}`})
                  </span>
                </Label>
              </div>
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredPackages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No packages match your filters
                    </p>
                  ) : (
                    filteredPackages.map((pkg) => (
                      <PackageItem
                        key={pkg.id}
                        pkg={pkg}
                        selected={selectedPackageId === pkg.id}
                        onSelect={() => setSelectedPackageId(pkg.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isPending ? "Saving..." : activeTab === "program" && selectedProgramIds.size > 1 
                ? `Register (${selectedProgramIds.size})` 
                : "Register"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ProgramItemProps {
  program: Program;
  selected: boolean;
  onToggle: () => void;
}

function ProgramItem({ program, selected, onToggle }: ProgramItemProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left p-3 rounded-md border transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0",
          selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"
        )}>
          {selected && <Check className="h-3 w-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{program.name}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {format(parseISO(program.date), "EEE, MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(program.start_time)} - {formatTime(program.end_time)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {program.levels?.name && (
              <Badge variant="secondary" className="text-xs h-5">
                {program.levels.name}
              </Badge>
            )}
            {program.locations?.name && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {program.locations.name}
              </span>
            )}
            {program.categories?.name && (
              <span className="text-xs text-muted-foreground">
                {program.categories.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-sm">${program.price}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Users className="h-3 w-3" />
            {program.max_registrations} max
          </div>
        </div>
      </div>
    </button>
  );
}

interface PackageItemProps {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
}

function PackageItem({ pkg, selected, onSelect }: PackageItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-md border transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{pkg.name}</div>
          {pkg.locations?.name && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {pkg.locations.name}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-semibold text-sm">${pkg.price}</div>
        </div>
      </div>
    </button>
  );
}
