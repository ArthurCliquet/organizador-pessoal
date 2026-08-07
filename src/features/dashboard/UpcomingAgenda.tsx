import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import type { Task } from '../../types';
import { getTasksForRange } from '../tasks/tasksApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

export function UpcomingAgenda() {
  const { showError } = useToast();
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const start = toISODate(addDays(new Date(), 1));
    const end = toISODate(addDays(new Date(), 3));
    getTasksForRange(start, end)
      .then((tasks) => {
        const grouped: Record<string, Task[]> = {};
        for (const task of tasks) {
          if (!task.date) continue;
          (grouped[task.date] ??= []).push(task);
        }
        setTasksByDate(grouped);
      })
      .catch(() => showError('Não foi possível carregar a agenda.'));
  }, [showError]);

  const dates = Object.keys(tasksByDate).sort();

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5">
      <h3 className="text-app-text font-semibold mb-3">Próximos dias</h3>
      {dates.length === 0 && <p className="text-sm text-app-muted">Nada agendado nos próximos dias</p>}
      <div className="flex flex-col gap-3">
        {dates.map((date) => (
          <div key={date}>
            <Link to="/calendario" className="text-xs uppercase text-app-muted hover:text-primary">
              {date}
            </Link>
            <div className="flex flex-col gap-0.5 mt-1">
              {tasksByDate[date].map((task) => (
                <span key={task.id} className="text-sm text-app-text">
                  {task.time ? `${task.time.slice(0, 5)} — ` : ''}
                  {task.title}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
