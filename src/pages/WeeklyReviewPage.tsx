import { useCallback, useEffect, useRef, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Habit, HabitLog, RecurringTask, RecurringTaskLog, Task, Transaction } from '../types';
import { getWeekRange, getSevenDaysFrom, toISODate } from '../features/calendar/dateUtils';
import { getTasksForRange } from '../features/tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForRange } from '../features/tasks/recurringTasksApi';
import { getHabits, getHabitLogsForRange } from '../features/habits/habitsApi';
import { getAccounts, getTransactionsForRange, calculateMonthSummary } from '../features/finance/financeApi';
import { calculateTaskStats, calculateHabitStats } from '../features/weeklyReview/weeklyReviewStats';
import { formatCurrency } from '../lib/currency';

function formatWeekLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => format(d, 'd MMM', { locale: ptBR }).toLowerCase().replace('.', '');
  return `${fmt(start)} – ${fmt(end)}`;
}

export function WeeklyReviewPage() {
  const { showError } = useToast();
  const [weekStart, setWeekStart] = useState(() => getWeekRange(new Date()).start);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const loadGenRef = useRef(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringLogs, setRecurringLogs] = useState<RecurringTaskLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const weekEnd = getWeekRange(weekStart).end;
  const startISO = toISODate(weekStart);
  const endISO = toISODate(weekEnd);
  const weekDates = getSevenDaysFrom(weekStart);
  const isCurrentWeek = startISO === toISODate(getWeekRange(new Date()).start);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(false);
    try {
      const [t, rt, rl, h, hl, tx, accs] = await Promise.all([
        getTasksForRange(startISO, endISO),
        getRecurringTasks(),
        getRecurringLogsForRange(startISO, endISO),
        getHabits(),
        getHabitLogsForRange(startISO, endISO),
        getTransactionsForRange(startISO, endISO),
        getAccounts(),
      ]);
      if (gen !== loadGenRef.current) return;
      setTasks(t);
      setRecurringTasks(rt);
      setRecurringLogs(rl);
      setHabits(h);
      setHabitLogs(hl);
      setTransactions(tx);
      setAccounts(accs);
      setHasLoadedOnce(true);
    } catch {
      if (gen !== loadGenRef.current) return;
      showError('Não foi possível carregar a revisão da semana.');
      setError(true);
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, [startISO, endISO, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const taskStats = calculateTaskStats(tasks, recurringTasks, recurringLogs, weekDates);
  const habitStats = calculateHabitStats(habits, habitLogs, weekDates);
  const { income, expense, invested } = calculateMonthSummary(transactions, startISO, endISO, accounts);

  // Only before the user has ever seen data/controls: full-page spinner, no header.
  if (loading && !hasLoadedOnce) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    );
  }

  // Same for a failure on the very first load: nothing has been shown yet.
  if (error && !hasLoadedOnce) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center gap-3 min-h-[50vh]">
        <p className="text-sm text-app-muted">Não foi possível carregar a revisão da semana.</p>
        <button onClick={() => load()} className="font-mono text-xs px-4 py-2 rounded bg-primary text-app-bg font-semibold">
          Tentar de novo
        </button>
      </div>
    );
  }

  // From here on the page has loaded at least once: the header (title + week nav)
  // stays mounted at all times, even while a subsequent week's data is being fetched
  // or fails to load.
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-semibold">Revisão semanal</h1>
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setWeekStart((prev) => subDays(prev, 7))}
            aria-label="Semana anterior"
            className="px-3 py-1.5 rounded-full bg-surface-2 text-app-text hover:text-primary-bright transition-colors"
          >
            ‹
          </button>
          <span className="text-app-muted whitespace-nowrap">{formatWeekLabel(weekStart, weekEnd)}</span>
          <button
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            disabled={isCurrentWeek}
            aria-label="Próxima semana"
            className="px-3 py-1.5 rounded-full bg-surface-2 text-app-text hover:text-primary-bright transition-colors disabled:opacity-30 disabled:hover:text-app-text disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <p className="text-sm text-app-muted">Não foi possível carregar a revisão da semana.</p>
          <button onClick={() => load()} className="font-mono text-xs px-4 py-2 rounded bg-primary text-app-bg font-semibold">
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className={loading ? 'flex flex-col gap-5 opacity-50 transition-opacity' : 'flex flex-col gap-5'}>
          <Card>
            <h2 className="font-display text-lg font-semibold mb-3">Tarefas</h2>
            <p className="text-sm text-app-text">
              <b className="font-display text-xl text-primary-bright">{taskStats.completed}</b> de {taskStats.total} concluídas
            </p>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold mb-3">Hábitos</h2>
            {habitStats.length === 0 && <p className="text-sm text-app-muted">Nenhum hábito criado ainda</p>}
            <div className="flex flex-col gap-1.5">
              {habitStats.map((h) => (
                <div key={h.habitId} className="flex items-center justify-between text-sm">
                  <span className="text-app-text">{h.name}</span>
                  <span className="font-mono text-xs text-app-muted">
                    {h.done}/{h.total}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold mb-4">Finanças</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Entradas</p>
                <p className="font-display text-xl font-semibold text-success">{formatCurrency(income)}</p>
              </div>
              <div>
                <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Gastos</p>
                <p className="font-display text-xl font-semibold text-danger">{formatCurrency(expense)}</p>
              </div>
              <div>
                <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Saldo</p>
                <p className="font-display text-xl font-semibold text-app-text">{formatCurrency(income - expense)}</p>
              </div>
              <div>
                <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Investido</p>
                <p className="font-display text-xl font-semibold text-primary">{formatCurrency(invested)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
