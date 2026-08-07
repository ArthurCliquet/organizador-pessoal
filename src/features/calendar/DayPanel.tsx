import { useEffect, useState, useCallback } from 'react';
import type { RecurringTask, RecurringTaskLog, Task } from '../../types';
import { getTasksForDate, createTask, updateTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import {
  getRecurringTasks,
  createRecurringTask,
  deleteRecurringTask,
  getRecurringLogsForDate,
  toggleRecurringLog,
} from '../tasks/recurringTasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { getWeekday, WEEKDAY_LABELS } from './dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface DayPanelProps {
  date: string;
  onClose: () => void;
  onTasksChanged: () => void;
}

type DayItem =
  | { kind: 'task'; id: string; title: string; time: string | null; done: boolean; task: Task }
  | { kind: 'recurring'; id: string; title: string; time: string | null; done: boolean; recurringTask: RecurringTask };

export function DayPanel({ date, onClose, onTasksChanged }: DayPanelProps) {
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTime, setEditingTime] = useState('');

  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringLogs, setRecurringLogs] = useState<RecurringTaskLog[]>([]);
  const [recTitle, setRecTitle] = useState('');
  const [recTime, setRecTime] = useState('');
  const [recWeekdays, setRecWeekdays] = useState<number[]>([getWeekday(date)]);

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
    setRecWeekdays([getWeekday(date)]);
  }, [load, date]);

  const weekday = getWeekday(date);
  const dayItems: DayItem[] = [
    ...tasks.map((t): DayItem => ({ kind: 'task', id: t.id, title: t.title, time: t.time, done: t.done, task: t })),
    ...recurringTasks
      .filter((rt) => rt.weekdays.includes(weekday))
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
        return [...prev, { id: `${item.id}-${date}`, recurring_task_id: item.id, date, done }];
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

  function toggleRecWeekday(day: number) {
    setRecWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  async function handleCreateRecurring() {
    if (!recTitle.trim() || recWeekdays.length === 0) return;
    try {
      await createRecurringTask(recTitle.trim(), recWeekdays, recTime || null);
      setRecTitle('');
      setRecTime('');
      load();
      onTasksChanged();
    } catch {
      showError('Não foi possível criar a tarefa recorrente.');
    }
  }

  async function handleDeleteRecurring(id: string) {
    try {
      await deleteRecurringTask(id);
      load();
      onTasksChanged();
    } catch {
      showError('Não foi possível excluir a tarefa recorrente.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-surface-border rounded-xl w-full max-w-md p-5 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-app-text font-semibold">{date}</h3>
          <button onClick={onClose} className="text-app-muted hover:text-app-text">
            ✕
          </button>
        </div>

        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Tarefas do dia</h4>
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
                    {item.time ? `${item.time.slice(0, 5)} — ` : ''}
                    {item.title}
                  </span>
                )}
                {item.kind === 'task' && (
                  <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs">
                    ✕
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
          <h4 className="text-xs uppercase text-app-muted mb-2">Hábitos diários</h4>
          <HabitChecklist date={date} />
        </div>

        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Tarefas recorrentes</h4>
          <div className="flex flex-col gap-1 mb-2">
            {recurringTasks.map((rt) => (
              <div key={rt.id} className="group flex items-center gap-2">
                <span className="flex-1 text-sm text-app-text">
                  {rt.time ? `${rt.time.slice(0, 5)} — ` : ''}
                  {rt.title}{' '}
                  <span className="text-app-muted text-xs">({rt.weekdays.map((d) => WEEKDAY_LABELS[d]).join('')})</span>
                </span>
                <button
                  onClick={() => handleDeleteRecurring(rt.id)}
                  className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            {recurringTasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa recorrente</p>}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleRecWeekday(i)}
                  className={`w-6 h-6 rounded text-xs ${recWeekdays.includes(i) ? 'bg-primary text-white' : 'bg-app-bg text-app-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateRecurring();
                }}
                placeholder="Nova tarefa recorrente"
                className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
              />
              <input
                type="time"
                value={recTime}
                onChange={(e) => setRecTime(e.target.value)}
                className="bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
              />
              <button onClick={handleCreateRecurring} className="bg-primary text-white text-xs rounded px-2 py-1">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
