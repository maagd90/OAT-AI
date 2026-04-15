import { addDays, addWeeks, addMonths, format, nextSunday, nextSaturday, startOfMonth, endOfMonth } from "date-fns";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const MONTH_NAMES: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function getOrdinalDay(s: string): number | null {
  const cleaned = s.replace(/st|nd|rd|th/i, "").trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

export function parseDateRange(message: string): {
  startDate?: string;
  endDate?: string;
  duration?: number;
} {
  const lower = message.toLowerCase();
  const today = new Date();

  // "next weekend"
  if (/next\s+weekend/.test(lower)) {
    const sat = nextSaturday(today);
    const sun = nextSunday(today);
    return {
      startDate: format(sat, "yyyy-MM-dd"),
      endDate: format(sun, "yyyy-MM-dd"),
      duration: 2,
    };
  }

  // "next month"
  if (/next\s+month/.test(lower)) {
    const nm = addMonths(today, 1);
    const start = startOfMonth(nm);
    const end = endOfMonth(nm);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      duration: Math.round((end.getTime() - start.getTime()) / MS_PER_DAY),
    };
  }

  // "next week"
  if (/next\s+week/.test(lower)) {
    const start = addWeeks(today, 1);
    const end = addDays(start, 6);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      duration: 7,
    };
  }

  // "for N days"
  const forDays = lower.match(/for\s+(\d+)\s+days?/);
  if (forDays) {
    const days = parseInt(forDays[1], 10);
    const start = addDays(today, 7);
    const end = addDays(start, days - 1);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      duration: days,
    };
  }

  // "N-day trip" or "N day trip"
  const nDay = lower.match(/(\d+)[\s-]day\s+trip/);
  if (nDay) {
    const days = parseInt(nDay[1], 10);
    const start = addDays(today, 7);
    const end = addDays(start, days - 1);
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      duration: days,
    };
  }

  // "from 4 July to 10 July" or "from 4th July till 10th July"
  const rangePattern = /from\s+(\d{1,2}(?:st|nd|rd|th)?)\s+([a-z]+)\s+(?:to|till|until|[-–])\s+(\d{1,2}(?:st|nd|rd|th)?)\s+([a-z]+)/i;
  const rangeMatch = message.match(rangePattern);
  if (rangeMatch) {
    const startDay = getOrdinalDay(rangeMatch[1]);
    const startMonthName = rangeMatch[2].toLowerCase();
    const endDay = getOrdinalDay(rangeMatch[3]);
    const endMonthName = rangeMatch[4].toLowerCase();

    const startMonth = MONTH_NAMES[startMonthName];
    const endMonth = MONTH_NAMES[endMonthName];

    if (startDay && startMonth !== undefined && endDay && endMonth !== undefined) {
      let year = today.getFullYear();
      let startDate = new Date(year, startMonth, startDay);
      if (startDate < today) {
        startDate = new Date(year + 1, startMonth, startDay);
      }
      let endDate = new Date(startDate.getFullYear(), endMonth, endDay);
      if (endDate < startDate) {
        endDate = new Date(startDate.getFullYear() + 1, endMonth, endDay);
      }
      const duration = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
      return {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        duration,
      };
    }
  }

  // "from July 4 to July 10"
  const rangePattern2 = /from\s+([a-z]+)\s+(\d{1,2})\s+(?:to|till|until|[-–])\s+([a-z]+)\s+(\d{1,2})/i;
  const rangeMatch2 = message.match(rangePattern2);
  if (rangeMatch2) {
    const startMonthName = rangeMatch2[1].toLowerCase();
    const startDay = parseInt(rangeMatch2[2], 10);
    const endMonthName = rangeMatch2[3].toLowerCase();
    const endDay = parseInt(rangeMatch2[4], 10);

    const startMonth = MONTH_NAMES[startMonthName];
    const endMonth = MONTH_NAMES[endMonthName];

    if (!isNaN(startDay) && startMonth !== undefined && !isNaN(endDay) && endMonth !== undefined) {
      let year = today.getFullYear();
      let startDate = new Date(year, startMonth, startDay);
      if (startDate < today) startDate = new Date(year + 1, startMonth, startDay);
      let endDate = new Date(startDate.getFullYear(), endMonth, endDay);
      if (endDate < startDate) endDate = new Date(startDate.getFullYear() + 1, endMonth, endDay);
      const duration = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
      return {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        duration,
      };
    }
  }

  return {};
}
