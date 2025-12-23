import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateRegistration } from "@/hooks/useRegistrations";
import { usePrograms, Program } from "@/hooks/usePrograms";
import { useReferenceData } from "@/hooks/useReferenceData";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, X, MapPin, Clock, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registrationId: string;
  currentProgramId: string | null;
  currentProgramName?: string;
}

interface Filters {
  dateFrom: Date | null;
  dateTo: Date | null;
  locationId: string | null;
  levelId: string | null;
  categoryId: string | null;
}

export function EditRegistrationDialog({ 
  open, 
  onOpenChange, 
  registrationId,
  currentProgramId,
  currentProgramName 
}: EditRegistrationDialogProps) {
  const updateRegistration = useUpdateRegistration();
  const { data: programs } = usePrograms();
  const { data: locations } = useReferenceData("locations");
  const { data: levels } = useReferenceData("levels");
  const { data: categories } = useReferenceData("categories");

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
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
      // Exclude currently registered program
      if (p.id === currentProgramId) return false;
      
      const programDate = startOfDay(parseISO(p.date));
      
      if (filters.dateFrom) {
        const fromDate = startOfDay(filters.dateFrom);
        const toDate = filters.dateTo ? startOfDay(filters.dateTo) : fromDate;
        
        if (isBefore(programDate, fromDate)) return false;
        if (isAfter(programDate, toDate)) return false;
      }
      
      if (filters.locationId && p.location_id !== filters.locationId) return false;
      if (filters.levelId && p.level_id !== filters.levelId) return false;
      if (filters.categoryId && p.category_id !== filters.categoryId) return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [programs, filters, currentProgramId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProgramId) return;

    updateRegistration.mutate(
      { id: registrationId, program_id: selectedProgramId, package_id: null },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedProgramId(null);
          clearFilters();
        },
      }
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes}${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Change Program</DialogTitle>
          {currentProgramName && (
            <p className="text-sm text-muted-foreground">
              Currently registered for: <span className="font-medium">{currentProgramName}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Filters</Label>
              {hasActiveFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Date Range Filters */}
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
            </div>
          </div>

          {/* Program List */}
          <div className="flex-1 min-h-0 space-y-2">
            <Label className="text-sm">
              Select New Program{" "}
              <span className="text-muted-foreground">
                ({filteredPrograms.length} available)
              </span>
            </Label>
            <ScrollArea className="h-[250px] border rounded-md">
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
                      selected={selectedProgramId === program.id}
                      onSelect={() => setSelectedProgramId(program.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={!selectedProgramId || updateRegistration.isPending}
            className="w-full"
          >
            {updateRegistration.isPending ? "Updating..." : "Change Program"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgramItem({ 
  program, 
  selected, 
  onSelect 
}: { 
  program: Program; 
  selected: boolean;
  onSelect: () => void;
}) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes}${ampm}`;
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-2 rounded-md border transition-colors",
        selected 
          ? "border-primary bg-primary/5" 
          : "border-transparent hover:bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{program.name}</span>
            {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
            <span>{format(parseISO(program.date), "EEE, MMM d, yyyy")}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(program.start_time)} - {formatTime(program.end_time)}
            </span>
            {program.locations && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {program.locations.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {program.max_registrations} max
            </span>
          </div>
          <div className="flex gap-1 mt-1.5">
            {program.levels && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                {program.levels.name}
              </Badge>
            )}
            {program.categories && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {program.categories.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-medium">${Number(program.price).toFixed(0)}</span>
        </div>
      </div>
    </button>
  );
}
