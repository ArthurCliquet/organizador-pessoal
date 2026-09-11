import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import { getTasksForRange } from '../tasks/tasksApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface RailDay {
  date: Date;
  iso: string;
  count: number;
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
    const rangeDates = [1, 2, 3, 4].map((n) => addDays(new Date(), n));
    const rangeDays = rangeDates.map((d) => toISODate(d));
    const start = rangeDays[0];
    const end = rangeDays[rangeDays.length - 1];
    getTasksForRange(start, end)
      .then((tasks) => {
        const countByDate: Record<string, number> = {};
        const hasSpecialByDate: Record<string, boolean> = {};
        for (const task of tasks) {
          if (!task.date) continue;
          countByDate[task.date] = (countByDate[task.date] ?? 0) + 1;
          if (task.is_special_event) hasSpecialByDate[task.date] = true;
        }
        setDays(
          rangeDates.map((date, i) => ({
            date,
            iso: rangeDays[i],
            count: countByDate[rangeDays[i]] ?? 0,
            hasSpecial: !!hasSpecialByDate[rangeDays[i]],
          }))
        );
      })
      .catch(() => showError('Não foi possível carregar os próximos dias.'));
  }, [showError]);

  return (
    <div>
      <div className="text-[11px] font-semibold text-app-muted-2 uppercase tracking-[0.04em] pb-1.5">Próximos dias</div>
      <div className="flex flex-col">
        {days.map((day) => (
          <Link
            key={day.iso}
            to={`/calendario?dia=${day.iso}`}
            className="flex items-center gap-2 py-1.5 text-[12.5px] text-app-muted border-t border-border-2 first:border-t-0 hover:text-app-text transition-colors"
          >
            <span className="w-[46px] shrink-0 font-mono text-xs text-app-muted-2">{formatWeekdayAbbrev(day.date)} {day.date.getDate()}</span>
            {day.hasSpecial ? <span className="diamond" /> : <span className={`dot${day.count === 0 ? ' muted' : ''}`} />}
            <span className="truncate">{day.hasSpecial ? 'evento especial' : day.count > 0 ? `${day.count} ${day.count === 1 ? 'tarefa' : 'tarefas'}` : 'livre'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
