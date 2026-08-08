# Controle Financeiro — Categorias de Movimentações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the finance feature's default-category seed list with Arthur's real categories (10 expense, 5 income), and clean up the stale old-category rows already bootstrapped into his real account, with no schema or UI changes.

**Architecture:** One-line data change — `DEFAULT_CATEGORIES` in `src/features/finance/financeApi.ts` already drives category seeding, and `AddTransactionModal.tsx` already filters categories by `type`. No new code paths are needed; this plan only replaces the seed data and reconciles the one real account that already bootstrapped the old list.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (Postgres + RLS + supabase-js).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-08-controle-financeiro-categorias-design.md` — implement exactly what it describes; do not build a category management screen or touch any other finance functionality (balance, month summary, transaction list, add-transaction flow beyond category filtering, which already works).
- All app code changes happen in the `main`-tracking worktree at `.claude/worktrees/organizador-pessoal` (branch `worktree-organizador-pessoal`) — **not** the `master` checkout at the repo root. This branch already has an open PR (`worktree-organizador-pessoal` → `main`) from the prior finance-dashboard plan; this work continues on the same branch, not a new one.
- This project has **no automated test suite** — verification is `npx tsc -b` (type-check) plus a manual dev-server/browser check.
- Supabase project id: `bjbszgblaqtcbvihgxqu`.
- No schema/migration changes are needed for this plan — the `categories` table (and its `unique(user_id, name, type)` constraint from migration `0007`) already supports everything this plan requires.
- UI copy is Portuguese (pt-BR), matching the rest of the app.

---

### Task 1: Replace default categories and reconcile Arthur's real account

**Files:**
- Modify: `src/features/finance/financeApi.ts` (the `DEFAULT_CATEGORIES` constant only)

**Interfaces:**
- Consumes: `Category` type (`src/types/index.ts`, unchanged) — `DEFAULT_CATEGORIES: { name: string; type: Category['type'] }[]`.
- Produces: nothing new — `ensureDefaultCategories()` (unchanged, already exported) will seed this new list for any user with zero categories, exactly as it already does for the old list.

- [ ] **Step 1: Replace the `DEFAULT_CATEGORIES` constant**

In `src/features/finance/financeApi.ts`, replace the existing `DEFAULT_CATEGORIES` array:

```typescript
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
```

with:

```typescript
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
```

Do not change anything else in this file — `ensureDefaultCategories()`, `getOrCreateDefaultAccount()`, and every other function are already correct and untouched by this plan.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Clean up the stale old categories on Arthur's real account**

Arthur's real account (`arthur@organizador.local`) already bootstrapped the *old* 8-category list from earlier testing, with zero transactions referencing any of them (confirmed safe to delete). Since `ensureDefaultCategories()` only seeds when a user has zero categories, deleting these old rows is what makes the new list actually appear for him.

Using the `mcp__supabase__execute_sql` tool against project `bjbszgblaqtcbvihgxqu`, first confirm there are still zero transactions for that user (safety check before deleting):

```sql
select count(*) from transactions t
join auth.users u on u.id = t.user_id
where u.email = 'arthur@organizador.local';
```

Expected: `0`. If this is not `0`, STOP and report back — do not delete categories that transactions might reference.

Then delete the old category rows for that user:

```sql
delete from categories
where user_id = (select id from auth.users where email = 'arthur@organizador.local');
```

Then verify zero categories remain for that user:

```sql
select count(*) from categories c
join auth.users u on u.id = c.user_id
where u.email = 'arthur@organizador.local';
```

Expected: `0`. This means the next time Arthur (or you, verifying) opens `/financas` while logged in as him, `ensureDefaultCategories()` will see zero existing categories and seed the new 15-item list from Step 1.

- [ ] **Step 4: Manual verification**

Run `npm run dev` from `C:/Users/Arthur/Desktop/cinema/.claude/worktrees/organizador-pessoal`, open the printed URL, and log in as `arthur@organizador.local` (Arthur knows this password; if you're a subagent without it, report back and ask rather than guessing or resetting it).

1. Navigate to "Finanças". The bootstrap should silently create the new 15 categories (no visible change on this page — categories aren't displayed here directly).
2. Click "+ Adicionar movimentação".
3. With "Saída" selected (the default), open the categoria dropdown.
   Expected: exactly 10 options, in this order: Alimentação, Transporte, Lazer, Compras, Educação, Saúde, Casa, Assinaturas, Roupas, Outros (plus the always-present "Sem categoria" placeholder option).
4. Fill description "Mercado", valor `50`, categoria "Alimentação", and save.
   Expected: modal closes, the new transaction appears in "Últimas movimentações" with category "Alimentação".
5. Click "+ Adicionar movimentação" again, click "Entrada".
   Expected: the categoria dropdown now shows exactly 5 options: Salário, Presente, Mesada, Investimentos, Outros.
6. Fill description "Presente aniversário", valor `100`, categoria "Presente", and save.
   Expected: modal closes, the new transaction appears in "Últimas movimentações" with category "Presente", and "Saldo atual" reflects both transactions (100 − 50 = net +50 from these two).

If you cannot obtain Arthur's real password to log in, perform this same walkthrough with a disposable test account instead (per this project's established data-safety convention — see any earlier finance-plan verification task for the exact technique: create via SQL if signup email-sending is unavailable, confirm `email_confirmed_at`, and delete the account and all its rows afterward). A disposable-account walkthrough only proves the *code* is correct — note in your report that Arthur should still personally confirm the categoria list on his real account before considering this fully verified, since the point of Step 3 was specifically to fix *his* account's data.

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/financeApi.ts
git commit -m "feat: replace default finance categories with real category list"
```
