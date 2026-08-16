import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import { getTasksForRange } from '../tasks/tasksApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface MiniDay {
  date: Date;
  iso: string;
  hasRegular: boolean;
  hasSpecial: boolean;
}

function formatWeekdayAbbrev(date: Date): string {
  const raw = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\.$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function MiniStrip() {
  const { showError } = useToast();
  const [days, setDays] = useState<MiniDay[]>([]);

  useEffect(() => {
    const rangeDates = [0, 1, 2].map((n) => addDays(new Date(), n));
    const rangeDays = rangeDates.map((d) => toISODate(d));
    const start = rangeDays[0];
    const end = rangeDays[rangeDays.length - 1];
    getTasksForRange(start, end)
      .then((tasks) => {
        const hasRegularByDate: Record<string, boolean> = {};
        const hasSpecialByDate: Record<string, boolean> = {};
        for (const task of tasks) {
          if (!task.date) continue;
          if (task.is_special_event) hasSpecialByDate[task.date] = true;
          else hasRegularByDate[task.date] = true;
        }
        setDays(
          rangeDates.map((date, i) => ({
            date,
            iso: rangeDays[i],
            hasRegular: !!hasRegularByDate[rangeDays[i]],
            hasSpecial: !!hasSpecialByDate[rangeDays[i]],
          }))
        );
      })
      .catch(() => showError('Não foi possível carregar os próximos dias.'));
  }, [showError]);

  return (
    <div className="day-ribbon-wrap">
      <div className="day-ribbon">
        {days.map((day, i) => (
          <Fragment key={day.iso}>
            {i > 0 && <div className="day-ribbon-rule" />}
            <Link to="/calendario" className="day-ribbon-item">
              <span className="font-mono text-[0.62rem] uppercase tracking-wider text-app-muted-2">
                {formatWeekdayAbbrev(day.date)}
              </span>
              <span className="font-display text-lg font-semibold leading-none">{day.date.getDate()}</span>
              <span className="h-[6px] flex items-center gap-1">
                {day.hasRegular && <span className="day-ribbon-dot bg-primary" />}
                {day.hasSpecial && <span className="day-pad-event-mark" />}
              </span>
            </Link>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
