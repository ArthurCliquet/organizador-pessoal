import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { RecurringTask, RecurringTaskLog, Task } from '../types';
import { getTasksForDate } from '../features/tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForDate } from '../features/tasks/recurringTasksApi';
import { toISODate } from '../features/calendar/dateUtils';
import { useToast } from './ToastContext';

interface TodayAgendaContextValue {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  recurringTasks: RecurringTask[];
  recurringLogs: RecurringTaskLog[];
  setRecurringLogs: Dispatch<SetStateAction<RecurringTaskLog[]>>;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const TodayAgendaContext = createContext<TodayAgendaContextValue | undefined>(undefined);

export function TodayAgendaProvider({ children }: { children: ReactNode }) {
  const { showError } = useToast();
  const today = toISODate(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringLogs, setRecurringLogs] = useState<RecurringTaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setError(false);
    try {
      const [t, rt, rl] = await Promise.all([getTasksForDate(today), getRecurringTasks(), getRecurringLogsForDate(today)]);
      setTasks(t);
      setRecurringTasks(rt);
      setRecurringLogs(rl);
    } catch {
      showError('Não foi possível carregar as tarefas de hoje.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [today, showError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <TodayAgendaContext.Provider
      value={{ tasks, setTasks, recurringTasks, recurringLogs, setRecurringLogs, loading, error, refresh }}
    >
      {children}
    </TodayAgendaContext.Provider>
  );
}

export function useTodayAgenda(): TodayAgendaContextValue {
  const ctx = useContext(TodayAgendaContext);
  if (!ctx) throw new Error('useTodayAgenda must be used within TodayAgendaProvider');
  return ctx;
}
