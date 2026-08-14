# Revisão Semanal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Revisão semanal" page, reachable from a link on the Dashboard, that shows how the current (or a past) week went across Tarefas, Hábitos, and Finanças, computed on demand with no persistence.

**Architecture:** No schema changes — every number is derived from data that already exists (`tasks`, `recurring_tasks`, `recurring_task_logs`, `habits`, `habit_logs`, `transactions`, `accounts`). Three small range-fetch functions are added to the existing `tasksApi`/`recurringTasksApi`/`habitsApi`/`financeApi` files (mirroring the existing `getTasksForRange` pattern), a `getWeekRange`/`getWeekDates` pair is added to `dateUtils.ts`, a new pure-function module aggregates tasks/habits into weekly counts, and a new page wires it all together with week navigation. Existing `calculateMonthSummary` is reused as-is for the finance numbers (it already takes generic `start`/`end` strings).

**Tech Stack:** React 19 + TypeScript + Vite, React Router, Supabase (Postgres + RLS + supabase-js), date-fns.

**Spec:** `docs/superpowers/specs/2026-08-14-revisao-semanal-design.md` — implement exactly what it describes. Do not add the monthly-limit comparison, scheduled/background generation, a persisted note, or future-week navigation — all explicitly out of scope per the spec.

## Global Constraints

- All app code changes happen in a worktree at `.claude/worktrees/organizador-pessoal/`, tracking a feature branch off `main` (create/switch per `superpowers:using-git-worktrees` if not already set up) — **not** the `master` checkout at the repo root.
- No automated test suite in this project — verification is `npx tsc -b` per task, plus `npm run build` and a manual dev-server/browser walkthrough on the final task.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` enabled.
- Supabase project id: `bjbszgblaqtcbvihgxqu`. No migration in this plan — no schema/RLS change of any kind.
- UI copy is Portuguese (pt-BR), matching the rest of the app.
- Week convention is domingo→sábado (`weekStartsOn: 0`), same as `MonthGrid`. The week label is formatted `d MMM` per side (locale `ptBR`, lowercase, no trailing dot), same style as `src/lib/relativeDate.ts`.
- The "next week" navigation button is disabled once the visible week is the one containing today — no future weeks.
- The finance block shows receita, despesa, saldo, and investido only — no comparison against monthly category limits (cut from scope, see spec's "Cortando do escopo").

---

### Task 1: Data layer — range-fetch functions and week utilities

**Files:**
- Modify: `src/features/tasks/recurringTasksApi.ts`
- Modify: `src/features/habits/habitsApi.ts`
- Modify: `src/features/finance/financeApi.ts`
- Modify: `src/features/calendar/dateUtils.ts`

**Interfaces:**
- Consumes: `supabase` client, `RecurringTaskLog`, `HabitLog`, `Transaction` types (all unchanged); `date-fns`'s `startOfWeek`/`endOfWeek`/`addDays` (already imported in `dateUtils.ts`, no new imports needed there).
- Produces (all consumed by Task 2 and Task 3):
  - `getRecurringLogsForRange(startDate: string, endDate: string): Promise<RecurringTaskLog[]>`
  - `getHabitLogsForRange(startDate: string, endDate: string): Promise<HabitLog[]>`
  - `getTransactionsForRange(startDate: string, endDate: string): Promise<Transaction[]>`
  - `getWeekRange(date: Date): { start: Date; end: Date }`
  - `getWeekDates(start: Date): string[]` — 7 ISO (`yyyy-MM-dd`) date strings starting at `start`

- [ ] **Step 1: Add `getRecurringLogsForRange`**

In `src/features/tasks/recurringTasksApi.ts`, find:

```typescript
export async function getRecurringLogsForDate(date: string): Promise<RecurringTaskLog[]> {
  const { data, error } = await supabase.from('recurring_task_logs').select('*').eq('date', date);
  if (error) throw error;
  return data;
}
```

Add this function immediately after it:

```typescript

export async function getRecurringLogsForRange(startDate: string, endDate: string): Promise<RecurringTaskLog[]> {
  const { data, error } = await supabase
    .from('recurring_task_logs')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Add `getHabitLogsForRange`**

In `src/features/habits/habitsApi.ts`, find:

```typescript
export async function getHabitLogsForDate(date: string): Promise<HabitLog[]> {
  const { data, error } = await supabase.from('habit_logs').select('*').eq('date', date);
  if (error) throw error;
  return data;
}
```

Add this function immediately after it:

```typescript

export async function getHabitLogsForRange(startDate: string, endDate: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;
  return data;
}
```

- [ ] **Step 3: Add `getTransactionsForRange`**

In `src/features/finance/financeApi.ts`, find:

```typescript
export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
```

Add this function immediately after it:

```typescript

export async function getTransactionsForRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Add `getWeekRange` and `getWeekDates`**

In `src/features/calendar/dateUtils.ts`, find:

```typescript
export function getMonthGrid(year: number, month: number): Date[] {
  const first = startOfMonth(new Date(year, month, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 0 });
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}
```

Add these two functions immediately after it:

```typescript

export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  };
}

export function getWeekDates(start: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/recurringTasksApi.ts src/features/habits/habitsApi.ts src/features/finance/financeApi.ts src/features/calendar/dateUtils.ts
git commit -m "feat: add weekly range-fetch functions and week-range date utilities"
```

---

### Task 2: Weekly aggregation module

**Files:**
- Create: `src/features/weeklyReview/weeklyReviewStats.ts`

**Interfaces:**
- Consumes: `Task`, `RecurringTask`, `RecurringTaskLog`, `Habit`, `HabitLog` types (unchanged); `getWeekday` from `src/features/calendar/dateUtils.ts` (unchanged, already exists).
- Produces (consumed by Task 3):
  - `calculateTaskStats(tasks: Task[], recurringTasks: RecurringTask[], recurringLogs: RecurringTaskLog[], weekDates: string[]): { completed: number; total: number }`
  - `calculateHabitStats(habits: Habit[], habitLogs: HabitLog[], weekDates: string[]): { habitId: string; name: string; done: number; total: number }[]`

- [ ] **Step 1: Write `weeklyReviewStats.ts`**

```typescript
import type { Habit, HabitLog, RecurringTask, RecurringTaskLog, Task } from '../../types';
import { getWeekday } from '../calendar/dateUtils';

export function calculateTaskStats(
  tasks: Task[],
  recurringTasks: RecurringTask[],
  recurringLogs: RecurringTaskLog[],
  weekDates: string[],
): { completed: number; total: number } {
  let completed = tasks.filter((t) => t.done).length;
  let total = tasks.length;

  for (const date of weekDates) {
    const weekday = getWeekday(date);
    for (const rt of recurringTasks) {
      if (!rt.weekdays.includes(weekday)) continue;
      const log = recurringLogs.find((l) => l.recurring_task_id === rt.id && l.date === date);
      if (log?.skipped) continue;
      total += 1;
      if (log?.done) completed += 1;
    }
  }

  return { completed, total };
}

export function calculateHabitStats(
  habits: Habit[],
  habitLogs: HabitLog[],
  weekDates: string[],
): { habitId: string; name: string; done: number; total: number }[] {
  return habits.map((habit) => ({
    habitId: habit.id,
    name: habit.name,
    done: habitLogs.filter((l) => l.habit_id === habit.id && l.done && weekDates.includes(l.date)).length,
    total: weekDates.length,
  }));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/weeklyReview/weeklyReviewStats.ts
git commit -m "feat: add weekly task and habit stats aggregation"
```

---

### Task 3: `WeeklyReviewPage` component

**Files:**
- Create: `src/pages/WeeklyReviewPage.tsx`

**Interfaces:**
- Consumes: `Card` (`src/components/common/Card.tsx`), `Spinner` (`src/components/common/Spinner.tsx`), `useToast` (`src/contexts/ToastContext.tsx`), `formatCurrency` (`src/lib/currency.ts`), `getWeekRange`/`getWeekDates`/`toISODate` (Task 1), `getTasksForRange` (existing, `src/features/tasks/tasksApi.ts`), `getRecurringTasks`/`getRecurringLogsForRange` (Task 1 + existing, `recurringTasksApi.ts`), `getHabits`/`getHabitLogsForRange` (Task 1 + existing, `habitsApi.ts`), `getAccounts`/`getTransactionsForRange`/`calculateMonthSummary` (Task 1 + existing, `financeApi.ts`), `calculateTaskStats`/`calculateHabitStats` (Task 2).
- Produces: `WeeklyReviewPage` component (no props). Not reachable from any route yet — wired into `App.tsx` and linked from `DashboardPage.tsx` in Task 4.

- [ ] **Step 1: Write `WeeklyReviewPage.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Habit, HabitLog, RecurringTask, RecurringTaskLog, Task, Transaction } from '../types';
import { getWeekRange, getWeekDates, toISODate } from '../features/calendar/dateUtils';
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
  const weekDates = getWeekDates(weekStart);
  const isCurrentWeek = startISO === toISODate(getWeekRange(new Date()).start);

  const load = useCallback(async () => {
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
      setTasks(t);
      setRecurringTasks(rt);
      setRecurringLogs(rl);
      setHabits(h);
      setHabitLogs(hl);
      setTransactions(tx);
      setAccounts(accs);
    } catch {
      showError('Não foi possível carregar a revisão da semana.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [startISO, endISO, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const taskStats = calculateTaskStats(tasks, recurringTasks, recurringLogs, weekDates);
  const habitStats = calculateHabitStats(habits, habitLogs, weekDates);
  const { income, expense, invested } = calculateMonthSummary(transactions, startISO, endISO, accounts);

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center gap-3 min-h-[50vh]">
        <p className="text-sm text-app-muted">Não foi possível carregar a revisão da semana.</p>
        <button onClick={() => load()} className="font-mono text-xs px-4 py-2 rounded bg-primary text-app-bg font-semibold">
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-semibold">Revisão semanal</h1>
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setWeekStart((prev) => subDays(prev, 7))}
            className="px-3 py-1.5 rounded-full bg-surface-2 text-app-text hover:text-primary-bright transition-colors"
          >
            ‹
          </button>
          <span className="text-app-muted whitespace-nowrap">{formatWeekLabel(weekStart, weekEnd)}</span>
          <button
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            disabled={isCurrentWeek}
            className="px-3 py-1.5 rounded-full bg-surface-2 text-app-text hover:text-primary-bright transition-colors disabled:opacity-30 disabled:hover:text-app-text disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>

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
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/WeeklyReviewPage.tsx
git commit -m "feat: add WeeklyReviewPage component"
```

---

### Task 4: Wire the route and the Dashboard entry link

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `WeeklyReviewPage` (Task 3).
- Produces: `/revisao-semanal` reachable both by direct URL and via a link on the Dashboard. No prop-shape changes to any other component.

- [ ] **Step 1: Add the route in `App.tsx`**

Find:

```tsx
import { FinancePage } from './pages/FinancePage';
```

Change to:

```tsx
import { FinancePage } from './pages/FinancePage';
import { WeeklyReviewPage } from './pages/WeeklyReviewPage';
```

Find:

```tsx
                <Route path="/financas" element={<FinancePage />} />
```

Change to:

```tsx
                <Route path="/financas" element={<FinancePage />} />
                <Route path="/revisao-semanal" element={<WeeklyReviewPage />} />
```

- [ ] **Step 2: Add the Dashboard link**

In `src/pages/DashboardPage.tsx`, find:

```tsx
import { useState } from 'react';
import { DayHeader } from '../features/dashboard/DayHeader';
```

Change to:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DayHeader } from '../features/dashboard/DayHeader';
```

Find:

```tsx
        <DayHeader taskCount={taskCount} habitDone={habitCounts.done} habitTotal={habitCounts.total} />

        <div className="flex flex-col gap-5">
```

Change to:

```tsx
        <DayHeader taskCount={taskCount} habitDone={habitCounts.done} habitTotal={habitCounts.total} />

        <Link
          to="/revisao-semanal"
          className="font-mono text-xs text-app-muted hover:text-primary-bright transition-colors mb-5 inline-block"
        >
          Ver revisão da semana →
        </Link>

        <div className="flex flex-col gap-5">
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/pages/DashboardPage.tsx
git commit -m "feat: wire Revisão semanal route and Dashboard entry link"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full type-check and build**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces `dist/`.

- [ ] **Step 2: Browser walkthrough with a disposable account**

Per this project's data-safety convention, create a disposable test account (real-looking email domain — `@example.com` is rejected by this Supabase project's auth; confirm via SQL with `update auth.users set email_confirmed_at = now() where email = '<test-email>'` if normal signup email-sending is unavailable, a known intermittent issue on this project). Then, in the browser:

1. Log in, create the first account via the bootstrap modal (e.g. "Conta A", saldo inicial `500`).
2. On the Dashboard, click "Ver revisão da semana →".
   Expected: navigates to `/revisao-semanal`, shows the current week's date range (Sunday–Saturday), with 0/0 tarefas, no hábitos, and R$ 0,00 everywhere (fresh account).
3. Go back to the Dashboard: create one task for today, one task for two days from now (mark the today one as done), one habit (mark it done today), and one transaction (an expense of `50` today).
   Return to "Revisão semanal".
   Expected: Tarefas shows "1 de 2 concluídas"; Hábitos shows the habit at "1/7"; Finanças shows Gastos `R$ 50,00`, Saldo `-R$ 50,00`.
4. In Calendário, create a recurring task covering today's weekday, and toggle it done for today.
   Return to "Revisão semanal" (reload if needed to force a refetch).
   Expected: Tarefas total increases by 1 and completed increases by 1 (now "2 de 3 concluídas" carried over from step 3's numbers, adjusted for the new recurring occurrence).
5. In Calendário, mark a different day this week for the same recurring task as "pular" (skip), if that day is in the current week.
   Return to "Revisão semanal".
   Expected: the skipped occurrence does not change either the completed or total count.
6. Click "‹" to go to the previous week.
   Expected: the date range updates to the prior Sunday–Saturday, numbers reset to reflect that week's (empty) data, and "›" becomes enabled.
7. Click "›" repeatedly back to the current week.
   Expected: "›" becomes disabled again once back on the current week, and the numbers match step 5's state.
8. Create a transaction dated in the previous week (e.g. 8 days ago) with amount `20`, income.
   Navigate "‹" to that week.
   Expected: Finanças shows Entradas `R$ 20,00` for that week, and the current week's Finanças (checked by navigating back with "›") is unaffected.
9. Look at a calendar to find a Sunday–Saturday week that spans two different months (this happens most months — any week whose Sunday and Saturday fall on either side of a month boundary; navigate "‹"/"›" until the displayed date range shows two different month abbreviations). Create one transaction dated on the last day of the earlier month and one dated on the first day of the later month, both within that displayed week, then reload the page on that week.
   Expected: Finanças sums both transactions correctly (e.g. two expenses of `10` each show as Gastos `R$ 20,00`), confirming the range query isn't accidentally clipped at a month boundary.
10. Delete the disposable test account and all its rows from Supabase (accounts, categories, transactions, category_limits, tasks, recurring_tasks, recurring_task_logs, habits, habit_logs, `auth.identities`, `auth.users`) once verification is done, and verify the counts are `0` afterward.

- [ ] **Step 3: Report completion**

Summarize to Arthur: what was built (`/revisao-semanal` page + Dashboard link), that it's on the same feature branch as the rest of the app, and that no database migration was needed.
