import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Filter, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  name: string;
}

interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "date" | "dateRange";
  options?: FilterOption[];
}

interface TableFiltersProps {
  filters: FilterConfig[];
  values: Record<string, string | Date | null>;
  onChange: (key: string, value: string | Date | null) => void;
  onClear: () => void;
}

export function TableFilters({ filters, values, onChange, onClear }: TableFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount = Object.values(values).filter((v) => v !== null && v !== "" && v !== "all").length;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClear();
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                {filter.type === "select" && filter.options && (
                  <Select
                    value={(values[filter.key] as string) || "all"}
                    onValueChange={(v) => onChange(filter.key, v === "all" ? null : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={`All ${filter.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {filter.label}</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {filter.type === "date" && (
                  <DatePickerField
                    value={values[filter.key] as Date | null}
                    onChange={(date) => onChange(filter.key, date)}
                    placeholder={`Select ${filter.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.map((filter) => {
            const value = values[filter.key];
            if (!value || value === "all") return null;

            let displayValue = "";
            if (filter.type === "select" && filter.options) {
              displayValue = filter.options.find((o) => o.id === value)?.name || String(value);
            } else if (filter.type === "date" && value instanceof Date) {
              displayValue = format(value, "MMM d, yyyy");
            } else {
              displayValue = String(value);
            }

            return (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1 pr-1"
              >
                <span className="text-muted-foreground">{filter.label}:</span>
                {displayValue}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-transparent"
                  onClick={() => onChange(filter.key, null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DatePickerFieldProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder: string;
}

function DatePickerField({ value, onChange, placeholder }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMM d, yyyy") : placeholder}
          {value && (
            <X
              className="ml-auto h-4 w-4 hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={(date) => {
            onChange(date || null);
            setOpen(false);
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}