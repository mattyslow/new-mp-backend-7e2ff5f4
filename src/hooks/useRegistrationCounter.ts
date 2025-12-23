import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format, getDay, startOfWeek, differenceInWeeks } from "date-fns";

interface ProgramWithDetails {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  max_registrations: number;
  level_id: string | null;
  category_id: string | null;
  levels: { name: string } | null;
  categories: { name: string } | null;
  registrations: { count: number }[];
}

export interface RegistrationRow {
  seriesKey: string;
  dayOfWeek: number;
  dayName: string;
  dayTime: string;
  category: string;
  level: string;
  maxRegistrations: number;
  weekData: { weekNumber: number; date: string; count: number; programId: string }[];
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes}${ampm}`;
};

export const useRegistrationCounter = (startDate?: Date, endDate?: Date) => {
  const { data: programs, isLoading, error } = useQuery({
    queryKey: ["registration-counter-programs", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("programs")
        .select(`
          id,
          name,
          date,
          start_time,
          end_time,
          max_registrations,
          level_id,
          category_id,
          levels(name),
          categories(name),
          registrations(count)
        `)
        .order("date", { ascending: true });

      if (startDate) {
        query = query.gte("date", format(startDate, "yyyy-MM-dd"));
      }
      if (endDate) {
        query = query.lte("date", format(endDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProgramWithDetails[];
    },
  });

  const { rows, weekCount, weekDates } = useMemo(() => {
    if (!programs || programs.length === 0) {
      return { rows: [], weekCount: 0, weekDates: [] };
    }

    // Group programs by series key
    const seriesMap = new Map<string, ProgramWithDetails[]>();
    
    programs.forEach((program) => {
      const dayOfWeek = getDay(new Date(program.date + "T00:00:00"));
      const seriesKey = `${dayOfWeek}-${program.start_time}-${program.end_time}-${program.level_id || "none"}-${program.category_id || "none"}`;
      
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, []);
      }
      seriesMap.get(seriesKey)!.push(program);
    });

    // Find the earliest date to establish Week 1
    const allDates = programs.map(p => new Date(p.date + "T00:00:00"));
    const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const week1Start = startOfWeek(earliestDate, { weekStartsOn: 1 }); // Monday start

    // Calculate week dates for headers
    const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalWeeks = differenceInWeeks(latestDate, week1Start) + 1;
    const weekDatesArray: Date[] = [];
    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = new Date(week1Start);
      weekStart.setDate(weekStart.getDate() + i * 7);
      weekDatesArray.push(weekStart);
    }

    // Convert to rows
    const rows: RegistrationRow[] = [];
    
    seriesMap.forEach((seriesPrograms, seriesKey) => {
      const firstProgram = seriesPrograms[0];
      const dayOfWeek = getDay(new Date(firstProgram.date + "T00:00:00"));
      const dayName = dayNames[dayOfWeek];
      
      const dayTime = `${dayName}s ${formatTime(firstProgram.start_time)} - ${formatTime(firstProgram.end_time)}`;
      
      const weekData = seriesPrograms.map((program) => {
        const programDate = new Date(program.date + "T00:00:00");
        const weekNumber = differenceInWeeks(programDate, week1Start) + 1;
        return {
          weekNumber,
          date: program.date,
          count: program.registrations?.[0]?.count || 0,
          programId: program.id,
        };
      });

      rows.push({
        seriesKey,
        dayOfWeek,
        dayName,
        dayTime,
        category: firstProgram.categories?.name || "—",
        level: firstProgram.levels?.name || "—",
        maxRegistrations: firstProgram.max_registrations,
        weekData,
      });
    });

    // Sort rows by day of week (Monday first), then by start time
    rows.sort((a, b) => {
      const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
      const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
      if (dayA !== dayB) return dayA - dayB;
      return a.dayTime.localeCompare(b.dayTime);
    });

    return { rows, weekCount: totalWeeks, weekDates: weekDatesArray };
  }, [programs]);

  return { rows, weekCount, weekDates, isLoading, error };
};
