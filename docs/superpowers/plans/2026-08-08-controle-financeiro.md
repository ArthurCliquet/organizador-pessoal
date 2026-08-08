# Controle Financeiro (tela inicial) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the finance dashboard's first screen (saldo atual, resumo do mês, placeholder de "quanto posso gastar", botão funcional de adicionar movimentação, e lista das últimas movimentações), backed by real `accounts`/`categories`/`transactions` tables.

**Architecture:** Follows the existing feature-folder convention (`src/features/<name>/`) used by `notes`/`tasks`/`habits`: a flat `financeApi.ts` talks to Supabase directly (no repository/service layers), and a page component (`FinancePage`) owns the shared state (account, categories, transactions) and passes it down as props to presentational cards — mirroring how `NotesPage.tsx` owns `folders`/`notes` state and passes callbacks into `FolderList`/`NoteList`. Data is bootstrapped automatically (default account + default categories created on first visit, no setup screen).

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + supabase-js), Tailwind v4 (CSS `@theme` tokens, no config file), date-fns, react-router-dom v6.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-08-controle-financeiro-design.md` — implement exactly what it describes; do not add contas recorrentes, metas, orçamento completo, gráficos avançados, parcelas, investimentos, cartão de crédito, or a category-management screen.
- All app code changes happen in the `main`-tracking worktree at `.claude/worktrees/organizador-pessoal` (branch `worktree-organizador-pessoal`), **not** in the `master` checkout at the repo root. Every file path below is relative to that worktree.
- This project has **no automated test suite** (no jest/vitest configured) — this is the existing state, not something to fix here. Verification per task is `npx tsc -b` (type-check, matches what `npm run build` runs first) plus, where noted, a manual check with the Vite dev server. Do not introduce a test framework as part of this plan.
- `tsconfig.json` has `strict`, `noUnusedLocals`, and `noUnusedParameters` enabled — unused imports/vars fail the build, not just lint.
- All tables use the existing RLS pattern: `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)` (see `supabase/migrations/0001_init.sql`).
- All UI copy is Portuguese (pt-BR), matching the rest of the app.
- The Supabase project (`bjbszgblaqtcbvihgxqu`, project name `organizador-pessoal`) holds Arthur's real personal data. Never wipe/reset it. Any browser-driven verification (Task 11) must use a disposable test account, deleted afterward.
- Design tokens (colors, fonts, `Card`/`ConfirmDialog`/`Spinner` components) already exist in `src/index.css` and `src/components/common/` — reuse them, don't redefine.

---

### Task 1: Database schema — accounts, categories, transactions

**Files:**
- Create: `supabase/migrations/0005_finance.sql`

**Interfaces:**
- Produces: tables `accounts(id, user_id, name, initial_balance, created_at)`, `categories(id, user_id, name, type, created_at)`, `transactions(id, user_id, account_id, category_id, type, amount, description, date, created_at)`, all RLS-owner-scoped. Later tasks read/write these via `financeApi.ts`.

- [ ] **Step 1: Write the migration file**

```sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  initial_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  description text not null default '',
  date date not null,
  created_at timestamptz not null default now()
);

create index transactions_user_account_date_idx on transactions(user_id, account_id, date);
create index transactions_category_idx on transactions(category_id);

alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

create policy "accounts_owner" on accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_owner" on categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_owner" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to the Supabase project**

Use the `mcp__supabase__apply_migration` tool with `project_id: "bjbszgblaqtcbvihgxqu"`, `name: "finance"`, and `query` set to the exact SQL from Step 1.

- [ ] **Step 3: Verify the tables exist with RLS enabled**

Use `mcp__supabase__list_tables` with `project_id: "bjbszgblaqtcbvihgxqu"`.
Expected: `accounts`, `categories`, `transactions` present, each with `rls_enabled: true`.

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new lint warnings referencing `accounts`, `categories`, or `transactions` (e.g. no "RLS disabled" warnings).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_finance.sql
git commit -m "feat: add accounts, categories, transactions tables"
```

---

### Task 2: TypeScript types

**Files:**
- Modify: `src/types/index.ts` (append at end of file)

**Interfaces:**
- Consumes: nothing.
- Produces: `Account`, `Category`, `Transaction` types, imported by `financeApi.ts` and every finance component in later tasks.

- [ ] **Step 1: Append the new interfaces**

```typescript
export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  created_at: string;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Account, Category, Transaction types"
```

---

### Task 3: Currency formatting helper

**Files:**
- Create: `src/lib/currency.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatCurrency(value: number): string` — used by `Balance.tsx`, `MonthSummary.tsx`, `RecentTransactions.tsx`.

- [ ] **Step 1: Write the helper**

```typescript
const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(value: number): string {
  return formatter.format(value);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/currency.ts
git commit -m "feat: add currency formatting helper"
```

---

### Task 4: Finance data layer

**Files:**
- Create: `src/features/finance/financeApi.ts`

**Interfaces:**
- Consumes: `supabase` client (`src/lib/supabase.ts`), `Account`/`Category`/`Transaction` types (Task 2).
- Produces:
  - `getOrCreateDefaultAccount(): Promise<Account>`
  - `updateAccountInitialBalance(id: string, initialBalance: number): Promise<void>`
  - `ensureDefaultCategories(): Promise<Category[]>`
  - `getAccountTransactions(accountId: string): Promise<Transaction[]>`
  - `createTransaction(input: { accountId: string; categoryId: string | null; type: 'income' | 'expense'; amount: number; description: string; date: string }): Promise<Transaction>`
  - `calculateBalance(account: Account, transactions: Transaction[]): number`
  - `calculateMonthSummary(transactions: Transaction[], monthStart: string, monthEnd: string): { income: number; expense: number }`
  These are consumed by `FinancePage.tsx` and the finance card components in Tasks 5–10.

- [ ] **Step 1: Write `financeApi.ts`**

```typescript
import { supabase } from '../../lib/supabase';
import type { Account, Category, Transaction } from '../../types';

const DEFAULT_ACCOUNT_NAME = 'Nubank';

const DEFAULT_CATEGORIES: { name: string; type: Category['type'] }[] = [
  { name: 'Salário', type: 'income' },
  { name: 'Outras receitas', type: 'income' },
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Moradia', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Outros', type: 'expense' },
];

export async function getOrCreateDefaultAccount(): Promise<Account> {
  const { data: existing, error: fetchError } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at')
    .limit(1);
  if (fetchError) throw fetchError;
  if (existing.length > 0) return existing[0];

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('accounts')
    .insert({ name: DEFAULT_ACCOUNT_NAME, initial_balance: 0, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccountInitialBalance(id: string, initialBalance: number): Promise<void> {
  const { error } = await supabase.from('accounts').update({ initial_balance: initialBalance }).eq('id', id);
  if (error) throw error;
}

export async function ensureDefaultCategories(): Promise<Category[]> {
  const { data: existing, error: fetchError } = await supabase.from('categories').select('*').order('created_at');
  if (fetchError) throw fetchError;
  if (existing.length > 0) return existing;

  const { data: userData } = await supabase.auth.getUser();
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userData.user!.id }));
  const { data, error } = await supabase.from('categories').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function getAccountTransactions(accountId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTransaction(input: {
  accountId: string;
  categoryId: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
}): Promise<Transaction> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      account_id: input.accountId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      date: input.date,
      user_id: userData.user!.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function calculateBalance(account: Account, transactions: Transaction[]): number {
  const net = transactions.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return Number(account.initial_balance) + net;
}

export function calculateMonthSummary(
  transactions: Transaction[],
  monthStart: string,
  monthEnd: string,
): { income: number; expense: number } {
  return transactions.reduce(
    (acc, t) => {
      if (t.date < monthStart || t.date > monthEnd) return acc;
      if (t.type === 'income') acc.income += Number(t.amount);
      else acc.expense += Number(t.amount);
      return acc;
    },
    { income: 0, expense: 0 },
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/financeApi.ts
git commit -m "feat: add finance data layer (accounts, categories, transactions)"
```

---

### Task 5: Navigation and page shell

**Files:**
- Create: `src/pages/FinancePage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/BottomNav.tsx`

**Interfaces:**
- Consumes: `getOrCreateDefaultAccount`, `ensureDefaultCategories`, `getAccountTransactions` (Task 4); `Account`, `Category`, `Transaction` (Task 2); `Card`, `Spinner` (existing); `useToast` (existing).
- Produces: route `/financas` rendering `FinancePage`; `FinancePage` owns `account`, `categories`, `transactions`, `loading` state and a `load()` function — later tasks (6–10) replace the placeholder card bodies with real components and read this same state via props.

- [ ] **Step 1: Create the page shell with bootstrap + placeholder cards**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Category, Transaction } from '../types';
import { getOrCreateDefaultAccount, ensureDefaultCategories, getAccountTransactions } from '../features/finance/financeApi';

export function FinancePage() {
  const { showError } = useToast();
  const [account, setAccount] = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [acc, cats] = await Promise.all([getOrCreateDefaultAccount(), ensureDefaultCategories()]);
      setAccount(acc);
      setCategories(cats);
      setTransactions(await getAccountTransactions(acc.id));
    } catch {
      showError('Não foi possível carregar seus dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !account) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Finanças</h1>
        <button className="font-mono text-xs px-4 py-2.5 rounded-full bg-primary text-app-bg font-semibold hover:bg-primary-bright transition-colors">
          + Adicionar movimentação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <Card>
          <h2 className="font-display text-lg font-semibold mb-1">Saldo atual</h2>
          <p className="text-sm text-app-muted">Em breve</p>
        </Card>
        <Card>
          <h2 className="font-display text-lg font-semibold mb-1">Quanto posso gastar</h2>
          <p className="text-sm text-app-muted">Em breve</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-lg font-semibold mb-1">Resumo do mês</h2>
        <p className="text-sm text-app-muted">Em breve</p>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold mb-1">Últimas movimentações</h2>
        <p className="text-sm text-app-muted">
          {transactions.length === 0 ? 'Nenhuma movimentação ainda' : `${transactions.length} movimentações`}
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Register the route in `App.tsx`**

In `src/App.tsx`, add the import next to the other page imports:

```tsx
import { FinancePage } from './pages/FinancePage';
```

Add the route inside the `AppLayout` route block, after the `/calendario` route:

```tsx
<Route path="/financas" element={<FinancePage />} />
```

- [ ] **Step 3: Add the nav link to `Sidebar.tsx`**

In `src/components/layout/Sidebar.tsx`, change the `links` array to:

```tsx
const links = [
  { to: '/', label: 'Hoje' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/financas', label: 'Finanças' },
];
```

- [ ] **Step 4: Add the nav link to `BottomNav.tsx`**

In `src/components/layout/BottomNav.tsx`, apply the same change to its `links` array:

```tsx
const links = [
  { to: '/', label: 'Hoje' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
  { to: '/financas', label: 'Finanças' },
];
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Manual check**

Run: `npm run dev`, open the printed URL, log in, click "Finanças" in the nav.
Expected: page loads without console errors, shows the four placeholder cards, and "Finanças" is highlighted as the active nav item.

- [ ] **Step 7: Commit**

```bash
git add src/pages/FinancePage.tsx src/App.tsx src/components/layout/Sidebar.tsx src/components/layout/BottomNav.tsx
git commit -m "feat: add Finanças route and page shell"
```

---

### Task 6: Saldo atual (Balance card)

**Files:**
- Create: `src/features/finance/Balance.tsx`
- Modify: `src/pages/FinancePage.tsx`

**Interfaces:**
- Consumes: `Account`, `Transaction` types; `calculateBalance` (Task 4); `formatCurrency` (Task 3).
- Produces: `Balance` component with props `{ account: Account; transactions: Transaction[]; onUpdateInitialBalance: (value: number) => void }`. `FinancePage` supplies `onUpdateInitialBalance` by calling `updateAccountInitialBalance` (Task 4) and updating local `account` state.

- [ ] **Step 1: Write `Balance.tsx`**

```tsx
import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { calculateBalance } from './financeApi';
import { formatCurrency } from '../../lib/currency';

interface BalanceProps {
  account: Account;
  transactions: Transaction[];
  onUpdateInitialBalance: (value: number) => void;
}

export function Balance({ account, transactions, onUpdateInitialBalance }: BalanceProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const balance = calculateBalance(account, transactions);

  function startEditing() {
    setValue(String(account.initial_balance));
    setEditing(true);
  }

  function handleSave() {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isNaN(parsed)) return;
    onUpdateInitialBalance(parsed);
    setEditing(false);
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-1">Saldo atual</h2>
      <p className="font-mono text-[0.65rem] text-app-muted-2 mb-3">{account.name}</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-2xl font-display text-app-text outline-none"
          />
          <button onClick={handleSave} className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold">
            Salvar
          </button>
          <button onClick={() => setEditing(false)} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={startEditing} className="text-left">
          <span className="font-display text-3xl font-semibold text-app-text hover:text-primary-bright transition-colors">
            {formatCurrency(balance)}
          </span>
        </button>
      )}
      <p className="font-mono text-[0.6rem] text-app-muted-2 mt-2">Clique no saldo para ajustar o saldo inicial da conta</p>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `FinancePage.tsx`**

Add the import:

```tsx
import { Balance } from '../features/finance/Balance';
```

Add the mutation handler, above the `if (loading || !account)` guard:

```tsx
async function handleUpdateInitialBalance(value: number) {
  if (!account) return;
  try {
    await updateAccountInitialBalance(account.id, value);
    setAccount({ ...account, initial_balance: value });
  } catch {
    showError('Não foi possível atualizar o saldo.');
  }
}
```

Add `updateAccountInitialBalance` to the existing `financeApi` import.

Replace the "Saldo atual" placeholder `Card` body:

```tsx
<Card>
  <Balance account={account} transactions={transactions} onUpdateInitialBalance={handleUpdateInitialBalance} />
</Card>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open "Finanças".
Expected: "Saldo atual" shows `R$ 0,00`. Click it, type `150`, press Enter. Expected: shows `R$ 150,00`. Reload the page. Expected: still shows `R$ 150,00` (persisted).

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/Balance.tsx src/pages/FinancePage.tsx
git commit -m "feat: add editable balance card"
```

---

### Task 7: Resumo do mês (Month summary card)

**Files:**
- Create: `src/features/finance/MonthSummary.tsx`
- Modify: `src/pages/FinancePage.tsx`

**Interfaces:**
- Consumes: `Transaction` type; `calculateMonthSummary` (Task 4); `formatCurrency` (Task 3); `toISODate` from `src/features/calendar/dateUtils.ts` (existing).
- Produces: `MonthSummary` component with props `{ transactions: Transaction[] }`.

- [ ] **Step 1: Write `MonthSummary.tsx`**

```tsx
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { calculateMonthSummary } from './financeApi';
import { formatCurrency } from '../../lib/currency';

interface MonthSummaryProps {
  transactions: Transaction[];
}

export function MonthSummary({ transactions }: MonthSummaryProps) {
  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));
  const { income, expense } = calculateMonthSummary(transactions, monthStart, monthEnd);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Resumo do mês</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Entradas</p>
          <p className="font-display text-xl font-semibold text-success">{formatCurrency(income)}</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Gastos</p>
          <p className="font-display text-xl font-semibold text-danger">{formatCurrency(expense)}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `FinancePage.tsx`**

Add the import:

```tsx
import { MonthSummary } from '../features/finance/MonthSummary';
```

Replace the "Resumo do mês" placeholder `Card` body:

```tsx
<Card>
  <MonthSummary transactions={transactions} />
</Card>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open "Finanças".
Expected: "Resumo do mês" shows "Entradas" and "Gastos" both at `R$ 0,00` (no transactions yet).

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/MonthSummary.tsx src/pages/FinancePage.tsx
git commit -m "feat: add month summary card"
```

---

### Task 8: Quanto posso gastar (placeholder card)

**Files:**
- Create: `src/features/finance/AvailableToSpend.tsx`
- Modify: `src/pages/FinancePage.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `AvailableToSpend` component, no props. Isolated on purpose so a future budgeting task can add logic here without touching the rest of the page.

- [ ] **Step 1: Write `AvailableToSpend.tsx`**

```tsx
export function AvailableToSpend() {
  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-1">Quanto posso gastar</h2>
      <p className="text-sm text-app-muted">
        Em breve — essa área vai mostrar quanto ainda dá pra gastar no mês, quando o orçamento for configurado.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `FinancePage.tsx`**

Add the import:

```tsx
import { AvailableToSpend } from '../features/finance/AvailableToSpend';
```

Replace the "Quanto posso gastar" placeholder `Card` body:

```tsx
<Card>
  <AvailableToSpend />
</Card>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/AvailableToSpend.tsx src/pages/FinancePage.tsx
git commit -m "feat: add available-to-spend placeholder card"
```

---

### Task 9: Últimas movimentações (Recent transactions list)

**Files:**
- Create: `src/features/finance/RecentTransactions.tsx`
- Modify: `src/pages/FinancePage.tsx`

**Interfaces:**
- Consumes: `Account`, `Category`, `Transaction` types; `formatCurrency` (Task 3); `formatRelativeDate` from `src/lib/relativeDate.ts` (existing).
- Produces: `RecentTransactions` component with props `{ transactions: Transaction[]; categories: Category[]; account: Account }`.

- [ ] **Step 1: Write `RecentTransactions.tsx`**

```tsx
import type { Account, Category, Transaction } from '../../types';
import { formatCurrency } from '../../lib/currency';
import { formatRelativeDate } from '../../lib/relativeDate';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  account: Account;
}

export function RecentTransactions({ transactions, categories, account }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 8);

  function categoryName(categoryId: string | null) {
    if (!categoryId) return 'Sem categoria';
    return categories.find((c) => c.id === categoryId)?.name ?? 'Sem categoria';
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Últimas movimentações</h2>
      {recent.length === 0 && <p className="text-sm text-app-muted">Nenhuma movimentação ainda</p>}
      <div className="flex flex-col">
        {recent.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 py-2.5 px-1.5 -mx-1.5 border-b border-surface-2 last:border-none"
          >
            <div className="min-w-0">
              <p className="text-sm text-app-text truncate">{t.description || 'Sem descrição'}</p>
              <p className="font-mono text-[0.65rem] text-app-muted-2">
                {categoryName(t.category_id)} · {account.name} · {formatRelativeDate(t.date)}
              </p>
            </div>
            <span className={`font-mono text-sm whitespace-nowrap ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
              {t.type === 'income' ? '+' : '-'}
              {formatCurrency(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `FinancePage.tsx`**

Add the import:

```tsx
import { RecentTransactions } from '../features/finance/RecentTransactions';
```

Replace the "Últimas movimentações" placeholder `Card` body:

```tsx
<Card>
  <RecentTransactions transactions={transactions} categories={categories} account={account} />
</Card>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open "Finanças".
Expected: "Últimas movimentações" shows "Nenhuma movimentação ainda" (no transactions exist yet — the Add flow lands in Task 10).

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/RecentTransactions.tsx src/pages/FinancePage.tsx
git commit -m "feat: add recent transactions list"
```

---

### Task 10: Adicionar movimentação (functional add-transaction modal)

**Files:**
- Create: `src/features/finance/AddTransactionModal.tsx`
- Modify: `src/pages/FinancePage.tsx`

**Interfaces:**
- Consumes: `Category` type; `createTransaction`, `getAccountTransactions` (Task 4); `toISODate` (existing, from `src/features/calendar/dateUtils.ts`).
- Produces: `AddTransactionModal` component with props `{ categories: Category[]; onCancel: () => void; onSave: (input: { type: 'income' | 'expense'; amount: number; description: string; date: string; categoryId: string | null }) => void }`. `FinancePage` wires this to the header's "+ Adicionar movimentação" button and refreshes `transactions` after a successful save.

- [ ] **Step 1: Write `AddTransactionModal.tsx`**

```tsx
import { useState } from 'react';
import type { Category } from '../../types';
import { toISODate } from '../calendar/dateUtils';

interface AddTransactionModalProps {
  categories: Category[];
  onCancel: () => void;
  onSave: (input: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
  }) => void;
}

export function AddTransactionModal({ categories, onCancel, onSave }: AddTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [categoryId, setCategoryId] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleSubmit() {
    const parsed = Number(amount.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0 || !description.trim()) return;
    onSave({ type, amount: parsed, description: description.trim(), date, categoryId: categoryId || null });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Nova movimentação</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 font-mono text-xs px-3 py-2 rounded ${type === 'expense' ? 'bg-danger text-app-bg font-semibold' : 'bg-surface-2 text-app-muted'}`}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 font-mono text-xs px-3 py-2 rounded ${type === 'income' ? 'bg-success text-app-bg font-semibold' : 'bg-surface-2 text-app-muted'}`}
          >
            Entrada
          </button>
        </div>

        <input
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `FinancePage.tsx`**

Add the import:

```tsx
import { AddTransactionModal } from '../features/finance/AddTransactionModal';
```

Add `createTransaction` to the existing `financeApi` import.

Add state for the modal, next to the other `useState` calls:

```tsx
const [addOpen, setAddOpen] = useState(false);
```

Add the submit handler, next to `handleUpdateInitialBalance`:

```tsx
async function handleCreateTransaction(input: {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId: string | null;
}) {
  if (!account) return;
  try {
    await createTransaction({ accountId: account.id, ...input });
    setTransactions(await getAccountTransactions(account.id));
    setAddOpen(false);
  } catch {
    showError('Não foi possível salvar a movimentação.');
  }
}
```

Wire the header button's `onClick`:

```tsx
<button
  onClick={() => setAddOpen(true)}
  className="font-mono text-xs px-4 py-2.5 rounded-full bg-primary text-app-bg font-semibold hover:bg-primary-bright transition-colors"
>
  + Adicionar movimentação
</button>
```

Render the modal at the end of the returned JSX, right before the closing `</div>` of the outer page container:

```tsx
{addOpen && (
  <AddTransactionModal categories={categories} onCancel={() => setAddOpen(false)} onSave={handleCreateTransaction} />
)}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open "Finanças". Click "+ Adicionar movimentação". Fill: tipo "Saída", descrição "Mercado", valor `50`, data hoje, categoria "Alimentação". Click "Salvar".
Expected: modal closes; "Últimas movimentações" now shows "Mercado" with `-R$ 50,00`; "Resumo do mês" "Gastos" shows `R$ 50,00`; "Saldo atual" decreased by `R$ 50,00`.

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/AddTransactionModal.tsx src/pages/FinancePage.tsx
git commit -m "feat: add functional add-transaction modal"
```

---

### Task 11: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full type-check and build**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces `dist/`.

- [ ] **Step 2: Browser walkthrough with a disposable account**

Per the project's data-safety rule (this Supabase project holds Arthur's real personal data): sign up a new disposable test account (a real-looking email domain, e.g. `@gmail.com` — `@example.com` is rejected by Supabase auth on this project), confirm it via SQL if needed (`update auth.users set email_confirmed_at = now() where email = '<test-email>'`), then in the browser:

1. Log in with the test account, navigate to "Finanças".
   Expected: page loads with "Saldo atual" `R$ 0,00`, "Resumo do mês" both `R$ 0,00`, "Quanto posso gastar" showing the placeholder text, "Últimas movimentações" showing "Nenhuma movimentação ainda" — confirming the bootstrap created a fresh account/categories for this new user without seeing the first user's data.
2. Click "Saldo atual", set it to `1000`, confirm it updates and persists across a reload.
3. Add one "Entrada" transaction (ex: "Salário", `3000`, categoria "Salário") and one "Saída" transaction (ex: "Aluguel", `1200`, categoria "Moradia").
   Expected: "Saldo atual" = `R$ 2.800,00` (1000 + 3000 − 1200); "Resumo do mês" shows Entradas `R$ 3.000,00` / Gastos `R$ 1.200,00`; both transactions appear in "Últimas movimentações" with correct sign, category, and account name.
4. Reload the page.
   Expected: all values persist identically (confirms data is read from Supabase, not local-only state).
5. Delete the disposable test account and its data from Supabase (Authentication > Users) once verification is done.

- [ ] **Step 3: Confirm no RLS regressions**

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no warnings referencing `accounts`, `categories`, or `transactions`.

- [ ] **Step 4: Report completion**

Summarize to Arthur: what was built, that it's live on the `worktree-organizador-pessoal` branch (not yet merged to `main`/deployed), and that he should do his own real-account walkthrough before merging.
