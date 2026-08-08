import { useEffect, useState, useCallback } from 'react';
import type { RecurringTask, RecurringTaskLog, Task } from '../../types';
import { getTasksForDate, toggleTask } from '../tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForDate, toggleRecurringLog } from '../tasks/recurringTasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { getWeekday, toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

type DayItem =
  | { kind: 'task'; id: string; title: string; time: string | null; done: boolean }
  | { kind: 'recurring'; id: string; title: string; time: string | null; done: boolean };

export function TodayCard() {
  const { showError } = useToast();
  const today = toISODate(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringLogs, setRecurringLogs] = useState<RecurringTaskLog[]>([]);

  const load = useCallback(async () => {
    try {
      const [t, rt, rl] = await Promise.all([getTasksForDate(today), getRecurringTasks(), getRecurringLogsForDate(today)]);
      setTasks(t);
      setRecurringTasks(rt);
      setRecurringLogs(rl);
    } catch {
      showError('Não foi possível carregar as tarefas de hoje.');
    }
  }, [today, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const weekday = getWeekday(today);
  const dayItems: DayItem[] = [
    ...tasks.map((t): DayItem => ({ kind: 'task', id: t.id, title: t.title, time: t.time, done: t.done })),
    ...recurringTasks
      .filter((rt) => rt.weekdays.includes(weekday))
      .map((rt): DayItem => ({
        kind: 'recurring',
        id: rt.id,
        title: rt.title,
        time: rt.time,
        done: recurringLogs.find((l) => l.recurring_task_id === rt.id)?.done ?? false,
      })),
  ].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));

  async function handleToggle(item: DayItem) {
    if (item.kind === 'task') {
      setTasks((prev) => prev.map((t) => (t.id === item.id ? { ...t, done: !t.done } : t)));
      try {
        await toggleTask(item.id, !item.done);
      } catch {
        showError('Não foi possível atualizar a tarefa.');
        load();
      }
    } else {
      const done = !item.done;
      setRecurringLogs((prev) => {
        const existing = prev.find((l) => l.recurring_task_id === item.id);
        if (existing) return prev.map((l) => (l.recurring_task_id === item.id ? { ...l, done } : l));
        return [...prev, { id: `${item.id}-${today}`, recurring_task_id: item.id, date: today, done }];
      });
      try {
        await toggleRecurringLog(item.id, today, done);
      } catch {
        showError('Não foi possível atualizar a tarefa recorrente.');
        load();
      }
    }
  }

  const now = new Date();
  const weekdayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

  return (
    <div className="border border-surface-border bg-surface rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 border-b border-surface-border">
        <span className="font-display text-5xl text-primary font-semibold leading-none">{now.getDate()}</span>
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-lg capitalize">{weekdayLabel}</span>
          <span className="font-mono text-[0.65rem] tracking-widest text-app-muted-2 uppercase">{monthLabel} {now.getFullYear()} — Hoje</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-app-muted-2 mb-2">Tarefas</h4>
          <div className="flex flex-col gap-1">
            {dayItems.map((item) => (
              <label key={`${item.kind}-${item.id}`} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={item.done} onChange={() => handleToggle(item)} className="accent-primary w-4 h-4" />
                <span className={`text-sm ${item.done ? 'text-app-muted line-through' : 'text-app-text'}`}>
                  {item.kind === 'recurring' && <span title="Tarefa recorrente">↻ </span>}
                  {item.time ? <span className="font-mono text-app-muted-2">{item.time.slice(0, 5)} — </span> : ''}
                  {item.title}
                </span>
              </label>
            ))}
            {dayItems.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa hoje</p>}
          </div>
        </div>
        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-app-muted-2 mb-2">Hábitos</h4>
          <HabitChecklist date={today} />
        </div>
      </div>
    </div>
  );
}
