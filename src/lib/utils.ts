import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";

export function formatDate(date: Date | string, pattern = "yyyy.MM.dd"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: ko });
}

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getMonthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });
}

export { isSameDay, isSameMonth, format, parseISO, startOfMonth, endOfMonth };

export const MEAL_LABELS: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};
