# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout — read this first

This checkout (`master` branch) is a **planning-only branch**. It contains nothing but `docs/superpowers/specs/` and `docs/superpowers/plans/` markdown produced by the Superpowers brainstorming/planning workflow — there is no `src/`, `package.json`, or app code here, and that's expected, not a broken checkout.

The actual application ("Organizador Pessoal") lives on other branches:

- **`main`** — the deployed app source (React/Vite/TS + Supabase), merged and shippable.
- **`worktree-organizador-pessoal`** — the active feature branch, checked out as a git worktree at `.claude/worktrees/organizador-pessoal/`. This is where implementation work actually happens.

Run `git worktree list` to confirm current worktrees. When asked to implement a feature (as opposed to writing a spec/plan), `cd` into `.claude/worktrees/organizador-pessoal/` (or create/switch to the appropriate worktree per [[superpowers:using-git-worktrees]]) rather than expecting app code at repo root.

## Workflow convention used in this repo

Feature work follows the Superpowers brainstorm → spec → plan → implement cycle:

1. Design spec: `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`
2. Implementation plan: `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`
3. Implementation happens in a worktree on a feature branch, then merges into `main` via PR.

Multi-part features are split into sub-specs/sub-plans with a shared date + feature prefix, e.g. `2026-08-08-controle-financeiro.md` (dashboard) plus `2026-08-08-controle-financeiro-categorias.md`, `-contas.md`, `-limites.md` for its sub-features. Follow this naming pattern for new specs/plans.

All UI copy, spec/plan prose, and commit messages in this project are written in Brazilian Portuguese (pt-BR).

## The app (in the worktree / `main`)

"Organizador Pessoal" — a personal-use, single-user web app with four areas: Dashboard, Notas (notes), Calendário (tasks + daily habits), and Finanças (accounts, transactions, categories, monthly limits, investments).

**Stack**: React 19 + Vite 6 + TypeScript, React Router, Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first `@theme` config), Supabase (Postgres + Auth) as the only backend — the client talks to Supabase directly via `supabase-js`, no intermediate API server. TipTap for the notes rich-text editor. Deployed to Vercel (`vercel.json` has the SPA rewrite for client-side routing).

### Commands (run from inside the app checkout)

- `npm install`
- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build` (type-checks before bundling)
- `npm run preview` — preview the production build
- No lint script and no automated test suite are configured; this is an intentional scope decision for a personal-use app (see README "Testes"). Validate changes manually.

Env vars come from `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); see `.env.local.example`.

### Architecture

- `src/pages/` — one component per route (`DashboardPage`, `NotesPage`, `CalendarPage`, `FinancePage`, `LoginPage`), wired in `src/App.tsx`.
- `src/features/<domain>/` — feature-scoped components plus a `<domain>Api.ts` file (e.g. `financeApi.ts`, `habitsApi.ts`, `notesApi.ts`, `recurringTasksApi.ts`) that wraps the corresponding `supabase-js` calls. This is the data-access layer — there's no separate service/repository abstraction, API files call `supabase.from(...)` directly.
- `src/components/layout/` — `AppLayout`, `Sidebar` (desktop), `BottomNav` (mobile); `src/components/common/` — shared primitives (Card, ConfirmDialog, HabitRing, Spinner, TaskCheck).
- `src/contexts/` — `AuthContext` (Supabase session/auth state), `ToastContext` (error/success toasts used instead of inline error UI in most flows).
- Routing: `ProtectedRoute` gates everything except `/login`; unauthenticated users are redirected there.
- `supabase/migrations/*.sql` — sequentially numbered, additive migrations (`0001`...`0009`+). Every table has RLS enabled with owner-scoped policies keyed on `auth.uid()` (directly via `user_id`, or transitively through a parent table for child rows like `habit_logs`). Follow this pattern — new tables need RLS policies in the same migration that creates them.

### Design system

Single fixed dark theme (no light mode), defined as Tailwind v4 tokens in `src/index.css`'s `@theme` block: navy background (`--color-app-bg: #131826`), baby-blue primary accent (`--color-primary: #a9d3f2`), green success / red danger accents. Display font is Fraunces (serif), UI/mono font is IBM Plex Mono. Match these tokens rather than hardcoding new colors when building UI.

### Known pending item

The Supabase project has "Confirm email" enabled, so new signups require clicking an email confirmation link before first login works. Disabling it (Authentication > Sign In / Providers > Email in the Supabase dashboard) is a manual dashboard change, not a code change.
