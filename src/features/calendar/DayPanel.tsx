import { useEffect, useState, useCallback } from 'react';
import type { RecurringTask, RecurringTaskLog, Task } from '../../types';
import { getTasksForDate, createTask, updateTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForDate, toggleRecurringLog, skipRecurringOccurrence } from '../tasks/recurringTasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { getWeekday } from './dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface DayPanelProps {
  date: string;
  onTasksChanged: () => void;
  refreshToken?: number;
}

type DayItem =
  | { kind: 'task'; id: string; title: string; time: string | null; done: boolean; task: Task }
  | { kind: 'recurring'; id: string; title: string; time: string | null; done: boolean; recurringTask: RecurringTask };

export function DayPanel({ date, onTasksChanged, refreshToken }: DayPanelProps) {
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTime, setEditingTime] = useState('');

  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringLogs, setRecurringLogs] = useState<RecurringTaskLog[]>([]);

  const load = useCallback(async () => {
    try {
      const [t, rt, rl] = await Promise.all([getTasksForDate(date), getRecurringTasks(), getRecurringLogsForDate(date)]);
      setTasks(t);
      setRecurringTasks(rt);
      setRecurringLogs(rl);
    } catch {
      showError('Não foi possível carregar as tarefas.');
    }
  }, [date, showError]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const weekday = getWeekday(date);
  const dayItems: DayItem[] = [
    ...tasks.map((t): DayItem => ({ kind: 'task', id: t.id, title: t.title, time: t.time, done: t.done, task: t })),
    ...recurringTasks
      .filter((rt) => rt.weekdays.includes(weekday))
      .filter((rt) => !recurringLogs.find((l) => l.recurring_task_id === rt.id)?.skipped)
      .map((rt): DayItem => ({
        kind: 'recurring',
        id: rt.id,
        title: rt.title,
        time: rt.time,
        done: recurringLogs.find((l) => l.recurring_task_id === rt.id)?.done ?? false,
        recurringTask: rt,
      })),
  ].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createTask(date, title.trim(), time || null);
      setTitle('');
      setTime('');
      load();
      onTasksChanged();
    } catch {
      showError('Não foi possível criar a tarefa.');
    }
  }

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
        return [...prev, { id: `${item.id}-${date}`, recurring_task_id: item.id, date, done, skipped: false }];
      });
      try {
        await toggleRecurringLog(item.id, date, done);
      } catch {
        showError('Não foi possível atualizar a tarefa recorrente.');
        load();
      }
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingTime(task.time ? task.time.slice(0, 5) : '');
  }

  async function commitEdit() {
    if (!editingId) return;
    const id = editingId;
    setEditingId(null);
    if (!editingTitle.trim()) return;
    try {
      await updateTask(id, { title: editingTitle.trim(), time: editingTime || null });
      load();
    } catch {
      showError('Não foi possível editar a tarefa.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      load();
      onTasksChanged();
    } catch {
      showError('Não foi possível excluir a tarefa.');
    }
  }

  async function handleSkipRecurring(recurringTaskId: string) {
    setRecurringLogs((prev) => {
      const existing = prev.find((l) => l.recurring_task_id === recurringTaskId);
      if (existing) return prev.map((l) => (l.recurring_task_id === recurringTaskId ? { ...l, skipped: true } : l));
      return [...prev, { id: `${recurringTaskId}-${date}`, recurring_task_id: recurringTaskId, date, done: false, skipped: true }];
    });
    try {
      await skipRecurringOccurrence(recurringTaskId, date);
    } catch {
      showError('Não foi possível pular a tarefa recorrente hoje.');
      load();
    }
  }

  return (
    <div className="mt-8 border border-surface-border rounded bg-surface p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-display text-2xl text-primary font-semibold leading-none">{date.slice(8, 10)}</span>
          <div className="flex flex-col">
            <span className="font-display text-base capitalize">
              {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })}
            </span>
            <span className="font-mono text-[0.65rem] tracking-wider text-app-muted-2">
              {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()} {date.slice(0, 4)}
            </span>
          </div>
        </div>

        <h3 className="font-mono text-xs uppercase tracking-wider text-app-muted-2 mb-2 font-semibold">Tarefas</h3>
        <div className="flex flex-col gap-1 mb-2">
          {dayItems.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="group flex items-center gap-2">
              <input type="checkbox" checked={item.done} onChange={() => handleToggle(item)} className="accent-primary w-4 h-4" />
              {item.kind === 'task' && editingId === item.id ? (
                <div
                  className="flex-1 flex gap-1"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) commitEdit();
                  }}
                >
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="flex-1 bg-app-bg border border-primary rounded px-1 text-sm text-app-text outline-none"
                  />
                  <input
                    type="time"
                    value={editingTime}
                    onChange={(e) => setEditingTime(e.target.value)}
                    className="bg-app-bg border border-primary rounded px-1 text-xs text-app-text outline-none"
                  />
                </div>
              ) : (
                <span
                  onDoubleClick={() => item.kind === 'task' && startEditing(item.task)}
                  className={`flex-1 text-sm ${item.done ? 'text-app-muted line-through' : 'text-app-text'}`}
                >
                  {item.kind === 'recurring' && <span title="Tarefa recorrente">↻ </span>}
                  {item.time ? <span className="font-mono text-app-muted-2">{item.time.slice(0, 5)} — </span> : ''}
                  {item.title}
                </span>
              )}
              {item.kind === 'task' && (
                <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-danger text-xs">
                  ✕
                </button>
              )}
              {item.kind === 'recurring' && (
                <button
                  onClick={() => handleSkipRecurring(item.id)}
                  title="Pular só hoje, sem mexer nos outros dias"
                  className="opacity-0 group-hover:opacity-100 font-mono text-app-muted hover:text-primary text-[0.65rem] shrink-0"
                >
                  pular hoje
                </button>
              )}
            </div>
          ))}
          {dayItems.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa</p>}
        </div>
        <div className="flex gap-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Nova tarefa"
            className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <h3 className="font-mono text-xs uppercase tracking-wider text-app-muted-2 mb-2 font-semibold">Hábitos</h3>
        <HabitChecklist date={date} />
      </div>
    </div>
  );
}
