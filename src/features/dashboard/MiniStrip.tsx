import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import { getTasksForRange } from '../tasks/tasksApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface MiniDay {
  date: Date;
  iso: string;
  hasSomething: boolean;
}

function formatWeekdayAbbrev(date: Date): string {
  const raw = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\.$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function MiniStrip() {
  const { showError } = useToast();
  const [days, setDays] = useState<MiniDay[]>([]);

  useEffect(() => {
    const rangeDates = [1, 2, 3].map((n) => addDays(new Date(), n));
    const rangeDays = rangeDates.map((d) => toISODate(d));
    const start = rangeDays[0];
    const end = rangeDays[rangeDays.length - 1];
    getTasksForRange(start, end)
      .then((tasks) => {
        const hasSomethingByDate: Record<string, boolean> = {};
        for (const task of tasks) {
          if (!task.date) continue;
          hasSomethingByDate[task.date] = true;
        }
        setDays(
          rangeDates.map((date, i) => ({
            date,
            iso: rangeDays[i],
            hasSomething: !!hasSomethingByDate[rangeDays[i]],
          }))
        );
      })
      .catch(() => showError('Não foi possível carregar os próximos dias.'));
  }, [showError]);

  return (
    <div className="flex gap-2.5">
      {days.map((day) => (
        <Link
          key={day.iso}
          to="/calendario"
          className="flex-1 bg-white/[0.015] border border-surface-border rounded-[11px] py-2.5 px-1.5 text-center transition-[transform,border-color] duration-150 hover:border-glow-border hover:-translate-y-0.5 block"
        >
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-app-muted-2">
            {formatWeekdayAbbrev(day.date)}
          </div>
          <div className="font-display text-xl font-semibold mt-0.5">{day.date.getDate()}</div>
          <div className="h-1.5 flex items-center justify-center mt-1.5">
            {day.hasSomething ? (
              <span className="w-[5px] h-[5px] rounded-full bg-primary inline-block" />
            ) : (
              <span className="font-mono text-[0.55rem] text-app-muted-2">livre</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
