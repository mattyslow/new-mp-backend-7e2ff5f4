export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSV(csvText: string): ParsedCSV {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseMultipleValues(value: string): string[] {
  if (!value) return [];
  // Split by newlines or commas, trim, and filter empty
  return value
    .split(/[\n,]/)
    .map(v => v.trim())
    .filter(v => v.length > 0);
}

export function parseTime(timeStr: string): string {
  if (!timeStr) return '00:00:00';
  
  // Handle formats like "6:00 PM", "18:00", "6:00:00 PM"
  const cleaned = timeStr.trim().toUpperCase();
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');
  
  const timePart = cleaned.replace(/[AP]M/i, '').trim();
  const parts = timePart.split(':');
  
  let hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;
  
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Try to parse various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse date and time from Item column format like:
 * "Wednesday 1/28 | 9:00am - 10:30am (3.0-3.5)"
 * "Wednesday 2/4 | 9:00am - 10:30am (3.0-3.5)"
 * Returns { date: "2025-01-28", startTime: "09:00:00", endTime: "10:30:00" }
 */
export function parseDateTimeFromItem(itemStr: string): {
  date: string;
  startTime: string;
  endTime: string;
} {
  const defaultResult = {
    date: new Date().toISOString().split('T')[0],
    startTime: '00:00:00',
    endTime: '00:00:00',
  };
  
  if (!itemStr) return defaultResult;
  
  // Try to extract date pattern like "1/28" or "2/4"
  const dateMatch = itemStr.match(/(\d{1,2})\/(\d{1,2})/);
  let date = defaultResult.date;
  
  if (dateMatch) {
    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const currentYear = new Date().getFullYear();
    // Use next year if the date seems to be in the past
    const tentativeDate = new Date(currentYear, month - 1, day);
    const year = tentativeDate < new Date() ? currentYear + 1 : currentYear;
    date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  // Try to extract time pattern like "9:00am - 10:30am" or "5:30pm - 6:30pm"
  const timeMatch = itemStr.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
  let startTime = defaultResult.startTime;
  let endTime = defaultResult.endTime;
  
  if (timeMatch) {
    startTime = parseTime(timeMatch[1]);
    endTime = parseTime(timeMatch[2]);
  }
  
  return { date, startTime, endTime };
}
