import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Habit, HabitLog, RecurringTask, RecurringTaskLog, Task, Transaction } from '../types';
import { getWeekRange, getSevenDaysFrom, toISODate, WEEKDAY_LABELS } from '../features/calendar/dateUtils';
import { getTasksForRange } from '../features/tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForRange } from '../features/tasks/recurringTasksApi';
import { getHabits, getHabitLogsForRange } from '../features/habits/habitsApi';
import { getAccounts, getTransactionsForRange, calculateMonthSummary } from '../features/finance/financeApi';
import { calculateTaskStats, calculateHabitStats } from '../features/weeklyReview/weeklyReviewStats';
import { formatCurrency } from '../lib/currency';

const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TASK_TALLY_GROUP_THRESHOLD = 20;

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
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);

  const weekEnd = getWeekRange(weekStart).end;
  const startISO = toISODate(weekStart);
  const endISO = toISODate(weekEnd);
  const weekDates = getSevenDaysFrom(weekStart);
  const isCurrentWeek = startISO === toISODate(getWeekRange(new Date()).start);

  const prevWeekStart = subDays(weekStart, 7);
  const prevWeekEnd = subDays(weekEnd, 7);
  const prevStartISO = toISODate(prevWeekStart);
  const prevEndISO = toISODate(prevWeekEnd);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    setError(false);
    try {
      const [t, rt, rl, h, hl, tx, accs, prevTx] = await Promise.all([
        getTasksForRange(startISO, endISO),
        getRecurringTasks(),
        getRecurringLogsForRange(startISO, endISO),
        getHabits(),
        getHabitLogsForRange(startISO, endISO),
        getTransactionsForRange(startISO, endISO),
        getAccounts(),
        getTransactionsForRange(prevStartISO, prevEndISO),
      ]);
      if (gen !== loadGenRef.current) return;
      setTasks(t);
      setRecurringTasks(rt);
      setRecurringLogs(rl);
      setHabits(h);
      setHabitLogs(hl);
      setTransactions(tx);
      setAccounts(accs);
      setPrevTransactions(prevTx);
      setHasLoadedOnce(true);
    } catch {
      if (gen !== loadGenRef.current) return;
      showError('Não foi possível carregar a revisão da semana.');
      setError(true);
    } finally {
      if (gen === loadGenRef.current) setLoading(false);
    }
  }, [startISO, endISO, prevStartISO, prevEndISO, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const taskStats = calculateTaskStats(tasks, recurringTasks, recurringLogs, weekDates);
  const habitStats = calculateHabitStats(habits, habitLogs, weekDates);
  const { income, expense, invested } = calculateMonthSummary(transactions, startISO, endISO, accounts);

  const { income: prevIncome, expense: prevExpense } = calculateMonthSummary(prevTransactions, prevStartISO, prevEndISO, accounts);
  const net = income - expense;
  const prevNet = prevIncome - prevExpense;
  const financeDelta = net - prevNet;

  const financeTotal = income + expense;
  const incomePct = financeTotal > 0 ? (income / financeTotal) * 100 : 0;
  const expensePct = financeTotal > 0 ? 100 - incomePct : 0;

  const taskGrouped = taskStats.total > TASK_TALLY_GROUP_THRESHOLD;
  const taskMarkCount = taskGrouped ? Math.ceil(taskStats.total / 5) : taskStats.total;
  const taskFilledCount = taskGrouped ? Math.round(taskStats.completed / 5) : taskStats.completed;

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
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/" className="back-link font-mono text-xs text-app-muted hover:text-primary-bright transition-colors w-fit">
          ← Hoje
        </Link>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] uppercase text-app-muted-2">Revisão semanal</p>
            <h1 className="font-display font-semibold text-3xl md:text-4xl leading-tight -tracking-[0.01em]">
              {formatWeekLabel(weekStart, weekEnd)}
            </h1>
          </div>
          <nav className="flex items-center gap-2 font-mono text-xs" aria-label="Navegar semanas">
            <button
              onClick={() => setWeekStart((prev) => subDays(prev, 7))}
              aria-label="Semana anterior"
              className="w-8 h-8 rounded-full bg-surface-2 text-app-text hover:text-primary-bright transition-colors"
            >
              ‹
            </button>
            {isCurrentWeek && <span className="text-app-muted whitespace-nowrap px-1">Esta semana</span>}
            <button
              onClick={() => setWeekStart((prev) => addDays(prev, 7))}
              disabled={isCurrentWeek}
              aria-label="Próxima semana"
              className="w-8 h-8 rounded-full bg-surface-2 text-app-text hover:text-primary-bright transition-colors disabled:opacity-30 disabled:hover:text-app-text disabled:cursor-not-allowed"
            >
              ›
            </button>
          </nav>
        </div>
        <div className="tear-rule" aria-hidden="true">
          <i />
          <span />
          <i />
        </div>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <p className="text-sm text-app-muted">Não foi possível carregar a revisão da semana.</p>
          <button onClick={() => load()} className="font-mono text-xs px-4 py-2 rounded bg-primary text-app-bg font-semibold">
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className={loading ? 'flex flex-col gap-4 opacity-50 transition-opacity' : 'flex flex-col gap-4'}>
          <div className="grid grid-cols-1 md:grid-cols-[0.78fr_1fr] gap-4">
            <Card delay="0.02s">
              <div className="flex items-baseline justify-between gap-3 mb-[1.15rem]">
                <h2>
                  <Link to="/calendario" className="block-title-link accent-primary font-display text-[1.2rem] font-semibold">
                    Tarefas <span className="go-arrow">→ calendário</span>
                  </Link>
                </h2>
                <span className="font-mono text-[0.62rem] font-semibold tracking-[0.14em] uppercase text-app-muted-2">Semana</span>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-[1.1rem]">
                {taskStats.total === 0 ? (
                  <p className="text-sm text-app-muted">Nenhuma tarefa nesta semana.</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-display text-[3.3rem] font-semibold text-primary-bright leading-[0.9] -tracking-[0.02em]">
                        {taskStats.completed}
                      </span>
                      <span className="font-mono text-sm text-app-muted">
                        de <b className="font-medium text-app-muted">{taskStats.total}</b> tarefas
                      </span>
                    </div>
                    <div
                      className="flex flex-wrap gap-[7px]"
                      role="img"
                      aria-label={`${taskStats.completed} de ${taskStats.total} tarefas concluídas nesta semana`}
                    >
                      {Array.from({ length: taskMarkCount }, (_, i) => (
                        <span
                          key={i}
                          className={`tally-mark${taskGrouped ? ' grouped' : ''}${i < taskFilledCount ? ' filled' : ''}`}
                          style={{ animationDelay: `${0.5 + i * (taskGrouped ? 0.05 : 0.03)}s` }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-app-muted-2">
                      {taskGrouped ? 'concluídas nesta semana · cada marca ≈ 5 tarefas' : 'concluídas nesta semana'}
                    </p>
                  </>
                )}
              </div>
            </Card>

            <Card delay="0.09s">
              <div className="flex items-baseline justify-between gap-3 mb-[1.15rem]">
                <h2>
                  <Link to="/financas" className="block-title-link accent-success font-display text-[1.2rem] font-semibold">
                    Finanças <span className="go-arrow">→ ver tudo</span>
                  </Link>
                </h2>
                <div className="flex flex-col items-end gap-[0.3rem] shrink-0">
                  <span className="font-mono text-[0.62rem] font-semibold tracking-[0.14em] uppercase text-app-muted-2">
                    Saldo da semana
                  </span>
                  {financeDelta !== 0 && (
                    <span
                      className={`trend-chip ${financeDelta > 0 ? 'up' : 'down'}`}
                      title={`Semana de ${formatWeekLabel(prevWeekStart, prevWeekEnd)}: saldo de ${formatCurrency(prevNet)}`}
                    >
                      <span className="arrow">{financeDelta > 0 ? '▲' : '▼'}</span> {formatCurrency(Math.abs(financeDelta))} · semana
                      passada
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-2 py-[0.42rem] text-[0.85rem]">
                <span className="text-app-muted whitespace-nowrap">Entradas</span>
                <span className="ledger-leader" />
                <span className="tabular-nums font-medium whitespace-nowrap">{formatCurrency(income)}</span>
              </div>
              <div className="flex items-baseline gap-2 py-[0.42rem] text-[0.85rem]">
                <span className="text-app-muted whitespace-nowrap">Gastos</span>
                <span className="ledger-leader" />
                <span className="tabular-nums font-medium whitespace-nowrap">{formatCurrency(expense)}</span>
              </div>

              {financeTotal > 0 && (
                <div
                  className="flex h-[5px] rounded-full overflow-hidden bg-surface-2 my-[0.85rem]"
                  role="img"
                  aria-label={`Proporção entre entradas e gastos: ${Math.round(incomePct)}% entradas, ${Math.round(expensePct)}% gastos`}
                >
                  <span className="h-full bg-success" style={{ width: `${incomePct}%` }} />
                  <span className="h-full bg-danger" style={{ width: `${expensePct}%` }} />
                </div>
              )}

              <hr className="border-0 border-t border-surface-border mt-[0.15rem] mb-[0.35rem]" />

              <div className="flex items-baseline gap-2 py-[0.42rem] text-[0.85rem]">
                <span className="text-app-text font-medium whitespace-nowrap">Lucro / perda</span>
                <span className="ledger-leader" />
                <span className={`font-display text-xl font-semibold whitespace-nowrap ${net >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(net)}
                </span>
              </div>
              <div className="flex items-baseline gap-2 py-[0.42rem] text-[0.85rem]">
                <span className="text-app-muted whitespace-nowrap">Investido</span>
                <span className="ledger-leader" />
                <span className="tabular-nums whitespace-nowrap">{formatCurrency(invested)}</span>
              </div>
            </Card>
          </div>

          <Card delay="0.16s">
            <div className="flex items-baseline justify-between gap-3 mb-[1.15rem]">
              <h2>
                <Link to="/calendario" className="block-title-link accent-special font-display text-[1.2rem] font-semibold">
                  Hábitos <span className="go-arrow">→ calendário</span>
                </Link>
              </h2>
              <span className="font-mono text-[0.62rem] font-semibold tracking-[0.14em] uppercase text-app-muted-2 shrink-0">Dom → Sáb</span>
            </div>

            {habitStats.length === 0 ? (
              <p className="text-sm text-app-muted">Nenhum hábito criado ainda</p>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="habit-matrix w-full border-collapse min-w-[420px]">
                  <thead>
                    <tr>
                      <th scope="col" />
                      {WEEKDAY_LABELS.map((label, i) => (
                        <th
                          key={i}
                          scope="col"
                          className="font-mono text-[0.62rem] font-semibold tracking-[0.06em] text-app-muted-2 uppercase pb-[0.6rem] text-center w-[34px]"
                        >
                          {label}
                        </th>
                      ))}
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {habitStats.map((h) => (
                      <tr key={h.habitId}>
                        <th scope="row" className="text-left font-mono font-normal text-[0.83rem] text-app-text py-[0.55rem] pr-3 whitespace-nowrap">
                          {h.name}
                        </th>
                        {h.days.map((done, i) => (
                          <td key={i} className="text-center py-[0.4rem]">
                            <span className={`day-mark${done ? ' done' : ''}`} title={`${WEEKDAY_FULL[i]} — ${done ? 'feito' : 'não feito'}`} />
                          </td>
                        ))}
                        <td className="font-mono text-[0.68rem] text-app-muted text-right pl-3 whitespace-nowrap">
                          <b className="font-medium">{h.done}</b>/{h.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
