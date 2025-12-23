import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useRegistrationCounter } from "@/hooks/useRegistrationCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const getCellColor = (count: number, max: number) => {
  if (max === 0) return "";
  const fillPercent = count / max;
  if (fillPercent >= 1) return "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 font-semibold";
  if (fillPercent >= 0.75) return "bg-orange-200 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100";
  if (fillPercent >= 0.5) return "bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100";
  return "";
};

const RegistrationsCounter = () => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  const { rows, weekCount, weekDates, isLoading } = useRegistrationCounter(startDate, endDate);

  // Track first occurrence of each day
  const rowsWithDayDisplay = useMemo(() => {
    const seenDays = new Set<string>();
    return rows.map((row) => {
      const isFirstOfDay = !seenDays.has(row.dayName);
      if (isFirstOfDay) seenDays.add(row.dayName);
      return { ...row, isFirstOfDay };
    });
  }, [rows]);

  return (
    <Layout>
      <PageHeader
        title="Registrations Counter"
        description="View registration counts across weekly program series"
      />

      <div className="flex gap-2 mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal text-xs", !startDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal text-xs", !endDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-1.5 h-3 w-3" />
              {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
          </PopoverContent>
        </Popover>

        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-1">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No programs found for the selected date range.
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 bg-muted/50 z-10 min-w-[180px] h-7 px-2 text-left font-medium text-muted-foreground">Day/Time</th>
                <th className="sticky left-[180px] bg-muted/50 z-10 min-w-[100px] h-7 px-2 text-left font-medium text-muted-foreground">Category</th>
                <th className="sticky left-[280px] bg-muted/50 z-10 min-w-[160px] h-7 px-2 text-left font-medium text-muted-foreground">Level</th>
                {weekDates.map((date, index) => (
                  <th key={index} className="text-center min-w-[50px] h-7 px-1 font-medium text-muted-foreground">
                    <div>W{index + 1}</div>
                    <div className="text-[10px] font-normal">
                      {format(date, "M/d")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsWithDayDisplay.map((row) => (
                <tr 
                  key={row.seriesKey} 
                  className={cn(
                    "border-b border-border/50 hover:bg-muted/30",
                    row.isFirstOfDay && "border-t-2 border-t-border"
                  )}
                >
                  <td className="sticky left-0 z-10 bg-background py-1 px-2">
                    {row.isFirstOfDay ? (
                      <span><span className="font-semibold">{row.dayName}</span> {row.dayTime.replace(/^[A-Za-z]+s?\s*/, '')}</span>
                    ) : (
                      <span className="pl-[1ch]">{row.dayTime.replace(/^[A-Za-z]+s?\s*/, '')}</span>
                    )}
                  </td>
                  <td className="sticky left-[180px] z-10 bg-background py-1 px-2">
                    {row.category}
                  </td>
                  <td className="sticky left-[280px] z-10 bg-background py-1 px-2">
                    {row.level}
                  </td>
                  {Array.from({ length: weekCount }, (_, weekIndex) => {
                    const weekNum = weekIndex + 1;
                    const weekEntry = row.weekData.find((w) => w.weekNumber === weekNum);
                    return (
                      <td 
                        key={weekIndex} 
                        className={cn(
                          "text-center py-1 px-1",
                          weekEntry ? getCellColor(weekEntry.count, row.maxRegistrations) : "text-muted-foreground/50"
                        )}
                        title={weekEntry ? `${format(new Date(weekEntry.date + "T00:00:00"), "MMM d, yyyy")}: ${weekEntry.count}/${row.maxRegistrations}` : "No session"}
                      >
                        {weekEntry ? weekEntry.count : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default RegistrationsCounter;
