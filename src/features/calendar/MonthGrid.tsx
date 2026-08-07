import { toISODate, getMonthGrid, formatMonthTitle } from './dateUtils';
import type { Task } from '../../types';

interface MonthGridProps {
  year: number;
  month: number;
  tasksByDate: Record<string, Task[]>;
  recurringWeekdays: Set<number>;
  onSelectDay: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MonthGrid({ year, month, tasksByDate, recurringWeekdays, onSelectDay, onMonthChange }: MonthGridProps) {
  const days = getMonthGrid(year, month);
  const today = toISODate(new Date());

  function prevMonth() {
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  }
  function nextMonth() {
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-app-muted hover:text-app-text px-2">
          ‹
        </button>
        <h2 className="text-app-text font-semibold capitalize">{formatMonthTitle(year, month)}</h2>
        <button onClick={nextMonth} className="text-app-muted hover:text-app-text px-2">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-app-muted mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === month;
          const hasTasks = (tasksByDate[iso]?.length ?? 0) > 0 || recurringWeekdays.has(day.getDay());
          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 hover:bg-surface ${
                inMonth ? 'text-app-text' : 'text-app-muted/40'
              } ${iso === today ? 'border border-primary' : ''}`}
            >
              <span>{day.getDate()}</span>
              {hasTasks && <span className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
