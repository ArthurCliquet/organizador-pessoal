import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import type { RecurringTask, RecurringTaskLog, Task } from '../../types';
import { getTasksForDate, createTask, updateTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForDate, toggleRecurringLog, skipRecurringOccurrence } from '../tasks/recurringTasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { getWeekday } from './dateUtils';
import { useToast } from '../../contexts/ToastContext';
import { TaskCheck } from '../../components/common/TaskCheck';

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
  const [isSpecialEvent, setIsSpecialEvent] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingSpecialEvent, setEditingSpecialEvent] = useState(false);

  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringLogs, setRecurringLogs] = useState<RecurringTaskLog[]>([]);

  const [habitDone, setHabitDone] = useState(0);
  const [habitTotal, setHabitTotal] = useState(0);

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

  const doneCount = dayItems.filter((item) => item.done).length;

  const weekdayName = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
  const fullDate = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createTask(date, title.trim(), time || null, isSpecialEvent);
      setTitle('');
      setTime('');
      setIsSpecialEvent(false);
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
    setEditingSpecialEvent(task.is_special_event);
  }

  async function commitEdit() {
    if (!editingId) return;
    const id = editingId;
    setEditingId(null);
    if (!editingTitle.trim()) return;
    try {
      await updateTask(id, { title: editingTitle.trim(), time: editingTime || null, is_special_event: editingSpecialEvent });
      load();
      onTasksChanged();
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
    <div className="md:flex md:flex-col md:min-h-0">
      <div className="tear-rule"><span /><i /><span /></div>
      <div className="relative overflow-hidden bg-surface border border-surface-border rounded-card shadow-card p-5 md:flex md:flex-col md:min-h-0 md:flex-1">
        <div className="hero-texture" />

        <div className="relative flex items-baseline gap-3 pb-4 mb-4 border-b border-surface-border shrink-0">
          <span className="font-display text-5xl text-primary-bright font-semibold leading-none">
            {new Date(`${date}T12:00:00`).getDate()}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-lg capitalize">{weekdayName}</span>
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-app-muted-2">{fullDate}</span>
          </div>
        </div>

        <div className="relative md:flex-1 md:min-h-0 md:overflow-y-auto overscroll-contain scrollbar-thin md:-mr-2 md:pr-2">
        {/* --- Tarefas --- */}
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[0.64rem] uppercase tracking-widest text-app-muted-2 font-semibold">Tarefas</h3>
            <span className="font-mono text-[0.62rem] font-semibold text-primary bg-primary-dim rounded-full px-2 py-0.5">
              {doneCount}/{dayItems.length}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {dayItems.map((item, i) => (
              <div
                key={`${item.kind}-${item.id}`}
                style={{ '--stagger': i * 40 } as CSSProperties}
                className="list-row-in group grid grid-cols-[18px_1fr_auto] items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] transition-colors hover:bg-white/[0.025]"
              >
                <TaskCheck checked={item.done} onChange={() => handleToggle(item)} />
                {item.kind === 'task' && editingId === item.id ? (
                  <div
                    className="flex items-center gap-1"
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
                    <input
                      type="checkbox"
                      checked={editingSpecialEvent}
                      onChange={(e) => setEditingSpecialEvent(e.target.checked)}
                      title="Evento especial"
                      aria-label="Evento especial"
                      className="accent-special w-3.5 h-3.5 shrink-0"
                    />
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => item.kind === 'task' && startEditing(item.task)}
                    className={`text-sm strike justify-self-start ${item.done ? 'text-app-muted is-done' : 'text-app-text'}`}
                  >
                    {item.kind === 'recurring' && <span className="text-app-muted-2 mr-0.5" title="Tarefa recorrente">↻</span>}
                    {item.kind === 'task' && item.task.is_special_event && (
                      <span className="day-pad-event-mark inline-block align-middle mr-1.5" title="Evento especial" />
                    )}
                    {item.time ? <span className="font-mono text-xs text-app-muted-2 mr-2">{item.time.slice(0, 5)}</span> : null}
                    {item.title}
                  </span>
                )}
                {item.kind === 'task' ? (
                  <button onClick={() => handleDelete(item.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs px-1">✕</button>
                ) : (
                  <button
                    onClick={() => handleSkipRecurring(item.id)}
                    title="Pular só hoje, sem mexer nos outros dias"
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 font-mono text-app-muted hover:text-primary text-[0.65rem] shrink-0"
                  >
                    pular hoje
                  </button>
                )}
              </div>
            ))}
            {dayItems.length === 0 && <p className="text-sm text-app-muted-2">Nenhuma tarefa nesse dia</p>}
          </div>

          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-dashed border-surface-border">
            <div className="flex gap-1.5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                placeholder="Nova tarefa"
                className="flex-1 bg-app-bg border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-primary"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-app-bg border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsSpecialEvent((v) => !v)}
              aria-pressed={isSpecialEvent}
              className={`self-start inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.68rem] transition-colors ${
                isSpecialEvent ? 'border-special text-special bg-special/10' : 'border-surface-border text-app-muted'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full border ${isSpecialEvent ? 'bg-special border-special' : 'border-app-muted-2'}`} />
              Evento especial
            </button>
          </div>
        </div>

        {/* --- Hábitos --- */}
        <div className="relative mt-5 pt-5 border-t border-surface-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[0.64rem] uppercase tracking-widest text-app-muted-2 font-semibold">Hábitos</h3>
            <span className="font-mono text-[0.62rem] font-semibold text-success bg-success-dim rounded-full px-2 py-0.5">
              {habitDone}/{habitTotal}
            </span>
          </div>
          <HabitChecklist date={date} onCountsChange={(done, total) => { setHabitDone(done); setHabitTotal(total); }} />
        </div>
        </div>
      </div>
    </div>
  );
}
