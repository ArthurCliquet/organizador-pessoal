import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import type { RecurringTask, Task } from '../../types';
import { getTasksForRange } from '../tasks/tasksApi';
import { getRecurringTasks } from '../tasks/recurringTasksApi';
import { getWeekday, toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface AgendaItem {
  key: string;
  title: string;
  time: string | null;
}

export function UpcomingAgenda() {
  const { showError } = useToast();
  const [tasksByDate, setTasksByDate] = useState<Record<string, AgendaItem[]>>({});

  useEffect(() => {
    const rangeDays = [1, 2, 3].map((n) => toISODate(addDays(new Date(), n)));
    const start = rangeDays[0];
    const end = rangeDays[rangeDays.length - 1];
    Promise.all([getTasksForRange(start, end), getRecurringTasks()])
      .then(([tasks, recurring]: [Task[], RecurringTask[]]) => {
        const grouped: Record<string, AgendaItem[]> = {};
        for (const task of tasks) {
          if (!task.date) continue;
          (grouped[task.date] ??= []).push({ key: `task-${task.id}`, title: task.title, time: task.time });
        }
        for (const date of rangeDays) {
          const weekday = getWeekday(date);
          for (const rt of recurring) {
            if (!rt.weekdays.includes(weekday)) continue;
            (grouped[date] ??= []).push({ key: `recurring-${rt.id}-${date}`, title: `↻ ${rt.title}`, time: rt.time });
          }
        }
        for (const date of Object.keys(grouped)) {
          grouped[date].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
        }
        setTasksByDate(grouped);
      })
      .catch(() => showError('Não foi possível carregar a agenda.'));
  }, [showError]);

  const dates = Object.keys(tasksByDate).sort();

  return (
    <div className="bg-surface border border-surface-border rounded p-5">
      <h3 className="font-display text-base mb-3">Próximos dias</h3>
      {dates.length === 0 && <p className="text-sm text-app-muted">Nada agendado nos próximos dias</p>}
      <div className="flex flex-col gap-3">
        {dates.map((date) => (
          <div key={date}>
            <Link to="/calendario" className="font-mono text-[0.65rem] uppercase tracking-wider text-app-muted-2 hover:text-primary">
              {date}
            </Link>
            <div className="flex flex-col gap-0.5 mt-1">
              {tasksByDate[date].map((item) => (
                <span key={item.key} className="text-sm text-app-text">
                  {item.time ? <span className="font-mono text-app-muted-2">{item.time.slice(0, 5)} — </span> : ''}
                  {item.title}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
