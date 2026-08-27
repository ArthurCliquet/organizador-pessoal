import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import { getTasksForRange } from '../tasks/tasksApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface RailDay {
  date: Date;
  iso: string;
  hasRegular: boolean;
  hasSpecial: boolean;
}

function formatWeekdayAbbrev(date: Date): string {
  const raw = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\.$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function AgendaRail() {
  const { showError } = useToast();
  const [days, setDays] = useState<RailDay[]>([]);

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
    <div className="agenda-rail">
      {days.map((day, i) => (
        <Link key={day.iso} to="/calendario" className="agenda-rail-item">
          <span className="agenda-rail-label">
            {day.hasSpecial ? (
              <span className="day-pad-event-mark" />
            ) : day.hasRegular ? (
              <span className="day-ribbon-dot bg-primary" />
            ) : (
              <span className="agenda-rail-dot-empty" />
            )}
            {formatWeekdayAbbrev(day.date)}
            {i === 0 ? ' · hoje' : ''}
          </span>
          <span className={`font-display text-lg font-semibold leading-none ${i === 0 ? 'text-app-text' : 'text-app-muted'}`}>
            {day.date.getDate()}
          </span>
        </Link>
      ))}
    </div>
  );
}
