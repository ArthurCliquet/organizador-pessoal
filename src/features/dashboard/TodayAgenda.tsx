import { useEffect } from 'react';
import { toggleTask } from '../tasks/tasksApi';
import { toggleRecurringLog, skipRecurringOccurrence } from '../tasks/recurringTasksApi';
import { getWeekday, toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import { useTodayAgenda } from '../../contexts/TodayAgendaContext';
import { TaskCheck } from '../../components/common/TaskCheck';

type DayItem =
  | { kind: 'task'; id: string; title: string; time: string | null; done: boolean; isSpecialEvent: boolean }
  | { kind: 'recurring'; id: string; title: string; time: string | null; done: boolean };

interface TodayAgendaProps {
  onCountsChange?: (taskCount: number, eventCount: number, dayTotal: number, dayDone: number) => void;
}

export function TodayAgenda({ onCountsChange }: TodayAgendaProps) {
  const { showError } = useToast();
  const today = toISODate(new Date());
  const { tasks, setTasks, recurringTasks, recurringLogs, setRecurringLogs, refresh } = useTodayAgenda();

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
  const dayDone = dayItems.filter((item) => item.done).length;

  useEffect(() => {
    onCountsChange?.(taskCount, eventCount, dayItems.length, dayDone);
  }, [taskCount, eventCount, dayItems.length, dayDone, onCountsChange]);

  async function handleToggle(item: DayItem) {
    if (item.kind === 'task') {
      setTasks((prev) => prev.map((t) => (t.id === item.id ? { ...t, done: !t.done } : t)));
      try {
        await toggleTask(item.id, !item.done);
      } catch {
        showError('Não foi possível atualizar a tarefa.');
        refresh();
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
        refresh();
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
      refresh();
    }
  }

  return (
    <div className="max-h-[220px] overflow-y-auto overscroll-contain scrollbar-thin flex flex-col">
      {dayItems.map((item) => (
        <label
          key={`${item.kind}-${item.id}`}
          className="group flex items-center gap-2.5 py-2 border-t border-border-2 first:border-t-0 cursor-pointer"
        >
          <TaskCheck checked={item.done} onChange={() => handleToggle(item)} />
          {item.kind === 'task' && item.isSpecialEvent && <span className="diamond" />}
          <span className={`flex-1 text-sm strike min-w-0 truncate ${item.done ? 'text-app-muted-2 is-done' : 'text-app-text'}`}>
            {item.time && <span className="font-mono text-xs text-app-muted-2 mr-2">{item.time.slice(0, 5)}</span>}
            {item.kind === 'recurring' && <span className="text-app-muted-2 mr-0.5" title="Tarefa recorrente">↻</span>}
            {item.title}
          </span>
          {item.kind === 'recurring' && (
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
          )}
        </label>
      ))}
      {dayItems.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa hoje</p>}
    </div>
  );
}
