# Controle Financeiro — Limites Mensais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Quanto posso gastar" placeholder card with a real Monthly Limits feature: per-category monthly spending caps, each shown as a green/yellow/red progress bar, with full add/edit/delete support.

**Architecture:** One new table (`category_limits`), a small data-layer addition mirroring the existing CRUD patterns in `financeApi.ts`, a new presentational `MonthlyLimits` component (following `Balance.tsx`'s per-row inline-edit pattern), and a `FinancePage.tsx` wiring update that loads the limits alongside everything else and swaps the placeholder card.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + supabase-js), date-fns.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-08-controle-financeiro-limites-design.md` — implement exactly what it describes. Do not build month-specific limit history, limits on income categories, or any other finance functionality.
- All app code changes happen in the `main`-tracking worktree at `.claude/worktrees/organizador-pessoal` (branch `worktree-organizador-pessoal`) — **not** the `master` checkout at the repo root. This branch has an open PR to `main` with several prior finance plans already merged into its history; this continues on the same branch.
- No automated test suite in this project — verification is `npx tsc -b` per task, plus a manual dev-server/browser walkthrough on the final task.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` enabled.
- Supabase project id: `bjbszgblaqtcbvihgxqu`. The most recent applied migration is `0007`; this plan adds `0008`.
- UI copy is Portuguese (pt-BR), matching the rest of the app.
- Color thresholds for the progress bar: green below 70% of the limit, yellow from 70% to 99%, red at 100% or above (bar visually caps at 100% width, never overflows).
- The limit is a standing value, not tied to a specific month — spending is recalculated against it every month, the same way `MonthSummary` already recalculates entradas/gastos each month.

---

### Task 1: Database schema — `category_limits`

**Files:**
- Create: `supabase/migrations/0008_category_limits.sql`

**Interfaces:**
- Produces: table `category_limits(id, user_id, category_id, monthly_limit, created_at)`, RLS-owner-scoped, unique on `(user_id, category_id)`. Later tasks read/write it via `financeApi.ts`.

- [ ] **Step 1: Write the migration file**

```sql
create table category_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index category_limits_user_idx on category_limits(user_id);

alter table category_limits enable row level security;

create policy "category_limits_owner" on category_limits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to the Supabase project**

Use the `mcp__supabase__apply_migration` tool with `project_id: "bjbszgblaqtcbvihgxqu"`, `name: "category_limits"`, and `query` set to the exact SQL from Step 1.

- [ ] **Step 3: Verify**

Use `mcp__supabase__list_tables` with `project_id: "bjbszgblaqtcbvihgxqu"`.
Expected: `category_limits` present, with `rls_enabled: true`.

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new warnings referencing `category_limits`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0008_category_limits.sql
git commit -m "feat: add category_limits table"
```

---

### Task 2: Types and data layer

**Files:**
- Modify: `src/types/index.ts` (append at end of file)
- Modify: `src/features/finance/financeApi.ts` (add new exports; import the new type)

**Interfaces:**
- Consumes: `Category`, `Transaction` types (unchanged).
- Produces:
  - `CategoryLimit` type: `{ id: string; user_id: string; category_id: string; monthly_limit: number; created_at: string }`
  - `getCategoryLimits(): Promise<CategoryLimit[]>`
  - `createCategoryLimit(categoryId: string, monthlyLimit: number): Promise<CategoryLimit>`
  - `updateCategoryLimit(id: string, monthlyLimit: number): Promise<void>`
  - `deleteCategoryLimit(id: string): Promise<void>`
  - `calculateCategorySpending(categoryId: string, transactions: Transaction[], monthStart: string, monthEnd: string): number`
  All consumed by Task 3 (component) and Task 4 (page wiring).

- [ ] **Step 1: Append the `CategoryLimit` interface**

Add to the end of `src/types/index.ts`:

```typescript
export interface CategoryLimit {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  created_at: string;
}
```

- [ ] **Step 2: Add the new functions to `financeApi.ts`**

Update the type-only import at the top of `src/features/finance/financeApi.ts` from:

```typescript
import type { Account, Category, Transaction } from '../../types';
```

to:

```typescript
import type { Account, Category, CategoryLimit, Transaction } from '../../types';
```

Add these functions (anywhere after the imports — e.g. after `calculateMonthSummary` at the end of the file):

```typescript
export async function getCategoryLimits(): Promise<CategoryLimit[]> {
  const { data, error } = await supabase.from('category_limits').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createCategoryLimit(categoryId: string, monthlyLimit: number): Promise<CategoryLimit> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('category_limits')
    .insert({ category_id: categoryId, monthly_limit: monthlyLimit, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoryLimit(id: string, monthlyLimit: number): Promise<void> {
  const { error } = await supabase.from('category_limits').update({ monthly_limit: monthlyLimit }).eq('id', id);
  if (error) throw error;
}

export async function deleteCategoryLimit(id: string): Promise<void> {
  const { error } = await supabase.from('category_limits').delete().eq('id', id);
  if (error) throw error;
}

export function calculateCategorySpending(
  categoryId: string,
  transactions: Transaction[],
  monthStart: string,
  monthEnd: string,
): number {
  return transactions
    .filter((t) => t.category_id === categoryId && t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/features/finance/financeApi.ts
git commit -m "feat: add category limits data layer"
```

---

### Task 3: `MonthlyLimits` component

**Files:**
- Create: `src/features/finance/MonthlyLimits.tsx`

**Interfaces:**
- Consumes: `Category`, `CategoryLimit`, `Transaction` types; `calculateCategorySpending` (Task 2); `formatCurrency`, `parseCurrencyInput`, `formatAmountForInput` (`src/lib/currency.ts`, all existing); `toISODate` (`src/features/calendar/dateUtils.ts`, existing).
- Produces: `MonthlyLimits` component with props `{ categoryLimits: CategoryLimit[]; categories: Category[]; transactions: Transaction[]; onCreate: (categoryId: string, monthlyLimit: number) => void; onUpdate: (id: string, monthlyLimit: number) => void; onDelete: (id: string) => void }`. Consumed by Task 4's `FinancePage.tsx`. Not reachable from any route yet.

- [ ] **Step 1: Write `MonthlyLimits.tsx`**

```tsx
import { useState } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Category, CategoryLimit, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { calculateCategorySpending } from './financeApi';
import { formatCurrency, parseCurrencyInput, formatAmountForInput } from '../../lib/currency';

interface MonthlyLimitsProps {
  categoryLimits: CategoryLimit[];
  categories: Category[];
  transactions: Transaction[];
  onCreate: (categoryId: string, monthlyLimit: number) => void;
  onUpdate: (id: string, monthlyLimit: number) => void;
  onDelete: (id: string) => void;
}

function barColor(percent: number): string {
  if (percent >= 100) return 'bg-danger';
  if (percent >= 70) return 'bg-yellow-500';
  return 'bg-success';
}

export function MonthlyLimits({ categoryLimits, categories, transactions, onCreate, onUpdate, onDelete }: MonthlyLimitsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newError, setNewError] = useState('');

  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const limitedCategoryIds = new Set(categoryLimits.map((l) => l.category_id));
  const availableCategories = expenseCategories.filter((c) => !limitedCategoryIds.has(c.id));

  function categoryName(categoryId: string) {
    return categories.find((c) => c.id === categoryId)?.name ?? 'Categoria removida';
  }

  function startEditing(limit: CategoryLimit) {
    setEditingId(limit.id);
    setEditValue(formatAmountForInput(limit.monthly_limit));
    setEditError('');
  }

  function handleSaveEdit(id: string) {
    const parsed = parseCurrencyInput(editValue);
    if (parsed === null || parsed <= 0) {
      setEditError('Valor inválido');
      return;
    }
    setEditError('');
    onUpdate(id, parsed);
    setEditingId(null);
  }

  function handleCreate() {
    if (!newCategoryId) return;
    const parsed = parseCurrencyInput(newLimit);
    if (parsed === null || parsed <= 0) {
      setNewError('Valor inválido');
      return;
    }
    setNewError('');
    onCreate(newCategoryId, parsed);
    setNewCategoryId('');
    setNewLimit('');
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Limites mensais</h2>

      {categoryLimits.length === 0 && <p className="text-sm text-app-muted mb-3">Nenhum limite definido ainda</p>}

      <div className="flex flex-col gap-3 mb-3">
        {categoryLimits.map((limit) => {
          const spent = calculateCategorySpending(limit.category_id, transactions, monthStart, monthEnd);
          const percent = Math.min((spent / Number(limit.monthly_limit)) * 100, 100);
          return (
            <div key={limit.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{categoryName(limit.category_id)}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => startEditing(limit)} className="font-mono text-[0.65rem] text-app-muted-2 hover:text-app-text">
                    editar
                  </button>
                  <button onClick={() => onDelete(limit.id)} className="text-app-muted hover:text-danger text-xs">
                    ✕
                  </button>
                </div>
              </div>

              {editingId === limit.id ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      inputMode="decimal"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(limit.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
                    />
                    <button
                      onClick={() => handleSaveEdit(limit.id)}
                      className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditError('');
                        setEditingId(null);
                      }}
                      className="font-mono text-xs px-3 py-1.5 rounded text-app-muted hover:text-app-text"
                    >
                      Cancelar
                    </button>
                  </div>
                  {editError && <p className="text-xs text-danger">{editError}</p>}
                </div>
              ) : (
                <>
                  <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor(percent)}`} style={{ width: `${percent}%` }} />
                  </div>
                  <p className="font-mono text-[0.65rem] text-app-muted-2">
                    {formatCurrency(spent)} / {formatCurrency(Number(limit.monthly_limit))}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {availableCategories.length > 0 && (
        <div className="flex flex-col gap-2 border border-dashed border-surface-border rounded-[11px] p-3">
          <select
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
            className="bg-app-bg border border-surface-border rounded px-2 py-1.5 text-xs text-app-text outline-none focus:border-primary"
          >
            <option value="">Escolha uma categoria</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="Limite mensal"
              className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1.5 text-xs text-app-text outline-none focus:border-primary"
            />
            <button onClick={handleCreate} className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold">
              Definir limite
            </button>
          </div>
          {newError && <p className="text-xs text-danger">{newError}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/MonthlyLimits.tsx
git commit -m "feat: add MonthlyLimits component"
```

---

### Task 4: Wire `MonthlyLimits` into `FinancePage`, remove the placeholder

**Files:**
- Modify: `src/pages/FinancePage.tsx`
- Delete: `src/features/finance/AvailableToSpend.tsx`

**Interfaces:**
- Consumes: `getCategoryLimits`, `createCategoryLimit`, `updateCategoryLimit`, `deleteCategoryLimit` (Task 2); `MonthlyLimits` (Task 3); `CategoryLimit` type.
- Produces: `FinancePage` now loads `categoryLimits` state alongside `accounts`/`categories`/`transactions`, and renders `MonthlyLimits` where `AvailableToSpend` used to be.

- [ ] **Step 1: Delete the placeholder component**

Delete the file `src/features/finance/AvailableToSpend.tsx`.

- [ ] **Step 2: Update imports in `FinancePage.tsx`**

Change:

```typescript
import {
  getAccounts,
  createAccount,
  ensureDefaultCategories,
  getTransactions,
  updateAccountInitialBalance,
  createTransaction,
} from '../features/finance/financeApi';
import { Balance } from '../features/finance/Balance';
import { MonthSummary } from '../features/finance/MonthSummary';
import { AvailableToSpend } from '../features/finance/AvailableToSpend';
import { RecentTransactions } from '../features/finance/RecentTransactions';
import { AddTransactionModal } from '../features/finance/AddTransactionModal';
import { CreateAccountModal } from '../features/finance/CreateAccountModal';
```

to:

```typescript
import {
  getAccounts,
  createAccount,
  ensureDefaultCategories,
  getTransactions,
  updateAccountInitialBalance,
  createTransaction,
  getCategoryLimits,
  createCategoryLimit,
  updateCategoryLimit,
  deleteCategoryLimit,
} from '../features/finance/financeApi';
import { Balance } from '../features/finance/Balance';
import { MonthSummary } from '../features/finance/MonthSummary';
import { MonthlyLimits } from '../features/finance/MonthlyLimits';
import { RecentTransactions } from '../features/finance/RecentTransactions';
import { AddTransactionModal } from '../features/finance/AddTransactionModal';
import { CreateAccountModal } from '../features/finance/CreateAccountModal';
```

Also change the type-only import line from:

```typescript
import type { Account, Category, Transaction } from '../types';
```

to:

```typescript
import type { Account, Category, CategoryLimit, Transaction } from '../types';
```

- [ ] **Step 3: Add `categoryLimits` state and load it**

Add a new state declaration right after `const [transactions, setTransactions] = useState<Transaction[]>([]);`:

```typescript
const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
```

Change the `load` function from:

```typescript
const load = useCallback(async () => {
  setLoading(true);
  setError(false);
  try {
    const [accs, cats] = await Promise.all([getAccounts(), ensureDefaultCategories()]);
    setAccounts(accs);
    setCategories(cats);
    setTransactions(await getTransactions());
  } catch {
    showError('Não foi possível carregar seus dados financeiros.');
    setError(true);
  } finally {
    setLoading(false);
  }
}, [showError]);
```

to:

```typescript
const load = useCallback(async () => {
  setLoading(true);
  setError(false);
  try {
    const [accs, cats, limits] = await Promise.all([getAccounts(), ensureDefaultCategories(), getCategoryLimits()]);
    setAccounts(accs);
    setCategories(cats);
    setCategoryLimits(limits);
    setTransactions(await getTransactions());
  } catch {
    showError('Não foi possível carregar seus dados financeiros.');
    setError(true);
  } finally {
    setLoading(false);
  }
}, [showError]);
```

- [ ] **Step 4: Add the three category-limit handlers**

Add these functions after `handleUpdateInitialBalance` (before `handleCreateTransaction`):

```typescript
async function handleCreateCategoryLimit(categoryId: string, monthlyLimit: number) {
  try {
    const limit = await createCategoryLimit(categoryId, monthlyLimit);
    setCategoryLimits((prev) => [...prev, limit]);
  } catch {
    showError('Não foi possível criar o limite.');
  }
}

async function handleUpdateCategoryLimit(id: string, monthlyLimit: number) {
  try {
    await updateCategoryLimit(id, monthlyLimit);
    setCategoryLimits((prev) => prev.map((l) => (l.id === id ? { ...l, monthly_limit: monthlyLimit } : l)));
  } catch {
    showError('Não foi possível atualizar o limite.');
  }
}

async function handleDeleteCategoryLimit(id: string) {
  try {
    await deleteCategoryLimit(id);
    setCategoryLimits((prev) => prev.filter((l) => l.id !== id));
  } catch {
    showError('Não foi possível remover o limite.');
  }
}
```

- [ ] **Step 5: Replace the `AvailableToSpend` card with `MonthlyLimits`**

Change:

```tsx
<Card>
  <AvailableToSpend />
</Card>
```

to:

```tsx
<Card>
  <MonthlyLimits
    categoryLimits={categoryLimits}
    categories={categories}
    transactions={transactions}
    onCreate={handleCreateCategoryLimit}
    onUpdate={handleUpdateCategoryLimit}
    onDelete={handleDeleteCategoryLimit}
  />
</Card>
```

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/FinancePage.tsx src/features/finance/AvailableToSpend.tsx
git commit -m "feat: wire monthly limits into the finance dashboard"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full type-check and build**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces `dist/`.

- [ ] **Step 2: Browser walkthrough with a disposable account**

Per this project's data-safety convention, create a disposable test account (or reuse one you create and fully delete afterward — see any earlier finance-plan verification task for the exact technique if normal signup email-sending is unavailable). Then, in the browser, with at least one account already created (create one first if starting fresh, e.g. "Conta Teste" with saldo inicial `0`):

1. Navigate to "Finanças". Expected: the "Limites mensais" card shows "Nenhum limite definido ainda" and a control with a category `<select>` (all expense categories, since none have limits yet) and a value input.
2. Choose "Alimentação", type `500`, click "Definir limite". Expected: a new row appears for "Alimentação" with a green progress bar at 0%, showing `R$ 0,00 / R$ 500,00`. "Alimentação" no longer appears in the "add limit" category selector.
3. Add an expense transaction: "Mercado", `375`, categoria "Alimentação". Expected: back on the dashboard, the "Alimentação" bar is now at 75% and yellow (375/500 = 75%, ≥ 70% threshold).
4. Add another expense: "Mercado 2", `200`, categoria "Alimentação" (total now 575, over the 500 limit). Expected: the bar is red and visually capped at 100% width; the text shows `R$ 575,00 / R$ 500,00` (the raw spent value, not capped, even though the bar itself is capped).
5. Click "editar" on the "Alimentação" row, change the limit to `1000`, save. Expected: the bar recalculates — 575/1000 = 57.5%, back to green, text shows `R$ 575,00 / R$ 1.000,00`.
6. Click "✕" to remove the "Alimentação" limit. Expected: the row disappears, "Nenhum limite definido ainda" reappears if it was the only one, and "Alimentação" reappears in the "add limit" category selector.
7. Reload the page. Expected: whatever limits exist at that point persist identically.
8. Clean up: delete the disposable test account and all its rows (transactions, category_limits, categories, accounts, `auth.identities`, `auth.users`) from Supabase, verify counts are `0`.

- [ ] **Step 3: Confirm no RLS regressions**

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no warnings referencing `category_limits`.

- [ ] **Step 4: Report completion**

Summarize to Arthur: what was built, that it's on the same open PR branch as the rest of the finance feature, and that his real account should be tested by him personally (create a limit for a category he actually spends in, to see the real percentage/color).
