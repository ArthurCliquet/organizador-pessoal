# Calendário — Evento especial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a task be marked "evento especial" (a checkbox at creation or edit time), shown as a purple dot in the month calendar and in the Dashboard's 3-day strip, and as a purple indicator in the day's task lists.

**Architecture:** One new `tasks` column (`is_special_event boolean`) carries the flag. `tasksApi.ts` passes it through create/update. Four presentation components read it: `DayPanel` (creation checkbox, edit checkbox, list indicator), `MonthGrid` and `MiniStrip` (purple dot alongside the existing blue dot, shown independently so a day can show one, the other, or both), and `TodayAgenda` (list indicator, same treatment as `DayPanel`). A new `--color-special` design token supplies the purple.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + supabase-js), Tailwind CSS v4 (`@theme` tokens), date-fns.

**Spec:** `docs/superpowers/specs/2026-08-14-calendario-evento-especial-design.md` — implement exactly what it describes. Do not build a separate "event" entity, event recurrence, a customizable color, or notifications/reminders.

## Global Constraints

- All app code changes happen in the `main`-tracking worktree at `.claude/worktrees/organizador-pessoal` (branch `worktree-organizador-pessoal`) — **not** the `master` checkout at the repo root, where this plan file itself lives.
- No automated test suite in this project — verification is `npx tsc -b` per task, plus a manual dev-server/browser walkthrough on the final task.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` enabled.
- Supabase project id: `bjbszgblaqtcbvihgxqu`. Last applied migration is `20260809174827_finance_investments` (local file `0009_finance_investments.sql`); this plan adds `0010`.
- This project holds Arthur's real personal data. The only schema change here is an additive, defaulted column (`is_special_event boolean not null default false`) — no existing constraint or column is touched. Manual verification (Task 7) uses Arthur's real logged-in account directly (no disposable signup needed, unlike prior finance-feature plans), creating a couple of test tasks and deleting them afterward.
- UI copy is Portuguese (pt-BR), matching the rest of the app.
- Purple is fixed (`--color-special`), not user-customizable, matching the existing single-fixed-dark-theme design system.

---

### Task 1: Database schema — `tasks.is_special_event`

**Files:**
- Create: `supabase/migrations/0010_tasks_special_event.sql`

**Interfaces:**
- Produces: `tasks.is_special_event boolean not null default false`. Consumed by Task 2's data layer and types.

- [ ] **Step 1: Write the migration file**

```sql
alter table tasks add column is_special_event boolean not null default false;
```

- [ ] **Step 2: Apply the migration to the Supabase project**

Use the `mcp__supabase__apply_migration` tool with `project_id: "bjbszgblaqtcbvihgxqu"`, `name: "tasks_special_event"`, and `query` set to the exact SQL from Step 1.

- [ ] **Step 3: Verify**

Use `mcp__supabase__list_tables` with `project_id: "bjbszgblaqtcbvihgxqu"`.
Expected: `tasks` has a new column `is_special_event` (boolean, not null, default `false`).

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new warnings referencing `tasks`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0010_tasks_special_event.sql
git commit -m "feat: add is_special_event column to tasks"
```

---

### Task 2: Types, data layer, and design token

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/features/tasks/tasksApi.ts`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `tasks.is_special_event` (Task 1).
- Produces:
  - `Task.is_special_event: boolean` (new field).
  - `createTask(date: string, title: string, time: string | null, isSpecialEvent?: boolean): Promise<Task>` — new 4th parameter, defaults to `false`.
  - `updateTask(id: string, fields: Partial<Pick<Task, 'title' | 'time' | 'date' | 'is_special_event'>>): Promise<void>` — `fields` type grows to allow `is_special_event`.
  - CSS custom property `--color-special` and the Tailwind utilities it generates (`bg-special`, `text-special`, `accent-special`, etc.), same mechanism as the existing `--color-primary` → `bg-primary`/`text-primary`/`accent-primary`.
  All consumed by Tasks 3-6.

- [ ] **Step 1: Update `src/types/index.ts`**

Change:

```typescript
export interface Task {
  id: string;
  user_id: string;
  date: string | null;
  time: string | null;
  title: string;
  done: boolean;
  created_at: string;
}
```

to:

```typescript
export interface Task {
  id: string;
  user_id: string;
  date: string | null;
  time: string | null;
  title: string;
  done: boolean;
  is_special_event: boolean;
  created_at: string;
}
```

- [ ] **Step 2: Update `src/features/tasks/tasksApi.ts`**

Change:

```typescript
export async function createTask(date: string, title: string, time: string | null): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('tasks').insert({ date, title, time, user_id: userData.user!.id }).select().single();
  if (error) throw error;
  return data;
}
```

to:

```typescript
export async function createTask(date: string, title: string, time: string | null, isSpecialEvent = false): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ date, title, time, is_special_event: isSpecialEvent, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

Change:

```typescript
export async function updateTask(id: string, fields: Partial<Pick<Task, 'title' | 'time' | 'date'>>): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}
```

to:

```typescript
export async function updateTask(id: string, fields: Partial<Pick<Task, 'title' | 'time' | 'date' | 'is_special_event'>>): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: Add the `--color-special` token to `src/index.css`**

In the `@theme` block, change:

```css
  --color-danger: #d98a86;
  --color-app-text: #eef2f9;
```

to:

```css
  --color-danger: #d98a86;
  --color-special: #b79ef0;
  --color-app-text: #eef2f9;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors. (Existing callers of `createTask` pass only 3 arguments, which still compiles since the new parameter is optional; existing callers of `updateTask` pass a subset of the allowed keys, which still compiles since `Partial<Pick<...>>` only grew the allowed key set.)

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/features/tasks/tasksApi.ts src/index.css
git commit -m "feat: add is_special_event to Task type, tasksApi, and special color token"
```

---

### Task 3: `DayPanel` — create, edit, and display the special-event flag

**Files:**
- Modify: `src/features/calendar/DayPanel.tsx`

**Interfaces:**
- Consumes: `createTask(date, title, time, isSpecialEvent)`, `updateTask(id, fields)` (Task 2); `bg-special`/`text-special`/`accent-special` (Task 2).
- Produces: no external interface change — `DayPanel`'s own props (`date`, `onTasksChanged`, `refreshToken`) are unchanged, so `CalendarPage.tsx` needs no edits.

- [ ] **Step 1: Replace the entire contents of `DayPanel.tsx`**

```tsx
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
  const [isSpecialEvent, setIsSpecialEvent] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTime, setEditingTime] = useState('');
  const [editingSpecialEvent, setEditingSpecialEvent] = useState(false);

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
                  className="flex-1 flex items-center gap-1"
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
                    className="accent-special w-3.5 h-3.5 shrink-0"
                  />
                </div>
              ) : (
                <span
                  onDoubleClick={() => item.kind === 'task' && startEditing(item.task)}
                  className={`flex-1 text-sm ${item.done ? 'text-app-muted line-through' : 'text-app-text'}`}
                >
                  {item.kind === 'recurring' && <span title="Tarefa recorrente">↻ </span>}
                  {item.kind === 'task' && item.task.is_special_event && (
                    <span className="text-special" title="Evento especial">
                      ●{' '}
                    </span>
                  )}
                  {item.time ? <span className="font-mono text-app-muted-2">{item.time.slice(0, 5)} — </span> : ''}
                  {item.title}
                </span>
              )}
              {item.kind === 'task' && (
                <button onClick={() => handleDelete(item.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs px-1">
                  ✕
                </button>
              )}
              {item.kind === 'recurring' && (
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
          {dayItems.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa</p>}
        </div>
        <div className="flex flex-col gap-1">
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
          <label className="flex items-center gap-1.5 text-xs text-app-muted cursor-pointer">
            <input
              type="checkbox"
              checked={isSpecialEvent}
              onChange={(e) => setIsSpecialEvent(e.target.checked)}
              className="accent-special w-3.5 h-3.5"
            />
            Evento especial
          </label>
        </div>
      </div>

      <div>
        <h3 className="font-mono text-xs uppercase tracking-wider text-app-muted-2 mb-2 font-semibold">Hábitos</h3>
        <HabitChecklist date={date} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/calendar/DayPanel.tsx
git commit -m "feat: add special-event checkbox and indicator to DayPanel"
```

---

### Task 4: `MonthGrid` — dual dot (blue for tasks, purple for special events)

**Files:**
- Modify: `src/features/calendar/MonthGrid.tsx`

**Interfaces:**
- Consumes: `Task.is_special_event` (Task 2); `bg-special` (Task 2). Props (`year`, `month`, `tasksByDate`, `selectedDate`, `onSelectDay`, `onMonthChange`) unchanged — `CalendarPage.tsx` needs no edits.

- [ ] **Step 1: Replace the entire contents of `MonthGrid.tsx`**

```tsx
import { toISODate, getMonthGrid, formatMonthTitle } from './dateUtils';
import type { Task } from '../../types';

interface MonthGridProps {
  year: number;
  month: number;
  tasksByDate: Record<string, Task[]>;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function MonthGrid({ year, month, tasksByDate, selectedDate, onSelectDay, onMonthChange }: MonthGridProps) {
  const days = getMonthGrid(year, month);
  const today = toISODate(new Date());

  function prevMonth() {
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  }
  function nextMonth() {
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="font-mono text-app-muted hover:text-app-text px-2">
          ‹
        </button>
        <h2 className="font-display text-xl text-app-text capitalize">{formatMonthTitle(year, month)}</h2>
        <button onClick={nextMonth} className="font-mono text-app-muted hover:text-app-text px-2">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-surface-border border border-surface-border rounded overflow-hidden">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-app-bg text-center font-mono text-[0.65rem] tracking-wider uppercase text-app-muted-2 py-2">
            {w}
          </div>
        ))}
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === month;
          const dayTasks = tasksByDate[iso] ?? [];
          const hasRegularTask = dayTasks.some((t) => !t.is_special_event);
          const hasSpecialEvent = dayTasks.some((t) => t.is_special_event);
          const isToday = iso === today;
          const isSelected = iso === selectedDate;
          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              className={`min-h-16 bg-surface hover:bg-surface-2 flex flex-col items-start p-1.5 gap-1 relative ${
                inMonth ? 'text-app-text' : 'text-app-muted-2 bg-app-bg'
              } ${isSelected ? 'shadow-[inset_0_0_0_1.5px_var(--color-success)]' : isToday ? 'shadow-[inset_0_0_0_1.5px_var(--color-primary)]' : ''}`}
            >
              <span className={`text-sm ${isToday ? 'text-primary font-bold' : ''}`}>{day.getDate()}</span>
              {(hasRegularTask || hasSpecialEvent) && (
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5">
                  {hasRegularTask && <span className="w-1 h-1 rounded-full bg-primary inline-block" />}
                  {hasSpecialEvent && <span className="w-1 h-1 rounded-full bg-special inline-block" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/calendar/MonthGrid.tsx
git commit -m "feat: show purple dot for special events in MonthGrid"
```

---

### Task 5: `MiniStrip` — dual dot on the Dashboard's 3-day strip

**Files:**
- Modify: `src/features/dashboard/MiniStrip.tsx`

**Interfaces:**
- Consumes: `Task.is_special_event` (Task 2); `bg-special` (Task 2); `getTasksForRange` (`src/features/tasks/tasksApi.ts`, existing — already returns full `Task` rows, so `is_special_event` comes through with no signature change). Component has no props and is rendered with none — no callers need edits.

- [ ] **Step 1: Replace the entire contents of `MiniStrip.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import { getTasksForRange } from '../tasks/tasksApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface MiniDay {
  date: Date;
  iso: string;
  hasRegular: boolean;
  hasSpecial: boolean;
}

function formatWeekdayAbbrev(date: Date): string {
  const raw = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace(/\.$/, '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function MiniStrip() {
  const { showError } = useToast();
  const [days, setDays] = useState<MiniDay[]>([]);

  useEffect(() => {
    const rangeDates = [1, 2, 3].map((n) => addDays(new Date(), n));
    const rangeDays = rangeDates.map((d) => toISODate(d));
    const start = rangeDays[0];
    const end = rangeDays[rangeDays.length - 1];
    getTasksForRange(start, end)
      .then((tasks) => {
        const hasRegularByDate: Record<string, boolean> = {};
        const hasSpecialByDate: Record<string, boolean> = {};
        for (const task of tasks) {
          if (!task.date) continue;
          if (task.is_special_event) hasSpecialByDate[task.date] = true;
          else hasRegularByDate[task.date] = true;
        }
        setDays(
          rangeDates.map((date, i) => ({
            date,
            iso: rangeDays[i],
            hasRegular: !!hasRegularByDate[rangeDays[i]],
            hasSpecial: !!hasSpecialByDate[rangeDays[i]],
          }))
        );
      })
      .catch(() => showError('Não foi possível carregar os próximos dias.'));
  }, [showError]);

  return (
    <div className="flex gap-2.5">
      {days.map((day) => (
        <Link
          key={day.iso}
          to="/calendario"
          className="flex-1 bg-white/[0.015] border border-surface-border rounded-[11px] py-2.5 px-1.5 text-center transition-[transform,border-color] duration-150 hover:border-glow-border hover:-translate-y-0.5 block"
        >
          <div className="font-mono text-[0.6rem] uppercase tracking-wider text-app-muted-2">
            {formatWeekdayAbbrev(day.date)}
          </div>
          <div className="font-display text-xl font-semibold mt-0.5">{day.date.getDate()}</div>
          <div className="h-1.5 flex items-center justify-center gap-1 mt-1.5">
            {day.hasRegular && <span className="w-[5px] h-[5px] rounded-full bg-primary inline-block" />}
            {day.hasSpecial && <span className="w-[5px] h-[5px] rounded-full bg-special inline-block" />}
            {!day.hasRegular && !day.hasSpecial && <span className="font-mono text-[0.55rem] text-app-muted-2">livre</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/MiniStrip.tsx
git commit -m "feat: show purple dot for special events in dashboard MiniStrip"
```

---

### Task 6: `TodayAgenda` — special-event indicator on the Dashboard's "Agenda de hoje"

**Files:**
- Modify: `src/features/dashboard/TodayAgenda.tsx`

**Interfaces:**
- Consumes: `Task.is_special_event` (Task 2); `text-special` (Task 2). Props (`onCountChange`) unchanged — `DashboardPage.tsx` needs no edits.

- [ ] **Step 1: Replace the entire contents of `TodayAgenda.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
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
  onCountChange?: (count: number) => void;
}

export function TodayAgenda({ onCountChange }: TodayAgendaProps) {
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
  ].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));

  useEffect(() => {
    onCountChange?.(dayItems.length);
  }, [dayItems.length, onCountChange]);

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
      <div className="flex flex-col gap-0.5">
        {dayItems.map((item) => (
          <label
            key={`${item.kind}-${item.id}`}
            className="group grid grid-cols-[18px_52px_1fr_auto] items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] cursor-pointer transition-colors hover:bg-white/[0.025]"
          >
            <TaskCheck checked={item.done} onChange={() => handleToggle(item)} />
            <span className="font-mono text-xs text-app-muted-2">{item.time ? item.time.slice(0, 5) : 'sem hora'}</span>
            <span className={`text-sm ${item.done ? 'text-app-muted line-through' : 'text-app-text'}`}>
              {item.kind === 'recurring' && <span className="text-app-muted-2 mr-0.5" title="Tarefa recorrente">↻</span>}
              {item.kind === 'task' && item.isSpecialEvent && (
                <span className="text-special mr-0.5" title="Evento especial">
                  ●
                </span>
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/TodayAgenda.tsx
git commit -m "feat: show special-event indicator in dashboard TodayAgenda"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full type-check and build**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces `dist/`.

- [ ] **Step 2: Browser walkthrough with Arthur's real account**

Run `npm run dev`, log in normally (real account — this feature only adds/removes a couple of test tasks, no disposable signup needed). In the browser:

1. Go to Calendário, select a day 2 days from today (inside the Dashboard's 3-day-strip window). In the day's "Nova tarefa" field, type "Aniversário da Ana", check "Evento especial", create it.
   Expected: it appears in the day's task list with a purple `●` before the title. `MonthGrid` shows a single purple dot on that day (no blue dot, since this is the only task).
2. On the same day, create a second task "Reunião" without checking "Evento especial".
   Expected: `MonthGrid` now shows both a blue dot and a purple dot on that day. The task list shows "Reunião" with no purple marker, and "Aniversário da Ana" still with the purple marker.
3. Go to the Dashboard.
   Expected: the "Agenda de hoje" 3-day strip (`MiniStrip`) shows both a blue and a purple dot under that day's date (in place of "livre").
4. Back in Calendário, double-click "Reunião" to edit it, check "Evento especial", let it save (click elsewhere to blur).
   Expected: after reload of the day list, "Reunião" now also shows the purple `●`.
5. Create a task for today (no special-event flag) and a second one for today with "Evento especial" checked.
   Expected: on the Dashboard, "Agenda de hoje" (`TodayAgenda`) shows the special one with the purple `●` before its title, the other without.
6. Delete all test tasks created in steps 1, 2, and 5 (✕ button in the day list).
   Expected: `MonthGrid`, `MiniStrip`, and "Agenda de hoje" all return to their pre-test state (no stray dots or list rows).

- [ ] **Step 3: Confirm no RLS regressions**

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new warnings referencing `tasks`.

- [ ] **Step 4: Report completion**

Summarize to Arthur: what was built (special-event checkbox in the Calendário's day panel, purple dot in the month grid and the Dashboard's 3-day strip, purple indicator in both task lists), and that his existing tasks are unaffected (`is_special_event` defaults to `false` for all of them).
