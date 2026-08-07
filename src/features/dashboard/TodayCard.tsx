import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../../types';
import { getTasksForDate, toggleTask } from '../tasks/tasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

export function TodayCard() {
  const { showError } = useToast();
  const today = toISODate(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    try {
      setTasks(await getTasksForDate(today));
    } catch {
      showError('Não foi possível carregar as tarefas de hoje.');
    }
  }, [today, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    try {
      await toggleTask(task.id, !task.done);
    } catch {
      showError('Não foi possível atualizar a tarefa.');
      load();
    }
  }

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5">
      <h3 className="text-app-text font-semibold mb-3">Hoje</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Tarefas</h4>
          <div className="flex flex-col gap-1">
            {tasks.map((task) => (
              <label key={task.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={task.done} onChange={() => handleToggle(task)} className="accent-primary w-4 h-4" />
                <span className={`text-sm ${task.done ? 'text-app-muted line-through' : 'text-app-text'}`}>
                  {task.time ? `${task.time.slice(0, 5)} — ` : ''}
                  {task.title}
                </span>
              </label>
            ))}
            {tasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa hoje</p>}
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Hábitos</h4>
          <HabitChecklist date={today} />
        </div>
      </div>
    </div>
  );
}
