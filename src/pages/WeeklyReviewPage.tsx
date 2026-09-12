import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { RevealOnMount } from '../components/common/RevealOnMount';
import { useToast } from '../contexts/ToastContext';
import type { Habit, HabitLog, RecurringTask, RecurringTaskLog, Task } from '../types';
import { getWeekRange, getSevenDaysFrom, toISODate, WEEKDAY_LABELS } from '../features/calendar/dateUtils';
import { getTasksForRange } from '../features/tasks/tasksApi';
import { getRecurringTasks, getRecurringLogsForRange } from '../features/tasks/recurringTasksApi';
import { getHabits, getHabitLogsForRange } from '../features/habits/habitsApi';
import { calculateMonthSummary } from '../features/finance/financeApi';
import { calculateTaskStats, calculateHabitStats } from '../features/weeklyReview/weeklyReviewStats';
import { formatCurrency } from '../lib/currency';
import { useFinanceData } from '../contexts/FinanceDataContext';

const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function formatWeekLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => format(d, 'd MMM', { locale: ptBR }).toLowerCase().replace('.', '');
  return `${fmt(start)} – ${fmt(end)}`;
}

export function WeeklyReviewPage() {
  const { showError } = useToast();
  const { accounts, transactions } = useFinanceData();
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
      const [t, rt, rl, h, hl] = await Promise.all([
        getTasksForRange(startISO, endISO),
        getRecurringTasks(),
        getRecurringLogsForRange(startISO, endISO),
        getHabits(),
        getHabitLogsForRange(startISO, endISO),
      ]);
      if (gen !== loadGenRef.current) return;
      setTasks(t);
      setRecurringTasks(rt);
      setRecurringLogs(rl);
      setHabits(h);
      setHabitLogs(hl);
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
  const { income, expense } = calculateMonthSummary(transactions, startISO, endISO, accounts);

  const { income: prevIncome, expense: prevExpense } = calculateMonthSummary(transactions, prevStartISO, prevEndISO, accounts);
  const net = income - expense;
  const prevNet = prevIncome - prevExpense;
  const financeDelta = net - prevNet;

  const financeTotal = income + expense;
  const incomePct = financeTotal > 0 ? (income / financeTotal) * 100 : 50;

  const taskPct = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;

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
        <button onClick={() => load()} className="btn primary">
          Tentar de novo
        </button>
      </div>
    );
  }

  // From here on the page has loaded at least once: the header (title + week nav)
  // stays mounted at all times, even while a subsequent week's data is being fetched
  // or fails to load.
  return (
    <RevealOnMount className="rev p-4 md:p-6 max-w-[860px] mx-auto flex flex-col">
      <Link to="/" className="reveal-in back inline-block mb-3 text-xs text-app-muted-2 font-medium hover:text-primary-bright transition-colors w-fit">
        ‹ Hoje
      </Link>
      <div className="rev-head reveal-in mb-4">
        <div className="e">Revisão semanal</div>
        <div className="t">{formatWeekLabel(weekStart, weekEnd)}</div>
        <div className="nav">
          <button onClick={() => setWeekStart((prev) => subDays(prev, 7))} aria-label="Semana anterior" className="ib">
            ‹
          </button>
          {isCurrentWeek && <span>esta semana</span>}
          <button
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            disabled={isCurrentWeek}
            aria-label="Próxima semana"
            className="ib disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <p className="text-sm text-app-muted">Não foi possível carregar a revisão da semana.</p>
          <button onClick={() => load()} className="btn primary">
            Tentar de novo
          </button>
        </div>
      ) : (
        <div className={loading ? 'flex flex-col gap-4 opacity-50 transition-opacity' : 'flex flex-col gap-4'}>
          <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1fr] gap-4">
            <Card className="reveal-in" padding="p-5 md:p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-base font-semibold">Tarefas</h3>
                <Link to="/calendario" className="text-xs text-app-muted-2 hover:text-primary-bright transition-colors">
                  calendário
                </Link>
              </div>

              {taskStats.total === 0 ? (
                <p className="text-sm text-app-muted">Nenhuma tarefa nesta semana.</p>
              ) : (
                <>
                  <div className="rev-big">
                    {taskStats.completed}
                    <span className="of">de {taskStats.total}</span>
                  </div>
                  <div className="track mt-3">
                    <i className="bar-fill" style={{ width: `${taskPct}%` }} />
                  </div>
                  <p className="rev-cap">concluídas nesta semana</p>
                </>
              )}
            </Card>

            <Card className="reveal-in" padding="p-5 md:p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-base font-semibold">Finanças</h3>
                <Link to="/financas" className="text-xs text-app-muted-2 hover:text-primary-bright transition-colors">
                  ver tudo
                </Link>
              </div>

              <div className="sline">
                <span className="n">Entradas</span>
                <span className="d" />
                <span className="v">{formatCurrency(income)}</span>
              </div>
              <div className="sline">
                <span className="n">Gastos</span>
                <span className="d" />
                <span className="v">{formatCurrency(expense)}</span>
              </div>

              {financeTotal > 0 && (
                <div className="stacked">
                  <i className="bar-fill" style={{ width: `${incomePct}%`, background: 'var(--color-success)' }} />
                  <i className="bar-fill" style={{ width: `${100 - incomePct}%`, background: 'var(--color-danger)' }} />
                </div>
              )}

              <hr className="rule" />

              <div className="sline">
                <span className="n text-app-text">Lucro</span>
                <span className="d" />
                <span className={`v big ${net >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(net)}</span>
              </div>

              {financeDelta !== 0 && (
                <p className="trend">
                  {formatCurrency(Math.abs(financeDelta))}{' '}
                  <b className={financeDelta > 0 ? 'pos' : 'neg'}>{financeDelta > 0 ? 'acima' : 'abaixo'}</b> da semana passada
                </p>
              )}
            </Card>
          </div>

          <Card className="reveal-in" padding="p-5 md:p-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-base font-semibold">Hábitos</h3>
              <Link to="/calendario" className="text-xs text-app-muted-2 hover:text-primary-bright transition-colors">
                calendário
              </Link>
            </div>

            {habitStats.length === 0 ? (
              <p className="text-sm text-app-muted">Nenhum hábito criado ainda</p>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="mx min-w-[420px]">
                  <thead>
                    <tr>
                      <th className="rh" />
                      {WEEKDAY_LABELS.map((label, i) => (
                        <th key={i}>{label}</th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {habitStats.map((h) => (
                      <tr key={h.habitId}>
                        <td className="rh">{h.name}</td>
                        {h.days.map((done, i) => (
                          <td key={i}>
                            <span className={`mk${done ? ' done' : ''}`} title={`${WEEKDAY_FULL[i]} — ${done ? 'feito' : 'não feito'}`} />
                          </td>
                        ))}
                        <td className="ct">
                          {h.done}/{h.total}
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
    </RevealOnMount>
  );
}
