import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import type { RecurringTask, RecurringTaskLog, Task } from '../../types';
import { getTasksForDate, toggleTask } from '../tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForDate, toggleRecurringLog, skipRecurringOccurrence } from '../tasks/recurringTasksApi';
import { getWeekday, toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import { TaskCheck } from '../../components/common/TaskCheck';

type DayItem =
  | { kind: 'task'; id: string; title: string; time: string | null; done: boolean; isSpecialEvent: boolean }
  | { kind: 'recurring'; id: string; title: string; time: string | null; done: boolean };

interface TodayAgendaProps {
  onCountsChange?: (taskCount: number, eventCount: number) => void;
}

export function TodayAgenda({ onCountsChange }: TodayAgendaProps) {
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
    ...tasks.map((t): DayItem => ({ kind: 'task', id: t.id, title: t.title, time: t.time, done: t.done, isSpecialEvent: t.is_special_event })),
    ...recurringTasks
      .filter((rt) => rt.weekdays.includes(weekday))
      .filter((rt) => !recurringLogs.find((l) => l.recurring_task_id === rt.id)?.skipped)
      .map((rt): DayItem => ({
        kind: 'recurring',
        id: rt.id,
        title: rt.title,
        time: rt.time,
        done: recurringLogs.find((l) => l.recurring_task_id === rt.id)?.done ?? false,
      })),
  ].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });

  const eventCount = dayItems.filter((item) => item.kind === 'task' && item.isSpecialEvent).length;
  const taskCount = dayItems.length - eventCount;

  useEffect(() => {
    onCountsChange?.(taskCount, eventCount);
  }, [taskCount, eventCount, onCountsChange]);

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
        return [...prev, { id: `${item.id}-${today}`, recurring_task_id: item.id, date: today, done, skipped: false }];
      });
      try {
        await toggleRecurringLog(item.id, today, done);
      } catch {
        showError('Não foi possível atualizar a tarefa recorrente.');
        load();
      }
    }
  }

  async function handleSkipRecurring(recurringTaskId: string) {
    setRecurringLogs((prev) => {
      const existing = prev.find((l) => l.recurring_task_id === recurringTaskId);
      if (existing) return prev.map((l) => (l.recurring_task_id === recurringTaskId ? { ...l, skipped: true } : l));
      return [...prev, { id: `${recurringTaskId}-${today}`, recurring_task_id: recurringTaskId, date: today, done: false, skipped: true }];
    });
    try {
      await skipRecurringOccurrence(recurringTaskId, today);
    } catch {
      showError('Não foi possível pular a tarefa recorrente hoje.');
      load();
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Agenda de hoje</h2>
        <span className="font-mono text-xs text-app-muted-2">
          {dayItems.length} {dayItems.length === 1 ? 'tarefa' : 'tarefas'}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto overscroll-contain scrollbar-thin -mr-2 pr-2">
        {dayItems.map((item, i) => (
          <label
            key={`${item.kind}-${item.id}`}
            style={{ '--stagger': i * 40 } as CSSProperties}
            className="list-row-in group grid grid-cols-[18px_1fr_auto] items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] cursor-pointer transition-colors hover:bg-white/[0.025]"
          >
            <TaskCheck checked={item.done} onChange={() => handleToggle(item)} />
            <span className={`text-sm strike justify-self-start ${item.done ? 'text-app-muted is-done' : 'text-app-text'}`}>
              {item.time && <span className="font-mono text-xs text-app-muted-2 mr-2">{item.time.slice(0, 5)}</span>}
              {item.kind === 'recurring' && <span className="text-app-muted-2 mr-0.5" title="Tarefa recorrente">↻</span>}
              {item.kind === 'task' && item.isSpecialEvent && (
                <span className="day-pad-event-mark inline-block align-middle mr-1.5" title="Evento especial" />
              )}
              {item.title}
            </span>
            {item.kind === 'recurring' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSkipRecurring(item.id);
                }}
                title="Pular só hoje, sem mexer nos outros dias"
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 font-mono text-app-muted hover:text-primary text-[0.65rem] shrink-0"
              >
                pular hoje
              </button>
            ) : (
              <span />
            )}
          </label>
        ))}
        {dayItems.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa hoje</p>}
      </div>
    </div>
  );
}
