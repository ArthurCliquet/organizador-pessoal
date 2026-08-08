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
    <div className="flex gap-3">
      {days.map((day) => (
        <Link
          key={day.iso}
          to="/calendario"
          className="flex-1 border border-surface-border rounded p-2.5 text-center hover:border-primary transition-colors block"
        >
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-app-muted-2">
            {formatWeekdayAbbrev(day.date)}
          </div>
          <div className="font-display text-xl mt-0.5">{day.date.getDate()}</div>
          {day.hasSomething ? (
            <span className="w-1 h-1 rounded-full bg-primary inline-block mt-1" />
          ) : (
            <div className="text-[0.6rem] text-app-muted mt-1">livre</div>
          )}
        </Link>
      ))}
    </div>
  );
}
