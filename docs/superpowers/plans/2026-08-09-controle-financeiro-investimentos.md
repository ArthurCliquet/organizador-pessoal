# Controle Financeiro — Investimentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let money be tracked as "invested" instead of only "gasto"/"entrada" — via investment accounts, a generic transfer between any two accounts, editable current value with computed gain/loss, and matching changes to the dashboard balance and monthly summary.

**Architecture:** Two new `accounts` columns (`is_investment`, `value_adjustment`) and a third `transactions.type` value (`'transfer'`) with a new `to_account_id` column carry the new data. `financeApi.ts` gets the balance/summary math extended to understand transfers and investment valuation. Two components are net-new (`TransferModal`, and an extended `CreateAccountModal`); `FinancePage`, `Balance`, `MonthSummary`, `AddTransactionModal`, and `RecentTransactions` are mutually dependent on the new account/transaction shape and are rewired together in one task, mirroring how the original multi-account rollout bundled its interdependent files.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + supabase-js), date-fns.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-controle-financeiro-investimentos-design.md` — implement exactly what it describes. Do not build an account management screen (rename/delete), real market-price integration, a history log of value updates, credit cards, goals, recurring accounts, or charts.
- All app code changes happen in the `main`-tracking worktree at `.claude/worktrees/organizador-pessoal` (branch `worktree-organizador-pessoal`) — **not** the `master` checkout at the repo root. This branch has an open PR to `main` with several prior finance plans already merged into its history; this continues on the same branch.
- No automated test suite in this project — verification is `npx tsc -b` per task, plus a manual dev-server/browser walkthrough on the final task.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` enabled.
- Supabase project id: `bjbszgblaqtcbvihgxqu`. The most recent applied migration is `0008`; this plan adds `0009`.
- This project holds Arthur's real personal data — never run destructive SQL against it outside a disposable test account's own rows. Any schema-altering statement must be reviewed against the exact current constraint names before running (Task 1 includes a lookup step for this reason).
- UI copy is Portuguese (pt-BR), matching the rest of the app.
- Investment accounts never receive a typed-in initial balance — they start at 0 and only gain value through transfers in, plus the manually-edited "valor atual" adjustment.
- "Investido" in the monthly resumo counts only transfers into investment accounts made that month — value-adjustment edits (gain/loss) are patrimony, not a month's cash flow, and never appear there.

---

### Task 1: Database schema — investment accounts and transfers

**Files:**
- Create: `supabase/migrations/0009_finance_investments.sql`

**Interfaces:**
- Produces: `accounts.is_investment boolean`, `accounts.value_adjustment numeric`, `transactions.to_account_id uuid | null`, `transactions.type` now allows `'transfer'`. Consumed by Task 2's data layer and types.

- [ ] **Step 1: Confirm the existing check-constraint name on `transactions.type`**

Use `mcp__supabase__execute_sql` with `project_id: "bjbszgblaqtcbvihgxqu"` and query:

```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'transactions'::regclass and contype = 'c';
```

Expected: one row with `conname = 'transactions_type_check'` and a definition referencing `type = ANY (ARRAY['income'::text, 'expense'::text])` (or equivalent `IN` form) and one row for the existing `amount > 0` check. If `transactions_type_check` is not the actual name, use the real name in Step 2 instead.

- [ ] **Step 2: Write the migration file**

```sql
alter table accounts add column is_investment boolean not null default false;
alter table accounts add column value_adjustment numeric not null default 0;

alter table transactions add column to_account_id uuid references accounts(id) on delete cascade;

alter table transactions drop constraint transactions_type_check;
alter table transactions add constraint transactions_type_check check (type in ('income', 'expense', 'transfer'));

alter table transactions add constraint transactions_transfer_shape_check check (
  (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
  or (type <> 'transfer' and to_account_id is null)
);
```

- [ ] **Step 3: Apply the migration to the Supabase project**

Use the `mcp__supabase__apply_migration` tool with `project_id: "bjbszgblaqtcbvihgxqu"`, `name: "finance_investments"`, and `query` set to the exact SQL from Step 2.

- [ ] **Step 4: Verify**

Use `mcp__supabase__list_tables` with `project_id: "bjbszgblaqtcbvihgxqu"`.
Expected: `accounts` has columns `is_investment` (boolean) and `value_adjustment` (numeric); `transactions` has column `to_account_id` (uuid, nullable).

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new warnings referencing `accounts` or `transactions`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0009_finance_investments.sql
git commit -m "feat: add investment account columns and transfer transaction type"
```

---

### Task 2: Types and data layer

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/features/finance/financeApi.ts`

**Interfaces:**
- Consumes: `Account`, `Transaction` types (about to change); `supabase` client (`src/lib/supabase.ts`, unchanged).
- Produces:
  - `Account` gains `is_investment: boolean`, `value_adjustment: number`.
  - `Transaction.type` becomes `'income' | 'expense' | 'transfer'`; `Transaction` gains `to_account_id: string | null`.
  - `createAccount(name: string, initialBalance: number, isInvestment?: boolean): Promise<Account>` — signature grows a third, optional parameter (defaults to `false`); when `true`, `initial_balance` is always persisted as `0` regardless of what's passed.
  - `createTransfer(input: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string }): Promise<Transaction>` (new).
  - `updateInvestmentValue(accountId: string, currentValue: number, contributedTotal: number): Promise<void>` (new) — persists `value_adjustment = currentValue - contributedTotal`.
  - `calculateContributedTotal(account: Account, transactions: Transaction[]): number` (new) — balance excluding `value_adjustment`.
  - `calculateBalance(account, transactions)` (existing signature, behavior changed) — now also nets transfers, and adds `value_adjustment` for investment accounts.
  - `calculateTotalBalance(accounts, transactions)` (existing signature, behavior changed) — now sums only non-investment accounts.
  - `calculateTotalInvested(accounts: Account[], transactions: Transaction[]): number` (new) — sums `calculateBalance` over investment accounts only.
  - `calculateMonthSummary(transactions, monthStart, monthEnd, accounts?: Account[])` — gains an optional fourth parameter (defaults to `[]`); return type gains `invested: number`.
  All consumed by Tasks 3-5.

- [ ] **Step 1: Update `src/types/index.ts`**

Change:

```typescript
export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  created_at: string;
}
```

to:

```typescript
export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  is_investment: boolean;
  value_adjustment: number;
  created_at: string;
}
```

Change:

```typescript
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

to:

```typescript
export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  date: string;
  created_at: string;
}
```

- [ ] **Step 2: Replace the entire contents of `src/features/finance/financeApi.ts`**

```typescript
import { supabase } from '../../lib/supabase';
import type { Account, Category, CategoryLimit, Transaction } from '../../types';

const DEFAULT_CATEGORIES: { name: string; type: Category['type'] }[] = [
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Compras', type: 'expense' },
  { name: 'Educação', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Casa', type: 'expense' },
  { name: 'Assinaturas', type: 'expense' },
  { name: 'Roupas', type: 'expense' },
  { name: 'Outros', type: 'expense' },
  { name: 'Salário', type: 'income' },
  { name: 'Presente', type: 'income' },
  { name: 'Mesada', type: 'income' },
  { name: 'Investimentos', type: 'income' },
  { name: 'Outros', type: 'income' },
];

export async function updateAccountInitialBalance(id: string, initialBalance: number): Promise<void> {
  const { error } = await supabase.from('accounts').update({ initial_balance: initialBalance }).eq('id', id);
  if (error) throw error;
}

export async function updateInvestmentValue(accountId: string, currentValue: number, contributedTotal: number): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ value_adjustment: currentValue - contributedTotal })
    .eq('id', accountId);
  if (error) throw error;
}

export async function ensureDefaultCategories(): Promise<Category[]> {
  const { data: existing, error: fetchError } = await supabase.from('categories').select('*').order('created_at');
  if (fetchError) throw fetchError;
  if (existing.length > 0) return existing;

  const { data: userData } = await supabase.auth.getUser();
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userData.user!.id }));
  const { data, error } = await supabase.from('categories').insert(rows).select();
  if (error) {
    if (error.code === '23505') {
      const { data: retry, error: retryError } = await supabase.from('categories').select('*').order('created_at');
      if (retryError) throw retryError;
      return retry;
    }
    throw error;
  }
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

export async function createTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
}): Promise<Transaction> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      account_id: input.fromAccountId,
      to_account_id: input.toAccountId,
      category_id: null,
      type: 'transfer',
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

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createAccount(name: string, initialBalance: number, isInvestment = false): Promise<Account> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name,
      initial_balance: isInvestment ? 0 : initialBalance,
      is_investment: isInvestment,
      user_id: userData.user!.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

function accountNetFlow(account: Account, transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === 'transfer') {
      if (t.account_id === account.id) return sum - Number(t.amount);
      if (t.to_account_id === account.id) return sum + Number(t.amount);
      return sum;
    }
    if (t.account_id !== account.id) return sum;
    return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
  }, 0);
}

export function calculateContributedTotal(account: Account, transactions: Transaction[]): number {
  return Number(account.initial_balance) + accountNetFlow(account, transactions);
}

export function calculateBalance(account: Account, transactions: Transaction[]): number {
  const adjustment = account.is_investment ? Number(account.value_adjustment) : 0;
  return calculateContributedTotal(account, transactions) + adjustment;
}

export function calculateTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => !a.is_investment)
    .reduce((sum, account) => sum + calculateBalance(account, transactions), 0);
}

export function calculateTotalInvested(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => a.is_investment)
    .reduce((sum, account) => sum + calculateBalance(account, transactions), 0);
}

export function calculateMonthSummary(
  transactions: Transaction[],
  monthStart: string,
  monthEnd: string,
  accounts: Account[] = [],
): { income: number; expense: number; invested: number } {
  const investmentAccountIds = new Set(accounts.filter((a) => a.is_investment).map((a) => a.id));
  return transactions.reduce(
    (acc, t) => {
      if (t.date < monthStart || t.date > monthEnd) return acc;
      if (t.type === 'income') acc.income += Number(t.amount);
      else if (t.type === 'expense') acc.expense += Number(t.amount);
      else if (t.to_account_id && investmentAccountIds.has(t.to_account_id)) acc.invested += Number(t.amount);
      return acc;
    },
    { income: 0, expense: 0, invested: 0 },
  );
}

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
Expected: no errors. (`Account`/`Transaction` shapes changed but every existing caller of `calculateMonthSummary` and `createAccount` still compiles, since the new parameters are optional/defaulted.)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/features/finance/financeApi.ts
git commit -m "feat: add transfer and investment-value data layer"
```

---

### Task 3: `CreateAccountModal` — investment account option

**Files:**
- Modify: `src/features/finance/CreateAccountModal.tsx`

**Interfaces:**
- Consumes: `parseCurrencyInput` (`src/lib/currency.ts`, existing).
- Produces: `CreateAccountModal` props become `{ onCreate: (input: { name: string; initialBalance: number; isInvestment: boolean }) => void; creating: boolean; onCancel?: () => void }`. `FinancePage.tsx`'s existing bootstrap call site (`<CreateAccountModal onCreate={handleCreateAccount} creating={creatingAccount} />`, `handleCreateAccount` still typed to accept only `{ name, initialBalance }`) keeps compiling unchanged — a handler with fewer declared fields is assignable wherever the extra field is simply unused. Task 5 rewires `FinancePage` to actually read `isInvestment` and adds the non-blocking `onCancel` usage.

- [ ] **Step 1: Replace the entire contents of `CreateAccountModal.tsx`**

```tsx
import { useState } from 'react';
import { parseCurrencyInput } from '../../lib/currency';

interface CreateAccountModalProps {
  onCreate: (input: { name: string; initialBalance: number; isInvestment: boolean }) => void;
  creating: boolean;
  onCancel?: () => void;
}

export function CreateAccountModal({ onCreate, creating, onCancel }: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [isInvestment, setIsInvestment] = useState(false);
  const [nameError, setNameError] = useState('');
  const [balanceError, setBalanceError] = useState('');

  function handleSubmit() {
    if (creating) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Informe um nome para a conta');
      return;
    }
    setNameError('');

    if (isInvestment) {
      setBalanceError('');
      onCreate({ name: trimmedName, initialBalance: 0, isInvestment: true });
      return;
    }

    const parsed = initialBalance.trim() === '' ? 0 : parseCurrencyInput(initialBalance);
    if (parsed === null) {
      setBalanceError('Valor inválido');
      return;
    }
    setBalanceError('');

    onCreate({ name: trimmedName, initialBalance: parsed, isInvestment: false });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Nomeie sua conta</h3>
        <p className="text-sm text-app-muted">Como se chama a conta ou carteira onde você guarda seu dinheiro?</p>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da conta (ex: Nubank)"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />
        {nameError && <p className="text-xs text-danger">{nameError}</p>}

        <label className="flex items-center gap-2 text-sm text-app-muted">
          <input
            type="checkbox"
            checked={isInvestment}
            onChange={(e) => setIsInvestment(e.target.checked)}
            className="accent-primary"
          />
          É uma conta de investimento
        </label>

        {!isInvestment && (
          <>
            <input
              inputMode="decimal"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="Saldo inicial (opcional)"
              className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
            />
            {balanceError && <p className="text-xs text-danger">{balanceError}</p>}
          </>
        )}

        <div className="flex justify-end gap-2 mt-1">
          {onCancel && (
            <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={creating}
            className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold disabled:opacity-50"
          >
            {creating ? 'Criando...' : 'Criar conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Note: the outer wrapper changed from a plain centered `<div>` to the same `fixed inset-0 bg-black/60 ... onClick={onCancel}` overlay pattern used by `AddTransactionModal`. When `onCancel` is `undefined` (the first-access bootstrap case in `FinancePage.tsx`, unchanged until Task 5), `onClick={undefined}` is a no-op, so clicking the backdrop still does nothing — the modal stays non-dismissable there, same as before.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/CreateAccountModal.tsx
git commit -m "feat: add investment account option to CreateAccountModal"
```

---

### Task 4: `TransferModal` component

**Files:**
- Create: `src/features/finance/TransferModal.tsx`

**Interfaces:**
- Consumes: `Account` type; `toISODate` (`src/features/calendar/dateUtils.ts`, existing); `parseCurrencyInput` (`src/lib/currency.ts`, existing).
- Produces: `TransferModal` component with props `{ accounts: Account[]; onCancel: () => void; onSave: (input: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string }) => void }`. Not reachable from any route yet — wired into `FinancePage.tsx` in Task 5.

- [ ] **Step 1: Write `TransferModal.tsx`**

```tsx
import { useState } from 'react';
import type { Account } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { parseCurrencyInput } from '../../lib/currency';

interface TransferModalProps {
  accounts: Account[];
  onCancel: () => void;
  onSave: (input: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string }) => void;
}

export function TransferModal({ accounts, onCancel, onSave }: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [amountError, setAmountError] = useState('');

  const destinationOptions = accounts.filter((a) => a.id !== fromAccountId);

  function handleFromChange(id: string) {
    setFromAccountId(id);
    if (toAccountId === id) {
      setToAccountId(accounts.find((a) => a.id !== id)?.id ?? '');
    }
  }

  function handleSubmit() {
    const parsed = parseCurrencyInput(amount);
    if (parsed === null || parsed <= 0) {
      setAmountError('Valor inválido');
      return;
    }
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    setAmountError('');
    onSave({ fromAccountId, toAccountId, amount: parsed, description: description.trim(), date });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Transferir entre contas</h3>

        <select
          value={fromAccountId}
          onChange={(e) => handleFromChange(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          {destinationOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />
        {amountError && <p className="text-xs text-danger">{amountError}</p>}

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/TransferModal.tsx
git commit -m "feat: add TransferModal component"
```

---

### Task 5: Wire investments into FinancePage, Balance, MonthSummary, AddTransactionModal, and RecentTransactions

**Files:**
- Modify: `src/pages/FinancePage.tsx`
- Modify: `src/features/finance/Balance.tsx`
- Modify: `src/features/finance/MonthSummary.tsx`
- Modify: `src/features/finance/AddTransactionModal.tsx`
- Modify: `src/features/finance/RecentTransactions.tsx`

**Interfaces:**
- Consumes: everything from Task 2 (`createTransfer`, `updateInvestmentValue`, `calculateContributedTotal`, `calculateBalance`, `calculateTotalBalance`, `calculateTotalInvested`, `calculateMonthSummary`, `createAccount`), Task 3's `CreateAccountModal`, Task 4's `TransferModal`.
- Produces: `Balance` now takes `{ accounts, transactions, onUpdateInitialBalance, onUpdateInvestmentValue: (accountId: string, currentValue: number) => void }`. `MonthSummary` now takes `{ transactions, accounts }`. `AddTransactionModal`'s account `<select>` excludes investment accounts. `RecentTransactions` renders `type: 'transfer'` rows distinctly.

This task touches five files together because their prop interfaces are mutually dependent — `FinancePage` can't compile passing `onUpdateInvestmentValue` to `Balance` until `Balance` accepts that prop, and `MonthSummary` can't compile requiring `accounts` until `FinancePage` passes it. Do all the edits below, then verify once at the end.

- [ ] **Step 1: Replace the entire contents of `Balance.tsx`**

```tsx
import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { calculateBalance, calculateContributedTotal, calculateTotalBalance, calculateTotalInvested } from './financeApi';
import { formatCurrency, parseCurrencyInput, formatAmountForInput } from '../../lib/currency';

interface BalanceProps {
  accounts: Account[];
  transactions: Transaction[];
  onUpdateInitialBalance: (accountId: string, value: number) => void;
  onUpdateInvestmentValue: (accountId: string, currentValue: number) => void;
}

function accountInitials(name: string): string {
  return name.slice(0, 2).toUpperCase() || '?';
}

export function Balance({ accounts, transactions, onUpdateInitialBalance, onUpdateInvestmentValue }: BalanceProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [saveError, setSaveError] = useState('');

  const normalAccounts = accounts.filter((a) => !a.is_investment);
  const investmentAccounts = accounts.filter((a) => a.is_investment);
  const totalAvailable = calculateTotalBalance(accounts, transactions);
  const totalInvested = calculateTotalInvested(accounts, transactions);

  function startEditing(account: Account) {
    setEditingId(account.id);
    setValue(formatAmountForInput(account.is_investment ? calculateBalance(account, transactions) : account.initial_balance));
    setSaveError('');
  }

  function handleSave(account: Account) {
    const parsed = parseCurrencyInput(value);
    if (parsed === null) {
      setSaveError('Valor inválido');
      return;
    }
    setSaveError('');
    if (account.is_investment) {
      onUpdateInvestmentValue(account.id, parsed);
    } else {
      onUpdateInitialBalance(account.id, parsed);
    }
    setEditingId(null);
  }

  function renderEditor(account: Account) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave(account);
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
          />
          <button onClick={() => handleSave(account)} className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold">
            Salvar
          </button>
          <button
            onClick={() => {
              setSaveError('');
              setEditingId(null);
            }}
            className="font-mono text-xs px-3 py-1.5 rounded text-app-muted hover:text-app-text"
          >
            Cancelar
          </button>
        </div>
        {saveError && <p className="text-xs text-danger">{saveError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-1">Saldo disponível</h2>
      <span className="font-display text-3xl font-semibold text-app-text mb-3">{formatCurrency(totalAvailable)}</span>

      <div className="flex flex-col gap-0.5">
        {normalAccounts.map((account) => (
          <div key={account.id} className="flex flex-col gap-1 py-1.5">
            {editingId === account.id ? (
              renderEditor(account)
            ) : (
              <button
                onClick={() => startEditing(account)}
                className="flex items-center justify-between gap-2 text-left hover:text-primary-bright transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-surface-2 text-primary font-mono text-[0.55rem] flex items-center justify-center shrink-0">
                    {accountInitials(account.name)}
                  </span>
                  <span className="text-sm truncate">{account.name}</span>
                </span>
                <span className="font-mono text-sm whitespace-nowrap">{formatCurrency(calculateBalance(account, transactions))}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="font-mono text-[0.6rem] text-app-muted-2 mt-2">Clique numa conta para ajustar o saldo inicial dela</p>

      {investmentAccounts.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold mt-5 mb-1">Investido</h2>
          <span className="font-display text-2xl font-semibold text-app-text mb-3">{formatCurrency(totalInvested)}</span>

          <div className="flex flex-col gap-0.5">
            {investmentAccounts.map((account) => {
              const current = calculateBalance(account, transactions);
              const contributed = calculateContributedTotal(account, transactions);
              const gain = current - contributed;
              const gainPercent = contributed !== 0 ? (gain / contributed) * 100 : 0;
              return (
                <div key={account.id} className="flex flex-col gap-1 py-1.5">
                  {editingId === account.id ? (
                    renderEditor(account)
                  ) : (
                    <button
                      onClick={() => startEditing(account)}
                      className="flex items-center justify-between gap-2 text-left hover:text-primary-bright transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-surface-2 text-primary font-mono text-[0.55rem] flex items-center justify-center shrink-0">
                          {accountInitials(account.name)}
                        </span>
                        <span className="text-sm truncate">{account.name}</span>
                      </span>
                      <span className="flex flex-col items-end shrink-0">
                        <span className="font-mono text-sm whitespace-nowrap">{formatCurrency(current)}</span>
                        {contributed !== 0 && (
                          <span className={`font-mono text-[0.65rem] whitespace-nowrap ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                            {gain >= 0 ? '+' : ''}
                            {formatCurrency(gain)} ({gain >= 0 ? '+' : ''}
                            {gainPercent.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="font-mono text-[0.6rem] text-app-muted-2 mt-2">Clique numa conta de investimento para atualizar o valor atual</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace the entire contents of `MonthSummary.tsx`**

```tsx
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Account, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { calculateMonthSummary } from './financeApi';
import { formatCurrency } from '../../lib/currency';

interface MonthSummaryProps {
  transactions: Transaction[];
  accounts: Account[];
}

export function MonthSummary({ transactions, accounts }: MonthSummaryProps) {
  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));
  const { income, expense, invested } = calculateMonthSummary(transactions, monthStart, monthEnd, accounts);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Resumo do mês</h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Entradas</p>
          <p className="font-display text-xl font-semibold text-success">{formatCurrency(income)}</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Gastos</p>
          <p className="font-display text-xl font-semibold text-danger">{formatCurrency(expense)}</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Investido</p>
          <p className="font-display text-xl font-semibold text-primary">{formatCurrency(invested)}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Filter investment accounts out of `AddTransactionModal.tsx`'s account picker**

Change the initial `accountId` state from:

```typescript
const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
```

to:

```typescript
const [accountId, setAccountId] = useState(accounts.find((a) => !a.is_investment)?.id ?? '');
```

Change the account `<select>` options from:

```tsx
{accounts.map((a) => (
  <option key={a.id} value={a.id}>
    {a.name}
  </option>
))}
```

to:

```tsx
{accounts
  .filter((a) => !a.is_investment)
  .map((a) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  ))}
```

- [ ] **Step 4: Replace the entire contents of `RecentTransactions.tsx`**

```tsx
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Account, Category, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { formatCurrency } from '../../lib/currency';
import { formatRelativeDate } from '../../lib/relativeDate';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export function RecentTransactions({ transactions, categories, accounts }: RecentTransactionsProps) {
  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));
  const recent = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);

  function categoryName(categoryId: string | null) {
    if (!categoryId) return 'Sem categoria';
    return categories.find((c) => c.id === categoryId)?.name ?? 'Sem categoria';
  }

  function accountName(accountId: string) {
    return accounts.find((a) => a.id === accountId)?.name ?? 'Conta removida';
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Últimas movimentações</h2>
      {recent.length === 0 && <p className="text-sm text-app-muted">Nenhuma movimentação ainda</p>}
      <div className={`flex flex-col ${recent.length > 5 ? 'max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin pr-1' : ''}`}>
        {recent.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 py-2.5 px-1.5 -mx-1.5 border-b border-surface-2 last:border-none"
          >
            <div className="min-w-0">
              <p className="text-sm text-app-text truncate">
                {t.description || (t.type === 'transfer' ? 'Transferência' : 'Sem descrição')}
              </p>
              <p className="font-mono text-[0.65rem] text-app-muted-2">
                {t.type === 'transfer'
                  ? `${accountName(t.account_id)} → ${accountName(t.to_account_id ?? '')} · ${formatRelativeDate(t.date)}`
                  : `${categoryName(t.category_id)} · ${accountName(t.account_id)} · ${formatRelativeDate(t.date)}`}
              </p>
            </div>
            <span
              className={`font-mono text-sm whitespace-nowrap ${
                t.type === 'income' ? 'text-success' : t.type === 'expense' ? 'text-danger' : 'text-primary'
              }`}
            >
              {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
              {formatCurrency(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace the entire contents of `FinancePage.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Category, CategoryLimit, Transaction } from '../types';
import {
  getAccounts,
  createAccount,
  ensureDefaultCategories,
  getTransactions,
  updateAccountInitialBalance,
  createTransaction,
  createTransfer,
  updateInvestmentValue,
  calculateContributedTotal,
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
import { TransferModal } from '../features/finance/TransferModal';

export function FinancePage() {
  const { showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateAccount(input: { name: string; initialBalance: number; isInvestment: boolean }) {
    setCreatingAccount(true);
    try {
      const account = await createAccount(input.name, input.initialBalance, input.isInvestment);
      setAccounts((prev) => [...prev, account]);
      setNewAccountOpen(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        showError('Você já tem uma conta com esse nome.');
      } else {
        showError('Não foi possível criar a conta.');
      }
    } finally {
      setCreatingAccount(false);
    }
  }

  async function handleUpdateInitialBalance(accountId: string, value: number) {
    try {
      await updateAccountInitialBalance(accountId, value);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, initial_balance: value } : a)));
    } catch {
      showError('Não foi possível atualizar o saldo.');
    }
  }

  async function handleUpdateInvestmentValue(accountId: string, currentValue: number) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const contributed = calculateContributedTotal(account, transactions);
    try {
      await updateInvestmentValue(accountId, currentValue, contributed);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, value_adjustment: currentValue - contributed } : a)));
    } catch {
      showError('Não foi possível atualizar o valor da conta.');
    }
  }

  async function handleCreateTransfer(input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) {
    try {
      await createTransfer(input);
      setTransactions(await getTransactions());
      setTransferOpen(false);
    } catch {
      showError('Não foi possível salvar a transferência.');
    }
  }

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

  async function handleCreateTransaction(input: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
    accountId: string;
  }) {
    try {
      await createTransaction(input);
      setTransactions(await getTransactions());
      setAddOpen(false);
    } catch {
      showError('Não foi possível salvar a movimentação.');
    }
  }

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
        <p className="text-sm text-app-muted">Não foi possível carregar seus dados financeiros.</p>
        <button
          onClick={() => load()}
          className="font-mono text-xs px-4 py-2 rounded bg-primary text-app-bg font-semibold"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return <CreateAccountModal onCreate={handleCreateAccount} creating={creatingAccount} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="font-display text-2xl font-semibold">Finanças</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewAccountOpen(true)}
            className="font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
          >
            + Nova conta
          </button>
          {accounts.length >= 2 && (
            <button
              onClick={() => setTransferOpen(true)}
              className="font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
            >
              Transferir
            </button>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="font-mono text-xs px-4 py-2.5 rounded-full bg-primary text-app-bg font-semibold hover:bg-primary-bright transition-colors"
          >
            + Adicionar movimentação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <Card>
          <Balance
            accounts={accounts}
            transactions={transactions}
            onUpdateInitialBalance={handleUpdateInitialBalance}
            onUpdateInvestmentValue={handleUpdateInvestmentValue}
          />
        </Card>
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
      </div>

      <Card>
        <MonthSummary transactions={transactions} accounts={accounts} />
      </Card>

      <Card>
        <RecentTransactions transactions={transactions} categories={categories} accounts={accounts} />
      </Card>

      {addOpen && (
        <AddTransactionModal
          categories={categories}
          accounts={accounts}
          onCancel={() => setAddOpen(false)}
          onSave={handleCreateTransaction}
        />
      )}

      {newAccountOpen && (
        <CreateAccountModal onCreate={handleCreateAccount} creating={creatingAccount} onCancel={() => setNewAccountOpen(false)} />
      )}

      {transferOpen && <TransferModal accounts={accounts} onCancel={() => setTransferOpen(false)} onSave={handleCreateTransfer} />}
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors. This confirms all five files agree on the new prop shapes.

- [ ] **Step 7: Commit**

```bash
git add src/pages/FinancePage.tsx src/features/finance/Balance.tsx src/features/finance/MonthSummary.tsx src/features/finance/AddTransactionModal.tsx src/features/finance/RecentTransactions.tsx
git commit -m "feat: wire investment accounts and transfers into the finance dashboard"
```

---

### Task 6: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full type-check and build**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces `dist/`.

- [ ] **Step 2: Browser walkthrough with a disposable account**

Per this project's data-safety convention, create a disposable test account (real-looking email domain — `@example.com` is rejected by this Supabase project's auth; confirm via SQL with `update auth.users set email_confirmed_at = now() where email = '<test-email>'` if normal signup email-sending is unavailable, a known intermittent issue on this project). Then, in the browser:

1. Log in, create the first account via the bootstrap modal: name "Conta corrente", saldo inicial `100`, leave the investment checkbox unchecked.
   Expected: dashboard renders. "Saldo disponível" shows `R$ 100,00`. No "Investido" section (no investment accounts yet). "Transferir" button is not visible (only one account).
2. Click "+ Nova conta". Name it "Ações XP", check "É uma conta de investimento" (saldo-inicial field disappears), create it.
   Expected: an "Investido" section appears below "Saldo disponível", showing `R$ 0,00` total and "Ações XP" at `R$ 0,00` with no gain/perda line (nothing contributed yet). "Transferir" button now visible (2 accounts).
3. Open "+ Adicionar movimentação". Confirm the account `<select>` only offers "Conta corrente" — "Ações XP" does not appear.
4. Click "Transferir". Origem "Conta corrente", destino "Ações XP", valor `50`, salvar.
   Expected: "Saldo disponível" drops to `R$ 50,00`; "Investido" total becomes `R$ 50,00`, with "Ações XP" showing `R$ 50,00` (no gain/perda line yet, since gain is `0`); "Resumo do mês" shows "Investido: R$ 50,00" alongside Entradas/Gastos at `R$ 0,00`; "Últimas movimentações" shows a row "Conta corrente → Ações XP" in the neutral/primary color, no `+`/`-` sign.
5. Click "Ações XP" in the "Investido" list, type `55`, save.
   Expected: "Ações XP" now shows `R$ 55,00` with `+R$ 5,00 (+10.0%)` in green underneath; "Investido" total in the balance card becomes `R$ 55,00`; "Saldo disponível" is unchanged at `R$ 50,00`; "Resumo do mês" "Investido" is still `R$ 50,00` (the valuation edit is not a month's cash flow).
6. Add a normal expense ("Mercado", `20`, categoria "Alimentação", conta "Conta corrente").
   Expected: "Saldo disponível" drops to `R$ 30,00`; "Investido" total is unaffected at `R$ 55,00`; "Resumo do mês" Gastos shows `R$ 20,00`, Investido still `R$ 50,00`.
7. Reload the page.
   Expected: all values from steps 4-6 persist identically.
8. Delete the disposable test account and all its rows from Supabase (accounts, categories, transactions, category_limits, `auth.identities`, `auth.users`) once verification is done, and verify the counts are `0` afterward.

- [ ] **Step 3: Confirm no RLS regressions**

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new warnings referencing `accounts` or `transactions`.

- [ ] **Step 4: Report completion**

Summarize to Arthur: what was built, that it's on the same open PR branch as the rest of the finance feature, and that his real account already has one account with real transaction history — opening "Finanças" should show that account unchanged under "Saldo disponível" with no "Investido" section (since he has no investment account yet), plus the new "+ Nova conta" and "Transferir" buttons in the header ready to use.
