import { format } from "date-fns";
import { pl } from "date-fns/locale";

export function formatDatePL(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd.MM.yyyy", { locale: pl });
  } catch {
    return "—";
  }
}

export function formatDateTimePL(
  date: string | Date | null | undefined
): string {
  if (!date) return "—";
  try {
    return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: pl });
  } catch {
    return "—";
  }
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function formatMonthYear(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), "LLLL yyyy", { locale: pl });
}
