import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useRegistrationCounter, RegistrationRow } from "@/hooks/useRegistrationCounter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const dayColors: Record<string, string> = {
  Monday: "bg-yellow-100 dark:bg-yellow-900/30",
  Tuesday: "bg-purple-100 dark:bg-purple-900/30",
  Wednesday: "bg-green-100 dark:bg-green-900/30",
  Thursday: "bg-blue-100 dark:bg-blue-900/30",
  Friday: "bg-pink-100 dark:bg-pink-900/30",
  Saturday: "bg-orange-100 dark:bg-orange-900/30",
  Sunday: "bg-gray-100 dark:bg-gray-800/50",
};

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

  // Group rows by day for visual grouping
  const groupedRows = useMemo(() => {
    const groups: { dayName: string; rows: RegistrationRow[] }[] = [];
    let currentDay = "";
    
    rows.forEach((row) => {
      if (row.dayName !== currentDay) {
        currentDay = row.dayName;
        groups.push({ dayName: currentDay, rows: [row] });
      } else {
        groups[groups.length - 1].rows.push(row);
      }
    });
    
    return groups;
  }, [rows]);

  return (
    <Layout>
      <PageHeader
        title="Registrations Counter"
        description="View registration counts across weekly program series"
      />

      <div className="flex gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
          </PopoverContent>
        </Popover>

        {(startDate || endDate) && (
          <Button variant="ghost" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No programs found for the selected date range.
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[80px]">Day</TableHead>
                <TableHead className="sticky left-[80px] bg-muted/50 z-10 min-w-[200px]">Day/Time</TableHead>
                <TableHead className="sticky left-[280px] bg-muted/50 z-10 min-w-[150px]">Category</TableHead>
                <TableHead className="sticky left-[430px] bg-muted/50 z-10 min-w-[200px]">Level</TableHead>
                {weekDates.map((date, index) => (
                  <TableHead key={index} className="text-center min-w-[80px]">
                    <div className="font-semibold">Week {index + 1}</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      {format(date, "MMM d")}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedRows.map((group) => (
                group.rows.map((row, rowIndex) => (
                  <TableRow key={row.seriesKey} className={dayColors[row.dayName]}>
                    <TableCell className={cn("sticky left-0 z-10 font-medium", dayColors[row.dayName])}>
                      {rowIndex === 0 ? row.dayName : ""}
                    </TableCell>
                    <TableCell className={cn("sticky left-[80px] z-10", dayColors[row.dayName])}>
                      {row.dayTime}
                    </TableCell>
                    <TableCell className={cn("sticky left-[280px] z-10", dayColors[row.dayName])}>
                      {row.category}
                    </TableCell>
                    <TableCell className={cn("sticky left-[430px] z-10", dayColors[row.dayName])}>
                      {row.level}
                    </TableCell>
                    {Array.from({ length: weekCount }, (_, weekIndex) => {
                      const weekNum = weekIndex + 1;
                      const weekEntry = row.weekData.find((w) => w.weekNumber === weekNum);
                      return (
                        <TableCell 
                          key={weekIndex} 
                          className={cn(
                            "text-center",
                            weekEntry ? getCellColor(weekEntry.count, row.maxRegistrations) : ""
                          )}
                          title={weekEntry ? `${format(new Date(weekEntry.date + "T00:00:00"), "MMM d, yyyy")}: ${weekEntry.count}/${row.maxRegistrations}` : "No session"}
                        >
                          {weekEntry ? weekEntry.count : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Layout>
  );
};

export default RegistrationsCounter;
