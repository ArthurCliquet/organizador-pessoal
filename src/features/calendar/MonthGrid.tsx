import { toISODate, getMonthGrid, formatMonthTitle } from './dateUtils';
import type { Task } from '../../types';

interface MonthGridProps {
  year: number;
  month: number;
  tasksByDate: Record<string, Task[]>;
  recurringWeekdays: Set<number>;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function MonthGrid({ year, month, tasksByDate, recurringWeekdays, selectedDate, onSelectDay, onMonthChange }: MonthGridProps) {
  const days = getMonthGrid(year, month);
  const today = toISODate(new Date());

  function prevMonth() {
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  }
  function nextMonth() {
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="font-mono text-app-muted hover:text-app-text px-2">
          ‹
        </button>
        <h2 className="font-display text-xl text-app-text capitalize">{formatMonthTitle(year, month)}</h2>
        <button onClick={nextMonth} className="font-mono text-app-muted hover:text-app-text px-2">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-surface-border border border-surface-border rounded overflow-hidden">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-app-bg text-center font-mono text-[0.65rem] tracking-wider uppercase text-app-muted-2 py-2">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === month;
          const hasTasks = (tasksByDate[iso]?.length ?? 0) > 0 || recurringWeekdays.has(day.getDay());
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              className={`min-h-16 bg-surface hover:bg-surface-2 flex flex-col items-start p-1.5 gap-1 relative ${
                inMonth ? 'text-app-text' : 'text-app-muted-2 bg-app-bg'
              } ${isSelected ? 'shadow-[inset_0_0_0_1.5px_var(--color-success)]' : isToday ? 'shadow-[inset_0_0_0_1.5px_var(--color-primary)]' : ''}`}
            >
              <span className={`text-sm ${isToday ? 'text-primary font-bold' : ''}`}>{day.getDate()}</span>
              {hasTasks && (
                <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1.5 left-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
