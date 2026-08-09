# Controle Financeiro — Editar Contas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Editar contas" modal to the finance dashboard where the user can rename any account inline, and delete an account — but only when it's empty (no transaction references it and its balance is zero).

**Architecture:** No schema changes — `accounts.name` is already unique per user and deletion already cascades correctly in the database from prior migrations. This is purely application code: two new data-layer functions plus one pure helper in `financeApi.ts`, one new self-contained modal component, and a small wiring change in `FinancePage.tsx` (new button, two handlers, conditional render). No other file changes.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + supabase-js).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-controle-financeiro-editar-contas-design.md` — implement exactly what it describes. Do not build a way to move/reassign transactions between accounts before deleting, batch delete, or any change to the database's cascade-delete behavior.
- All app code changes happen in the `main`-tracking worktree at `.claude/worktrees/organizador-pessoal` (branch `worktree-organizador-pessoal`) — **not** the `master` checkout at the repo root.
- No automated test suite in this project — verification is `npx tsc -b` per task, plus a manual dev-server/browser walkthrough on the final task.
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` enabled.
- Supabase project id: `bjbszgblaqtcbvihgxqu`.
- UI copy is Portuguese (pt-BR), matching the rest of the app.
- An account is "empty" (deletable) when: no transaction references it as either `account_id` or `to_account_id`, **and** `calculateBalance(account, transactions) === 0`. This single rule covers a normal account with a nonzero initial balance and an investment account funded only by a manual "valor atual" edit (no transfer) — both must stay non-deletable.
- It is allowed to delete the last remaining account (even if empty) — this returns the user to the first-access "nomeie sua conta" screen, and that's accepted behavior, not a bug to guard against.
- Renaming reuses the exact duplicate-name handling already used by account creation: a Postgres `23505` error means "Você já tem uma conta com esse nome."

---

### Task 1: Data layer — rename, delete, and the "is empty" check

**Files:**
- Modify: `src/features/finance/financeApi.ts`

**Interfaces:**
- Consumes: `Account`, `Transaction` types (unchanged); `supabase` client (unchanged).
- Produces:
  - `updateAccountName(id: string, name: string): Promise<void>`
  - `deleteAccount(id: string): Promise<void>`
  - `isAccountEmpty(account: Account, transactions: Transaction[]): boolean`
  All consumed by Task 2 (`isAccountEmpty`) and Task 3 (`updateAccountName`, `deleteAccount`).

- [ ] **Step 1: Add `updateAccountName` and `deleteAccount`**

In `src/features/finance/financeApi.ts`, find this existing function:

```typescript
export async function updateInvestmentValue(accountId: string, currentValue: number, contributedTotal: number): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ value_adjustment: currentValue - contributedTotal })
    .eq('id', accountId);
  if (error) throw error;
}
```

Add these two functions immediately after it:

```typescript

export async function updateAccountName(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('accounts').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Add `isAccountEmpty`**

Find this existing function:

```typescript
export function calculateBalance(account: Account, transactions: Transaction[]): number {
  const adjustment = account.is_investment ? Number(account.value_adjustment) : 0;
  return calculateContributedTotal(account, transactions) + adjustment;
}
```

Add this function immediately after it:

```typescript

export function isAccountEmpty(account: Account, transactions: Transaction[]): boolean {
  const hasTransaction = transactions.some((t) => t.account_id === account.id || t.to_account_id === account.id);
  return !hasTransaction && calculateBalance(account, transactions) === 0;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/financeApi.ts
git commit -m "feat: add account rename, delete, and empty-account check"
```

---

### Task 2: `ManageAccountsModal` component

**Files:**
- Create: `src/features/finance/ManageAccountsModal.tsx`

**Interfaces:**
- Consumes: `Account`, `Transaction` types; `isAccountEmpty` (Task 1).
- Produces: `ManageAccountsModal` component with props `{ accounts: Account[]; transactions: Transaction[]; onRename: (accountId: string, name: string) => void; onDelete: (accountId: string) => void; onCancel: () => void }`. Not reachable from any route yet — wired into `FinancePage.tsx` in Task 3.

- [ ] **Step 1: Write `ManageAccountsModal.tsx`**

```tsx
import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { isAccountEmpty } from './financeApi';

interface ManageAccountsModalProps {
  accounts: Account[];
  transactions: Transaction[];
  onRename: (accountId: string, name: string) => void;
  onDelete: (accountId: string) => void;
  onCancel: () => void;
}

export function ManageAccountsModal({ accounts, transactions, onRename, onDelete, onCancel }: ManageAccountsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function startEditing(account: Account) {
    setEditingId(account.id);
    setNameValue(account.name);
    setNameError('');
    setConfirmingId(null);
  }

  function handleSaveName(accountId: string) {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError('Informe um nome para a conta');
      return;
    }
    setNameError('');
    onRename(accountId, trimmed);
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Editar contas</h3>

        <div className="flex flex-col gap-3">
          {accounts.map((account) => {
            const empty = isAccountEmpty(account, transactions);
            return (
              <div key={account.id} className="flex flex-col gap-1.5 pb-3 border-b border-surface-2 last:border-none last:pb-0">
                {editingId === account.id ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(account.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
                      />
                      <button
                        onClick={() => handleSaveName(account.id)}
                        className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setNameError('');
                          setEditingId(null);
                        }}
                        className="font-mono text-xs px-3 py-1.5 rounded text-app-muted hover:text-app-text"
                      >
                        Cancelar
                      </button>
                    </div>
                    {nameError && <p className="text-xs text-danger">{nameError}</p>}
                  </div>
                ) : confirmingId === account.id ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Excluir "{account.name}"?</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onDelete(account.id);
                          setConfirmingId(null);
                        }}
                        className="font-mono text-xs px-3 py-1.5 rounded bg-danger text-app-bg font-semibold"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="font-mono text-xs px-3 py-1.5 rounded text-app-muted hover:text-app-text"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => startEditing(account)}
                      className="text-sm text-left truncate hover:text-primary-bright transition-colors"
                    >
                      {account.name}
                    </button>
                    <button
                      onClick={() => empty && setConfirmingId(account.id)}
                      disabled={!empty}
                      title={empty ? undefined : 'Só é possível excluir contas sem movimentações e com saldo zero'}
                      className="text-app-muted hover:text-danger text-xs disabled:opacity-30 disabled:hover:text-app-muted disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-1">
          <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
            Fechar
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
git add src/features/finance/ManageAccountsModal.tsx
git commit -m "feat: add ManageAccountsModal component"
```

---

### Task 3: Wire "Editar contas" into `FinancePage`

**Files:**
- Modify: `src/pages/FinancePage.tsx`

**Interfaces:**
- Consumes: `updateAccountName`, `deleteAccount` (Task 1); `ManageAccountsModal` (Task 2).
- Produces: `FinancePage` renders a new "Editar contas" button and, when clicked, `ManageAccountsModal`. No prop-shape changes to any other component — this task touches only this one file.

- [ ] **Step 1: Add the two new imports**

Change the `financeApi` import block from:

```typescript
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
```

to:

```typescript
import {
  getAccounts,
  createAccount,
  ensureDefaultCategories,
  getTransactions,
  updateAccountInitialBalance,
  updateAccountName,
  deleteAccount,
  createTransaction,
  createTransfer,
  updateInvestmentValue,
  calculateContributedTotal,
  getCategoryLimits,
  createCategoryLimit,
  updateCategoryLimit,
  deleteCategoryLimit,
} from '../features/finance/financeApi';
```

Add the component import right after the existing `TransferModal` import line (`import { TransferModal } from '../features/finance/TransferModal';`):

```typescript
import { ManageAccountsModal } from '../features/finance/ManageAccountsModal';
```

- [ ] **Step 2: Add the `manageAccountsOpen` state**

Change:

```typescript
  const [transferOpen, setTransferOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
```

to:

```typescript
  const [transferOpen, setTransferOpen] = useState(false);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
```

- [ ] **Step 3: Add the two new handlers**

Add these two functions right after `handleUpdateInitialBalance` (before `handleUpdateInvestmentValue`):

```typescript
  async function handleRenameAccount(accountId: string, name: string) {
    try {
      await updateAccountName(accountId, name);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, name } : a)));
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        showError('Você já tem uma conta com esse nome.');
      } else {
        showError('Não foi possível renomear a conta.');
      }
    }
  }

  async function handleDeleteAccount(accountId: string) {
    try {
      await deleteAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch {
      showError('Não foi possível excluir a conta.');
    }
  }
```

- [ ] **Step 4: Add the "Editar contas" button**

Change:

```tsx
          <button
            onClick={() => setNewAccountOpen(true)}
            className="font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
          >
            + Nova conta
          </button>
```

to:

```tsx
          <button
            onClick={() => setNewAccountOpen(true)}
            className="font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
          >
            + Nova conta
          </button>
          <button
            onClick={() => setManageAccountsOpen(true)}
            className="font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
          >
            Editar contas
          </button>
```

- [ ] **Step 5: Render the modal**

Change:

```tsx
      {transferOpen && <TransferModal accounts={accounts} onCancel={() => setTransferOpen(false)} onSave={handleCreateTransfer} />}
    </div>
  );
}
```

to:

```tsx
      {transferOpen && <TransferModal accounts={accounts} onCancel={() => setTransferOpen(false)} onSave={handleCreateTransfer} />}

      {manageAccountsOpen && (
        <ManageAccountsModal
          accounts={accounts}
          transactions={transactions}
          onRename={handleRenameAccount}
          onDelete={handleDeleteAccount}
          onCancel={() => setManageAccountsOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/FinancePage.tsx
git commit -m "feat: wire Editar contas into the finance dashboard"
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

1. Log in, create the first account via the bootstrap modal: name "Conta A", saldo inicial `100`.
2. Click "+ Nova conta", create "Conta B" (normal, saldo inicial `0`) and "Conta Invest" (marcada como investimento).
   Expected: three accounts now exist.
3. On "Conta Invest" (in the "Investido" section of the saldo card), click it and set the valor atual to `50` (funding it purely by manual edit, no transfer).
4. Click "Editar contas".
   Expected: modal lists all three accounts. "Conta A" (has a nonzero initial balance) and "Conta Invest" (has `value_adjustment = 50`, no transaction) both show a **disabled** ✕ with a tooltip explaining why. "Conta B" (truly empty — zero balance, no transactions) shows an **enabled** ✕.
5. Click the name "Conta B", rename it to "Conta B Renomeada", save.
   Expected: modal updates immediately; closing the modal and checking the saldo card / "+ Adicionar movimentação" account selector confirms the new name shows up everywhere.
6. Try renaming "Conta B Renomeada" to "Conta A" (an existing name).
   Expected: inline error "Você já tem uma conta com esse nome."; the rename does not happen.
7. Click the ✕ on "Conta B Renomeada" (still empty).
   Expected: row switches to "Excluir "Conta B Renomeada"?" with Confirmar/Cancelar. Click Confirmar.
   Expected: the account disappears from the modal and from the rest of the dashboard (saldo card, account selectors).
8. Transfer `10` from "Conta A" to "Conta Invest" (Transferir button). Reopen "Editar contas".
   Expected: "Conta A"'s ✕ is still disabled (now also has a transaction, in addition to its nonzero initial balance) — same as before, no change in disabled state, but confirms the transaction-based half of the "is empty" rule too by observing "Conta Invest" was already disabled and stays disabled.
9. Reload the page.
   Expected: the rename and deletion from steps 5-7 persisted.
10. Delete the disposable test account and all its rows from Supabase (accounts, categories, transactions, category_limits, `auth.identities`, `auth.users`) once verification is done, and verify the counts are `0` afterward.

- [ ] **Step 3: Confirm no RLS regressions**

Use `mcp__supabase__get_advisors` with `project_id: "bjbszgblaqtcbvihgxqu"` and `type: "security"`.
Expected: no new warnings referencing `accounts`.

- [ ] **Step 4: Report completion**

Summarize to Arthur: what was built, that it's on the same branch as the rest of the finance feature, and that his real accounts should all show a disabled ✕ (since they all have transaction history) unless he creates a fresh test account within his own real data to see the enabled state.
