# Revisão Semanal — redesign visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three uniform stacked cards on `/revisao-semanal` with a layout where each block's visual form matches its own data shape (tally, ledger, day-matrix), add a week-over-week delta to Finanças and Hábitos, and turn each block title into a link to the page that owns the underlying data.

**Architecture:** No schema change, no new API functions — `getHabitLogsForRange` and `getTransactionsForRange` (already in `habitsApi.ts`/`financeApi.ts`) are called a second time for the previous week's range. `calculateHabitStats` gains a `days: boolean[]` field. All new visual language (tally marks, ledger rows, day-matrix marks, trend chip, tear rule, title-link hover arrow) is added to `src/index.css` as new classes, following the file's existing section-comment convention, then consumed from a rewritten `WeeklyReviewPage.tsx`.

**Tech Stack:** React 19 + TypeScript + Vite, Tailwind v4, React Router, date-fns.

**Spec:** `docs/superpowers/specs/2026-08-15-revisao-semanal-redesign-design.md` — implement exactly what it describes. Do not add a delta chip to Tarefas, cross-block correlation, or a manual demo/toggle control — all explicitly cut from scope per the spec.

## Global Constraints

- All app code changes happen in the worktree at `.claude/worktrees/organizador-pessoal/` (branch `worktree-organizador-pessoal`) — not the `master` checkout at the repo root.
- No automated test suite — verification is `npx tsc -b` per task, `npm run build` on the final task, plus a manual dev-server walkthrough.
- UI copy stays pt-BR. "semana passada" is written out in full, never abbreviated.
- Reuse existing design tokens only (`src/index.css` `@theme` block) — no new colors.
- `Card` (`src/components/common/Card.tsx`) is reused unmodified; do not add a `className`-based border-tint override (see spec's "Notas visuais" — this was deliberately cut, don't reintroduce it as a "nice to have").

---

### Task 1: `calculateHabitStats` gains per-day marks

**Files:**
- Modify: `src/features/weeklyReview/weeklyReviewStats.ts`

**Interfaces:**
- Consumes: unchanged inputs (`Habit[]`, `HabitLog[]`, `weekDates: string[]`).
- Produces: `calculateHabitStats(...)` return type becomes `{ habitId: string; name: string; done: number; total: number; days: boolean[] }[]` — `days[i]` is whether the habit has a `done: true` log on `weekDates[i]`. Consumed by Task 3 (habit matrix cells) and by the page's delta math (`done` summed across habits).

- [ ] **Step 1: Add `days` to `calculateHabitStats`**

In `src/features/weeklyReview/weeklyReviewStats.ts`, change the `calculateHabitStats` body to compute `days` alongside `done`:

```typescript
export function calculateHabitStats(
  habits: Habit[],
  habitLogs: HabitLog[],
  weekDates: string[],
): { habitId: string; name: string; done: number; total: number; days: boolean[] }[] {
  return habits.map((habit) => {
    const days = weekDates.map((date) => habitLogs.some((l) => l.habit_id === habit.id && l.date === date && l.done));
    return {
      habitId: habit.id,
      name: habit.name,
      done: days.filter(Boolean).length,
      total: weekDates.length,
      days,
    };
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors (the only consumer, `WeeklyReviewPage.tsx`, is rewritten in Task 3 in the same PR — a transient unused-field situation is fine mid-plan, but if `tsc -b` is run standalone before Task 3 it will still pass since extra object fields don't break existing destructuring).

- [ ] **Step 3: Commit**

```bash
git add src/features/weeklyReview/weeklyReviewStats.ts
git commit -m "feat: add per-day marks to weekly habit stats"
```

---

### Task 2: New CSS for the redesigned blocks

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces new classes consumed by Task 3: `.tear-rule` (+ child `span`/`i`), `.back-link`, `.block-title-link` (+ `.go-arrow`, `.accent-primary`/`.accent-success`/`.accent-special` variants), `.trend-chip` (+ `.up`/`.down`, `.arrow`), `.ledger-leader`, `.tally-mark` (+ `.filled`, `.grouped`), `.day-mark` (+ `.done`).

- [ ] **Step 1: Append the new section to `src/index.css`**

Add at the end of the file, after the existing `.ProseMirror` rules:

```css

/* ---- Weekly review: tear rule, title-link reveal, trend chip, ledger, tally, day-mark ---- */

.tear-rule {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 6px;
}
.tear-rule span {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--color-surface-border) 0 5px, transparent 5px 10px);
}
.tear-rule i {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--color-app-bg);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.7), 0 0 0 1px var(--color-surface-border);
  flex-shrink: 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: color 0.15s ease, gap 0.15s ease;
}
.back-link:hover,
.back-link:focus-visible {
  gap: 0.45rem;
}

.block-title-link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  color: var(--color-app-text);
  text-decoration: none;
}
.block-title-link .go-arrow {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 0.15s ease, transform 0.15s ease, color 0.15s ease;
}
.block-title-link:hover .go-arrow,
.block-title-link:focus-visible .go-arrow {
  opacity: 1;
  transform: translateX(0);
}
.block-title-link.accent-primary:hover,
.block-title-link.accent-primary:focus-visible { color: var(--color-primary-bright); }
.block-title-link.accent-primary .go-arrow { color: var(--color-primary); }
.block-title-link.accent-success:hover,
.block-title-link.accent-success:focus-visible { color: var(--color-success); }
.block-title-link.accent-success .go-arrow { color: var(--color-success); }
.block-title-link.accent-special:hover,
.block-title-link.accent-special:focus-visible { color: var(--color-special); }
.block-title-link.accent-special .go-arrow { color: var(--color-special); }

.trend-chip {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  font-weight: 500;
  color: var(--color-app-muted);
  white-space: nowrap;
}
.trend-chip .arrow { font-weight: 700; }
.trend-chip.up .arrow { color: var(--color-success); }
.trend-chip.down .arrow { color: var(--color-danger); }

.ledger-leader {
  flex: 1;
  border-bottom: 1px dotted var(--color-surface-border);
  transform: translateY(-4px);
}

.tally-mark {
  display: inline-block;
  width: 13px;
  height: 13px;
  border-radius: 9999px;
  border: 1.5px solid var(--color-app-muted-2);
  background: transparent;
  flex-shrink: 0;
  opacity: 0;
  transform: scale(0.4);
  animation: tally-punch 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.tally-mark.filled {
  background: var(--color-primary);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-dim);
}
.tally-mark.grouped {
  width: 22px;
  height: 10px;
  border-radius: 5px;
}
.tally-mark.grouped.filled {
  box-shadow: 0 0 0 2px var(--color-primary-dim);
}
@keyframes tally-punch {
  to { opacity: 1; transform: scale(1); }
}

.day-mark {
  display: inline-flex;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  border: 1.5px solid var(--color-surface-2);
  position: relative;
}
.day-mark.done {
  background: var(--color-special);
  border-color: var(--color-special);
}
.day-mark.done::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 3px;
  width: 5px;
  height: 8px;
  border-right: 1.6px solid var(--color-surface);
  border-bottom: 1.6px solid var(--color-surface);
  transform: rotate(40deg);
}

@media (prefers-reduced-motion: reduce) {
  .tally-mark { animation: none; opacity: 1; transform: none; }
}
```

- [ ] **Step 2: Visual smoke-check**

Run `npm run dev`, confirm the app still boots and no existing page regresses (this step only adds new, unused-so-far classes — nothing existing references them yet).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add tally/ledger/day-mark/trend-chip styles for weekly review redesign"
```

---

### Task 3: Rewrite `WeeklyReviewPage.tsx`

**Files:**
- Modify: `src/pages/WeeklyReviewPage.tsx`

**Interfaces:**
- Consumes: `getWeekRange`/`getSevenDaysFrom`/`toISODate`/`WEEKDAY_LABELS` (`dateUtils.ts`, unchanged), `getHabitLogsForRange`/`getTransactionsForRange` (called twice — current + previous week), `calculateHabitStats` (Task 1's new `days` field), `calculateTaskStats`/`calculateMonthSummary` (unchanged), `Card`, `Spinner`, `useToast`, `formatCurrency`, `Link` from `react-router-dom`.
- Produces: same default export shape (`WeeklyReviewPage`, no props) — route and Dashboard link from the original feature are untouched.

- [ ] **Step 1: Extend the data-fetch to include the previous week**

In the component, alongside the existing `weekStart`/`weekEnd`/`startISO`/`endISO`/`weekDates`, add:

```typescript
const prevWeekStart = subDays(weekStart, 7);
const prevWeekEnd = subDays(weekEnd, 7);
const prevStartISO = toISODate(prevWeekStart);
const prevEndISO = toISODate(prevWeekEnd);
const prevWeekDates = getSevenDaysFrom(prevWeekStart);
```

In `load()`'s `Promise.all`, add two calls and destructure two more results:

```typescript
const [t, rt, rl, h, hl, tx, accs, prevHl, prevTx] = await Promise.all([
  getTasksForRange(startISO, endISO),
  getRecurringTasks(),
  getRecurringLogsForRange(startISO, endISO),
  getHabits(),
  getHabitLogsForRange(startISO, endISO),
  getTransactionsForRange(startISO, endISO),
  getAccounts(),
  getHabitLogsForRange(prevStartISO, prevEndISO),
  getTransactionsForRange(prevStartISO, prevEndISO),
]);
```

Add two more pieces of state (`prevHabitLogs`, `prevTransactions`) set from `prevHl`/`prevTx`, mirroring the existing `habitLogs`/`transactions` state.

- [ ] **Step 2: Compute deltas**

After the existing `taskStats`/`habitStats`/`{ income, expense, invested }` computations, add:

```typescript
const prevHabitStats = calculateHabitStats(habits, prevHabitLogs, prevWeekDates);
const habitsDoneThisWeek = habitStats.reduce((sum, h) => sum + h.done, 0);
const habitsDonePrevWeek = prevHabitStats.reduce((sum, h) => sum + h.done, 0);
const habitsDelta = habitsDoneThisWeek - habitsDonePrevWeek;

const { income: prevIncome, expense: prevExpense } = calculateMonthSummary(prevTransactions, prevStartISO, prevEndISO, accounts);
const net = income - expense;
const prevNet = prevIncome - prevExpense;
const financeDelta = net - prevNet;
```

Both deltas are plain numbers; render `▲`/`▼` based on sign (treat `0` as `▲` with no visual weight, or hide the chip entirely — pick "hide when delta is exactly 0" to avoid a misleading arrow on a flat week).

- [ ] **Step 3: Masthead**

Replace the current `<h1>` + nav row with: a `<Link to="/" className="back-link ...">← Hoje</Link>` above everything, then the existing eyebrow/heading/nav row (restyle heading to be the week label, already the case), then a `<div className="tear-rule"><i /><span /><i /></div>` below it. Match the structure validated in the Artifact mockup (masthead, `.masthead-row`, nav buttons unchanged).

- [ ] **Step 4: Tasks block**

Replace the current "X de Y concluídas" paragraph with:
- A stat line: big `font-display` number (`taskStats.completed`) + `de {taskStats.total} tarefas` in `font-mono text-app-muted`.
- If `taskStats.total === 0`: render `<p>Nenhuma tarefa nesta semana.</p>` instead of the stat line and tally.
- Else: render one `<span className="tally-mark {filled?}" />` per task if `taskStats.total <= 20` (filled = index `< taskStats.completed`), or one per group of 5 (`Math.ceil(total / 5)` marks, `Math.round(completed / 5)` filled, each with `className="tally-mark grouped {filled?}"`) if `taskStats.total > 20`. Caption: `"concluídas nesta semana"`, or `"concluídas nesta semana · cada marca ≈ 5 tarefas"` when grouped.
- No delta chip on this block (per spec).
- Block title: `<Link to="/calendario" className="block-title-link accent-primary">Tarefas <span className="go-arrow">→ calendário</span></Link>` inside the `<h2>`.

- [ ] **Step 5: Finance block**

Replace the 4-column grid with ledger rows: `Entradas`/`Gastos` as `<span>` pairs with `.ledger-leader` between label and value (both neutral `text-app-text`, no color), a slim two-segment bar below (`width` proportional to `income`/`expense` of their sum, colors `bg-success`/`bg-danger` via Tailwind, or plain divs with those classes), an `<hr>`, then `Lucro / perda` in `text-success`/`text-danger` depending on sign (this is the only colored text in the block, per spec), then `Investido` neutral.

Block-head gets a `block-meta` column (tag `"Saldo da semana"` + `.trend-chip` showing `financeDelta`, hidden when `financeDelta === 0`). Block title: `<Link to="/financas" className="block-title-link accent-success">Finanças <span className="go-arrow">→ ver tudo</span></Link>`.

- [ ] **Step 6: Habits block**

Replace the `X/7` list with a `<table>`: header row with `WEEKDAY_LABELS` (from `dateUtils.ts`) as `<th>`s, one `<tr>` per habit with the habit name as a row header, 7 `<td>`s each containing `<span className="day-mark {done?}" title="{weekday label} — {feito|não feito}" />` from `habitStat.days[i]`, and a trailing score cell `{done}/{total}`. Keep the existing `habitStats.length === 0` empty-state message, restyled to sit above/instead of the table.

Block-head gets `block-meta` (tag `"Dom → Sáb"` + `.trend-chip` for `habitsDelta`, hidden when `0`). Block title: `<Link to="/calendario" className="block-title-link accent-special">Hábitos <span className="go-arrow">→ calendário</span></Link>`.

- [ ] **Step 7: Layout**

Wrap Tasks + Finance in a two-column grid (`grid grid-cols-1 md:grid-cols-[0.78fr_1fr] gap-4`, matching the `.row-2` proportions from the mockup) using Tailwind arbitrary values instead of a new CSS class (no need for a dedicated `.row-2` class — this shape is only used once). Habits stays full width below, unchanged in position.

- [ ] **Step 8: Type-check**

Run: `npx tsc -b`
Expected: no errors. Pay attention to the `prevHabitStats`/`days` typing flowing correctly from Task 1's change.

- [ ] **Step 9: Commit**

```bash
git add src/pages/WeeklyReviewPage.tsx
git commit -m "feat: redesign Revisão Semanal — tally, ledger, habit matrix, week-over-week trend"
```

---

### Task 4: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full type-check and build**

Run: `npm run build`
Expected: completes with no TypeScript errors.

- [ ] **Step 2: Manual browser walkthrough**

Using an existing logged-in session (no need for a fresh disposable account — this task only changes rendering/derivation of already-covered data paths, not the data model):

1. Open `/revisao-semanal`. Confirm: "← Hoje" navigates back to `/`; the tear rule renders under the week headline; Tarefas shows the tally (or the empty-state line on a week with zero tasks); Finanças shows the ledger with the proportion bar; Hábitos shows the day-matrix with the right weekday letters aligned to Sunday→Saturday columns.
2. Confirm Finanças and Hábitos each show a trend chip when their delta is non-zero, and that it's hidden (not `▲ 0`) when flat.
3. Hover each block title — confirm the arrow reveals in that block's accent color and the link navigates to `/calendario` (Tarefas, Hábitos) or `/financas` (Finanças).
4. Navigate to a week with more than 20 tasks in a row, if reachable with test data, and confirm the tally switches to grouped pills with the "cada marca ≈ 5 tarefas" caption; otherwise confirm the grouping condition reads correctly in code review.
5. Resize to mobile width — confirm the two-column Tasks/Finance row collapses to one column and the habit matrix scrolls horizontally without breaking the page layout.

- [ ] **Step 3: Report completion**

Summarize to Arthur what changed, confirm no schema/RLS change was needed, and that the branch is ready for `superpowers:finishing-a-development-branch` when he wants to merge.
