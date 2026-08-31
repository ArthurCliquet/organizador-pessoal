import { toISODate, getMonthGrid } from './dateUtils';
import type { Task } from '../../types';

interface MonthGridProps {
  year: number;
  month: number;
  tasksByDate: Record<string, Task[]>;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function MonthGrid({ year, month, tasksByDate, selectedDate, onSelectDay }: MonthGridProps) {
  const days = getMonthGrid(year, month);
  const today = toISODate(new Date());

  return (
    <div className="grid grid-cols-7 gap-px bg-surface-border border border-surface-border rounded overflow-hidden">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-app-bg text-center font-mono text-[0.65rem] tracking-wider uppercase text-app-muted-2 py-2">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === month;
          const dayTasks = tasksByDate[iso] ?? [];
          const hasRegularTask = dayTasks.some((t) => !t.is_special_event);
          const hasSpecialEvent = dayTasks.some((t) => t.is_special_event);
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
              {(hasRegularTask || hasSpecialEvent) && (
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5">
                  {hasRegularTask && <span className="w-1 h-1 rounded-full bg-primary inline-block" />}
                  {hasSpecialEvent && <span className="day-pad-event-mark" />}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}
