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
    <div className="bg-surface border border-surface-border rounded-card shadow-card p-3 md:p-3.5">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center font-mono text-[0.62rem] tracking-widest uppercase text-app-muted-2 pb-2.5">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === month;
          const dayTasks = tasksByDate[iso] ?? [];
          const isToday = iso === today;
          const isSelected = iso === selectedDate;

          // marcadores: bolinhas (comum) primeiro, losangos (evento) depois, máx. 3
          const regular = dayTasks.filter((t) => !t.is_special_event).length;
          const special = dayTasks.filter((t) => t.is_special_event).length;
          const marks: ('regular' | 'special')[] = [
            ...Array(regular).fill('regular'),
            ...Array(special).fill('special'),
          ].slice(0, 3) as ('regular' | 'special')[];

          const numClass = isSelected
            ? isToday
              ? 'inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-app-bg text-primary font-semibold -ml-0.5 -mt-0.5'
              : 'text-app-bg font-semibold'
            : isToday
              ? 'inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-primary text-app-bg font-semibold -ml-0.5 -mt-0.5'
              : inMonth
                ? 'text-app-text'
                : 'text-app-muted-2';

          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              className={`relative aspect-[1/0.92] rounded-xl p-2 flex flex-col items-start gap-1 transition-colors ${
                isSelected
                  ? 'bg-primary shadow-[0_0_0_3px_var(--color-primary-dim)]'
                  : inMonth
                    ? 'bg-surface-2 hover:bg-surface-hi'
                    : 'bg-transparent'
              }`}
            >
              <span className={`text-sm tabular-nums ${numClass}`}>{day.getDate()}</span>
              {marks.length > 0 && (
                <span className="mt-auto flex items-center gap-1">
                  {marks.map((m, i) =>
                    m === 'special' ? (
                      <span key={i} className={`day-pad-event-mark ${isSelected ? '!bg-app-bg' : ''}`} />
                    ) : (
                      <span key={i} className={`w-[5px] h-[5px] rounded-full ${isSelected ? 'bg-app-bg' : 'bg-primary'}`} />
                    )
                  )}
                  {dayTasks.length >= 2 && (
                    <span className={`font-mono text-[0.58rem] ${isSelected ? 'text-app-bg/70' : 'text-app-muted-2'}`}>
                      {dayTasks.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
