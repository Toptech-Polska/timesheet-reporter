import type { WorkItem } from "./types";

const ISO_DAY_NAMES: Record<number, string> = {
  1: "Poniedziałek",
  2: "Wtorek",
  3: "Środa",
  4: "Czwartek",
  5: "Piątek",
  6: "Sobota",
  7: "Niedziela",
};

/** Returns the Polish name of the weekday for a given ISO date string. */
export function getDayName(isoDateString: string): string {
  const [y, m, d] = isoDateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const jsDay = date.getDay(); // 0=Sun … 6=Sat
  const isoDay = jsDay === 0 ? 7 : jsDay; // convert to ISO 1=Mon … 7=Sun
  return ISO_DAY_NAMES[isoDay];
}

/** Returns the ISO 8601 week number for a given ISO date string. */
export function getISOWeekNumber(isoDateString: string): number {
  const [y, m, d] = isoDateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Set to nearest Thursday (ISO week is defined by its Thursday)
  const dayNum = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - dayNum);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Rounds n to the nearest 0.5.
 * Values with a fractional part >= 0.25 round up to the next 0.5.
 */
export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/**
 * Returns all working days in a given month as ISO date strings.
 * @param workingDaysOfWeek - ISO weekday numbers (1=Mon … 7=Sun)
 */
export function getWorkingDaysInMonth(
  year: number,
  month: number,
  workingDaysOfWeek: number[]
): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const jsDay = date.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (workingDaysOfWeek.includes(isoDay)) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      result.push(`${year}-${mm}-${dd}`);
    }
  }

  return result;
}

/**
 * Returns items that are active during the given month.
 * An item is active if active_from <= last day of month AND active_until >= first day of month.
 * Null bounds are treated as open-ended.
 */
export function filterActiveWorkItems(
  items: WorkItem[],
  year: number,
  month: number
): WorkItem[] {
  const mm = String(month).padStart(2, "0");
  const firstDay = `${year}-${mm}-01`;
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay = `${year}-${mm}-${String(lastDayNum).padStart(2, "0")}`;

  return items.filter((item) => {
    const fromOk = !item.active_from || item.active_from <= lastDay;
    const untilOk = !item.active_until || item.active_until >= firstDay;
    return fromOk && untilOk;
  });
}
