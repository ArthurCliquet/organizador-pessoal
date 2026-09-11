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
const MAX_MARKS = 3;

export function MonthGrid({ year, month, tasksByDate, selectedDate, onSelectDay }: MonthGridProps) {
  const days = getMonthGrid(year, month);
  const today = toISODate(new Date());

  return (
    <div className="reveal-in cgrid md:min-h-0 md:overflow-y-auto scrollbar-thin">
      {WEEKDAYS.map((w) => (
        <div key={w} className="dow">
          {w}
        </div>
      ))}
      {days.map((day) => {
        const iso = toISODate(day);
        const inMonth = day.getMonth() === month;
        const dayTasks = tasksByDate[iso] ?? [];
        const isToday = iso === today;
        const isSelected = iso === selectedDate;
        const shown = dayTasks.slice(0, MAX_MARKS);
        const extra = dayTasks.length - shown.length;

        return (
          <button
            key={iso}
            onClick={() => onSelectDay(iso)}
            className={`cc${!inMonth ? ' dim' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
          >
            <span className="d">{day.getDate()}</span>
            {shown.map((t) => (
              <span key={t.id} className={`e${t.is_special_event ? ' evt' : ''}`}>
                {t.title}
              </span>
            ))}
            {extra > 0 && <span className="more">+{extra}</span>}
          </button>
        );
      })}
    </div>
  );
}
