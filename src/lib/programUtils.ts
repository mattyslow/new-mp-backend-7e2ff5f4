import { format, addWeeks, getDay } from "date-fns";

/**
 * Extract abbreviated level from level name
 * If numbers present (e.g., "Advanced (3.5-4.0)") → extract numbers "3.5-4.0"
 * If no numbers (e.g., "Beginner") → use main word "Beginner"
 */
export function abbreviateLevel(levelName: string | null | undefined): string {
  if (!levelName) return "";
  
  // Look for numbers pattern like "2.0-3.0" or "3.5-4.0"
  const numberMatch = levelName.match(/(\d+\.?\d*\s*-\s*\d+\.?\d*)/);
  if (numberMatch) {
    return numberMatch[1].replace(/\s/g, "");
  }
  
  // Look for single number like "2.0" or "3.5"
  const singleNumberMatch = levelName.match(/(\d+\.?\d*)/);
  if (singleNumberMatch) {
    return singleNumberMatch[1];
  }
  
  // No numbers, extract main word (first word or word before parentheses)
  const mainWord = levelName.split(/[\s(]/)[0];
  return mainWord || levelName;
}

/**
 * Format time to h:mmam/pm format (e.g., "6:30pm")
 */
export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")}${period}`;
}

/**
 * Get day of week name from date
 */
export function getDayOfWeek(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[getDay(date)];
}

/**
 * Pluralize day name (Monday → Mondays)
 */
export function pluralizeDay(day: string): string {
  return `${day}s`;
}

/**
 * Format program name following convention:
 * [Day of week] [date in m/d format] | [time in h:mmam/pm format] ([abbreviated level])
 * Example: "Monday 1/26 | 6:30pm - 8:00pm (2.0-3.0)"
 */
export function formatProgramName(
  date: Date,
  startTime: string,
  endTime: string,
  levelName: string | null | undefined
): string {
  const dayOfWeek = getDayOfWeek(date);
  const dateStr = format(date, "M/d");
  const startTimeStr = formatTimeDisplay(startTime);
  const endTimeStr = formatTimeDisplay(endTime);
  const levelAbbr = abbreviateLevel(levelName);
  
  const levelPart = levelAbbr ? ` (${levelAbbr})` : "";
  return `${dayOfWeek} ${dateStr} | ${startTimeStr} - ${endTimeStr}${levelPart}`;
}

/**
 * Format package name following convention:
 * [Day of the week]s [number of weeks] Week [abbreviated level] [category] Package ([m/d first date] - [m/d last date]; [start time h:mmam/pm - end time h:mmam/pm])
 * Example: "Mondays 5 Week 2.0-3.0 Adult Clinics Package (1/26 - 2/23; 6:30pm - 8:00pm)"
 */
export function formatPackageName(
  startDate: Date,
  endDate: Date,
  numberOfWeeks: number,
  startTime: string,
  endTime: string,
  levelName: string | null | undefined,
  categoryName: string | null | undefined
): string {
  const dayOfWeek = pluralizeDay(getDayOfWeek(startDate));
  const levelAbbr = abbreviateLevel(levelName);
  const startDateStr = format(startDate, "M/d");
  const endDateStr = format(endDate, "M/d");
  const startTimeStr = formatTimeDisplay(startTime);
  const endTimeStr = formatTimeDisplay(endTime);
  
  const levelPart = levelAbbr ? `${levelAbbr} ` : "";
  const categoryPart = categoryName ? `${categoryName} ` : "";
  
  return `${dayOfWeek} ${numberOfWeeks} Week ${levelPart}${categoryPart}Package (${startDateStr} - ${endDateStr}; ${startTimeStr} - ${endTimeStr})`;
}

/**
 * Generate array of dates for programs, one per week
 */
export function generateProgramDates(startDate: Date, numberOfWeeks: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < numberOfWeeks; i++) {
    dates.push(addWeeks(startDate, i));
  }
  return dates;
}

/**
 * Split weeks into packages
 * Returns array of { startWeekIndex, endWeekIndex, weeksCount }
 */
export function splitWeeksIntoPackages(
  totalWeeks: number,
  numberOfPackages: number
): Array<{ startWeekIndex: number; endWeekIndex: number; weeksCount: number }> {
  const packages: Array<{ startWeekIndex: number; endWeekIndex: number; weeksCount: number }> = [];
  const baseWeeksPerPackage = Math.floor(totalWeeks / numberOfPackages);
  const remainder = totalWeeks % numberOfPackages;
  
  let currentWeekIndex = 0;
  for (let i = 0; i < numberOfPackages; i++) {
    // Distribute remainder weeks to earlier packages
    const weeksInThisPackage = baseWeeksPerPackage + (i < remainder ? 1 : 0);
    packages.push({
      startWeekIndex: currentWeekIndex,
      endWeekIndex: currentWeekIndex + weeksInThisPackage - 1,
      weeksCount: weeksInThisPackage,
    });
    currentWeekIndex += weeksInThisPackage;
  }
  
  return packages;
}
