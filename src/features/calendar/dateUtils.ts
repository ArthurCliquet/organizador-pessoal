import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function getMonthGrid(year: number, month: number): Date[] {
  const first = startOfMonth(new Date(year, month, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 0 });
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  };
}

export function getSevenDaysFrom(start: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
}

export function formatMonthTitle(year: number, month: number): string {
  return format(new Date(year, month, 1), 'MMMM yyyy', { locale: ptBR });
}

export function getWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
