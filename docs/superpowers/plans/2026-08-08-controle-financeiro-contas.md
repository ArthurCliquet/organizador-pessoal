# Controle Financeiro — Contas/Carteiras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the finance feature from a single hard-coded account ("Nubank") to a user-owned list of accounts, with a blocking "name your account" step on first use, per-account initial-balance editing, an account selector on the add-transaction form, and a total balance that sums every account.

**Architecture:** No schema changes — `accounts` and `transactions.account_id` already exist. This is an application-code generalization: the data layer moves from "get-or-create the one account" to "list of accounts," and `FinancePage`, `Balance`, `RecentTransactions`, and `AddTransactionModal` — which all currently assume a single account — are updated together, since their prop interfaces are mutually dependent and must change in the same commit to keep the app compiling.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + supabase-js).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-08-controle-financeiro-contas-design.md` — implement exactly what it describes. Do not build account transfer, an account management screen (rename/delete), credit cards, goals, budget, recurring accounts, investments, or charts.
- All app code changes happen in the `main`-tracking worktree at `.claude/worktrees/organizador-pessoal` (branch `worktree-organizador-pessoal`) — **not** the `master` checkout at the repo root. This branch already has an open PR (`worktree-organizador-pessoal` → `main`) with prior finance work; this continues on the same branch.
- No automated test suite in this project — verification is `npx tsc -b` per task, plus a manual dev-server/browser walkthrough on the final task.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` enabled.
- Supabase project id: `bjbszgblaqtcbvihgxqu`.
- UI copy is Portuguese (pt-BR), matching the rest of the app.
- No new tables or columns — `accounts(id, user_id, name, initial_balance, created_at)` and `transactions.account_id` already exist from the prior finance-dashboard plan.

---

### Task 1: Data layer — accounts list, create account, global transactions

**Files:**
- Modify: `src/features/finance/financeApi.ts` (add new exports; do not remove `getOrCreateDefaultAccount` or `getAccountTransactions` yet — they're still used by `FinancePage.tsx` until Task 3)

**Interfaces:**
- Consumes: `Account`, `Transaction` types (`src/types/index.ts`, unchanged).
- Produces:
  - `getAccounts(): Promise<Account[]>`
  - `createAccount(name: string, initialBalance: number): Promise<Account>`
  - `getTransactions(): Promise<Transaction[]>`
  - `calculateBalance(account: Account, transactions: Transaction[]): number` (existing signature, behavior changed — now filters `transactions` by `t.account_id === account.id` before summing)
  - `calculateTotalBalance(accounts: Account[], transactions: Transaction[]): number`
  All consumed by Task 3.

- [ ] **Step 1: Add the new functions and fix `calculateBalance`**

Add these to `src/features/finance/financeApi.ts` (after the existing `updateAccountInitialBalance` function, and replacing the existing `calculateBalance`/adding the new one at the bottom near it):

```typescript
export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createAccount(name: string, initialBalance: number): Promise<Account> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('accounts')
    .insert({ name, initial_balance: initialBalance, user_id: userData.user!.id })
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
```

Replace the existing `calculateBalance` function body (keep the same name and signature) with:

```typescript
export function calculateBalance(account: Account, transactions: Transaction[]): number {
  const net = transactions
    .filter((t) => t.account_id === account.id)
    .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return Number(account.initial_balance) + net;
}

export function calculateTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts.reduce((sum, account) => sum + calculateBalance(account, transactions), 0);
}
```

Leave `getOrCreateDefaultAccount`, `getAccountTransactions`, `ensureDefaultCategories`, `updateAccountInitialBalance`, `createTransaction`, `calculateMonthSummary`, and the `DEFAULT_ACCOUNT_NAME`/`DEFAULT_CATEGORIES` constants exactly as they are — untouched by this task.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors. (This must pass with the old and new functions coexisting — `FinancePage.tsx` still calls the old ones, unchanged until Task 3.)

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/financeApi.ts
git commit -m "feat: add accounts list, createAccount, and global getTransactions"
```

---

### Task 2: `CreateAccountModal` component

**Files:**
- Create: `src/features/finance/CreateAccountModal.tsx`

**Interfaces:**
- Consumes: `parseCurrencyInput` from `src/lib/currency.ts` (existing).
- Produces: `CreateAccountModal` component with props `{ onCreate: (input: { name: string; initialBalance: number }) => void }`. Consumed by Task 3's `FinancePage.tsx`.

This modal is not reachable from any route yet — it's wired into `FinancePage.tsx` in Task 3. It follows the same visual pattern as `AddTransactionModal.tsx`, but is **not dismissable** (no backdrop-click-to-close, no cancel button) since at least one account is required before the rest of the finance page can render.

- [ ] **Step 1: Write `CreateAccountModal.tsx`**

```tsx
import { useState } from 'react';
import { parseCurrencyInput } from '../../lib/currency';

interface CreateAccountModalProps {
  onCreate: (input: { name: string; initialBalance: number }) => void;
}

export function CreateAccountModal({ onCreate }: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [nameError, setNameError] = useState('');
  const [balanceError, setBalanceError] = useState('');

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Informe um nome para a conta');
      return;
    }
    setNameError('');

    const parsed = initialBalance.trim() === '' ? 0 : parseCurrencyInput(initialBalance);
    if (parsed === null) {
      setBalanceError('Valor inválido');
      return;
    }
    setBalanceError('');

    onCreate({ name: trimmedName, initialBalance: parsed });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4">
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

        <input
          inputMode="decimal"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="Saldo inicial (opcional)"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />
        {balanceError && <p className="text-xs text-danger">{balanceError}</p>}

        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={handleSubmit}
            className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold"
          >
            Criar conta
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
git add src/features/finance/CreateAccountModal.tsx
git commit -m "feat: add CreateAccountModal component"
```

---

### Task 3: Rewire FinancePage, Balance, RecentTransactions, and AddTransactionModal for multiple accounts

**Files:**
- Modify: `src/pages/FinancePage.tsx`
- Modify: `src/features/finance/Balance.tsx`
- Modify: `src/features/finance/RecentTransactions.tsx`
- Modify: `src/features/finance/AddTransactionModal.tsx`
- Modify: `src/features/finance/financeApi.ts` (remove now-dead code)

**Interfaces:**
- Consumes: `getAccounts`, `createAccount`, `getTransactions`, `calculateBalance`, `calculateTotalBalance` (Task 1); `CreateAccountModal` (Task 2); `Account`, `Category`, `Transaction` types.
- Produces: `Balance` now takes `{ accounts: Account[]; transactions: Transaction[]; onUpdateInitialBalance: (accountId: string, value: number) => void }`. `RecentTransactions` now takes `{ transactions: Transaction[]; categories: Category[]; accounts: Account[] }`. `AddTransactionModal` now takes `{ categories: Category[]; accounts: Account[]; onCancel: () => void; onSave: (input: { type: 'income' | 'expense'; amount: number; description: string; date: string; categoryId: string | null; accountId: string }) => void }` — note `accountId` is now part of the `onSave` payload, so `FinancePage` no longer needs to inject it separately.

This task touches five files together because they're mutually dependent: `FinancePage` can't compile passing `accounts={accounts}` to `Balance` until `Balance` accepts that prop, and vice versa. Do all the edits below, then verify once at the end.

- [ ] **Step 1: Rewrite `FinancePage.tsx`**

Replace the entire contents of `src/pages/FinancePage.tsx` with:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Category, Transaction } from '../types';
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

export function FinancePage() {
  const { showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateAccount(input: { name: string; initialBalance: number }) {
    try {
      const account = await createAccount(input.name, input.initialBalance);
      setAccounts((prev) => [...prev, account]);
    } catch {
      showError('Não foi possível criar a conta.');
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
    return <CreateAccountModal onCreate={handleCreateAccount} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Finanças</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="font-mono text-xs px-4 py-2.5 rounded-full bg-primary text-app-bg font-semibold hover:bg-primary-bright transition-colors"
        >
          + Adicionar movimentação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <Card>
          <Balance accounts={accounts} transactions={transactions} onUpdateInitialBalance={handleUpdateInitialBalance} />
        </Card>
        <Card>
          <AvailableToSpend />
        </Card>
      </div>

      <Card>
        <MonthSummary transactions={transactions} />
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
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `Balance.tsx`**

Replace the entire contents of `src/features/finance/Balance.tsx` with:

```tsx
import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { calculateBalance, calculateTotalBalance } from './financeApi';
import { formatCurrency, parseCurrencyInput } from '../../lib/currency';

interface BalanceProps {
  accounts: Account[];
  transactions: Transaction[];
  onUpdateInitialBalance: (accountId: string, value: number) => void;
}

function accountInitials(name: string): string {
  return name.slice(0, 2).toUpperCase() || '?';
}

export function Balance({ accounts, transactions, onUpdateInitialBalance }: BalanceProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [saveError, setSaveError] = useState('');

  const total = calculateTotalBalance(accounts, transactions);

  function startEditing(account: Account) {
    setEditingId(account.id);
    setValue(String(account.initial_balance));
    setSaveError('');
  }

  function handleSave(accountId: string) {
    const parsed = parseCurrencyInput(value);
    if (parsed === null) {
      setSaveError('Valor inválido');
      return;
    }
    setSaveError('');
    onUpdateInitialBalance(accountId, parsed);
    setEditingId(null);
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-1">Saldo atual</h2>
      <span className="font-display text-3xl font-semibold text-app-text mb-3">{formatCurrency(total)}</span>

      <div className="flex flex-col gap-0.5">
        {accounts.map((account) => (
          <div key={account.id} className="flex flex-col gap-1 py-1.5">
            {editingId === account.id ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(account.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
                  />
                  <button
                    onClick={() => handleSave(account.id)}
                    className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold"
                  >
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
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `RecentTransactions.tsx`**

Replace the entire contents of `src/features/finance/RecentTransactions.tsx` with:

```tsx
import type { Account, Category, Transaction } from '../../types';
import { formatCurrency } from '../../lib/currency';
import { formatRelativeDate } from '../../lib/relativeDate';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export function RecentTransactions({ transactions, categories, accounts }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 8);

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
      <div className="flex flex-col">
        {recent.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 py-2.5 px-1.5 -mx-1.5 border-b border-surface-2 last:border-none"
          >
            <div className="min-w-0">
              <p className="text-sm text-app-text truncate">{t.description || 'Sem descrição'}</p>
              <p className="font-mono text-[0.65rem] text-app-muted-2">
                {categoryName(t.category_id)} · {accountName(t.account_id)} · {formatRelativeDate(t.date)}
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

- [ ] **Step 4: Rewrite `AddTransactionModal.tsx`**

Replace the entire contents of `src/features/finance/AddTransactionModal.tsx` with:

```tsx
import { useState } from 'react';
import type { Account, Category } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { parseCurrencyInput } from '../../lib/currency';

interface AddTransactionModalProps {
  categories: Category[];
  accounts: Account[];
  onCancel: () => void;
  onSave: (input: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
    accountId: string;
  }) => void;
}

export function AddTransactionModal({ categories, accounts, onCancel, onSave }: AddTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [amountError, setAmountError] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleSubmit() {
    const parsed = parseCurrencyInput(amount);
    if (parsed === null || parsed <= 0) {
      setAmountError('Valor inválido');
      return;
    }
    if (!description.trim()) return;
    if (!accountId) return;
    setAmountError('');
    onSave({ type, amount: parsed, description: description.trim(), date, categoryId: categoryId || null, accountId });
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
            onClick={() => {
              setType('expense');
              setCategoryId('');
            }}
            className={`flex-1 font-mono text-xs px-3 py-2 rounded ${type === 'expense' ? 'bg-danger text-app-bg font-semibold' : 'bg-surface-2 text-app-muted'}`}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              setCategoryId('');
            }}
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
        {amountError && <p className="text-xs text-danger">{amountError}</p>}

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

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
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

- [ ] **Step 5: Remove the now-dead single-account functions from `financeApi.ts`**

Delete the `getOrCreateDefaultAccount` function, the `getAccountTransactions` function, and the `DEFAULT_ACCOUNT_NAME` constant from `src/features/finance/financeApi.ts` — nothing calls them anymore after Steps 1-4. Leave everything else in that file untouched (`DEFAULT_CATEGORIES`, `ensureDefaultCategories`, `updateAccountInitialBalance`, `createTransaction`, `calculateMonthSummary`, and everything added in Task 1).

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors. This confirms all five files agree on the new prop shapes and that no dead references to the removed functions remain.

- [ ] **Step 7: Commit**

```bash
git add src/pages/FinancePage.tsx src/features/finance/Balance.tsx src/features/finance/RecentTransactions.tsx src/features/finance/AddTransactionModal.tsx src/features/finance/financeApi.ts
git commit -m "feat: support multiple accounts across the finance dashboard"
```

---

### Task 4: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full type-check and build**

Run: `npm run build`
Expected: completes with no TypeScript errors, produces `dist/`.

- [ ] **Step 2: Browser walkthrough with a disposable account**

Per this project's data-safety convention, create a disposable test account (real-looking email domain — `@example.com` is rejected by this Supabase project's auth; confirm via SQL with `update auth.users set email_confirmed_at = now() where email = '<test-email>'` if normal signup email-sending is unavailable, a known intermittent issue on this project). Then, in the browser:

1. Log in with the fresh test account, navigate to "Finanças".
   Expected: since this account has zero accounts, the blocking "Nomeie sua conta" modal appears instead of the dashboard — confirming the first-access flow works and doesn't leak into accounts that already have data.
2. Fill "Nome da conta" with `Conta Teste`, "Saldo inicial" with `500`, click "Criar conta".
   Expected: the modal closes and the dashboard renders. "Saldo atual" shows `R$ 500,00` total, with one row below for "Conta Teste" also showing `R$ 500,00`.
3. Click "+ Adicionar movimentação". Confirm the account `<select>` shows "Conta Teste" pre-selected (only option). Add an expense: "Mercado", `50`, categoria "Alimentação", conta "Conta Teste".
   Expected: "Saldo atual" total drops to `R$ 450,00`; the per-account row for "Conta Teste" also shows `R$ 450,00`; the transaction appears in "Últimas movimentações" with `- R$ 50,00` and shows "Conta Teste" in its meta line.
4. Add an income: "Presente", `100`, categoria "Presente", conta "Conta Teste".
   Expected: total and per-account balance both become `R$ 550,00` (500 − 50 + 100); "Resumo do mês" shows Entradas `R$ 100,00` / Gastos `R$ 50,00`.
5. Reload the page.
   Expected: all values persist identically (confirms data is read from Supabase, not local-only state), and the "Nomeie sua conta" modal does NOT reappear (since the account now exists).
6. Delete the disposable test account and all its rows from Supabase (accounts, categories, transactions, `auth.identities`, `auth.users`) once verification is done, and verify the counts are `0` afterward.

- [ ] **Step 3: Confirm no RLS regressions**

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new warnings referencing `accounts`, `categories`, or `transactions`.

- [ ] **Step 4: Report completion**

Summarize to Arthur: what was built, that it's on the same open PR branch as the rest of the finance feature, and that his real account (`arthur@organizador.local`) already has exactly one account ("Nubank" or whatever it's currently named) — so he should NOT see the "Nomeie sua conta" modal when he opens Finanças, just the dashboard with the new total-balance-plus-account-list layout in the "Saldo atual" card, and an account selector in "+ Adicionar movimentação" that only shows his one existing account.
