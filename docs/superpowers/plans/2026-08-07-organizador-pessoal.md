# Organizador Pessoal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, dark-mode personal organization web app (Dashboard, Notes with folders, Calendar with tasks + daily habits) backed by Supabase auth and Postgres.

**Architecture:** React + TypeScript SPA (Vite) talking directly to Supabase via `supabase-js` (auth + Postgres, no custom backend). Client-side routing with `react-router-dom`, route guard reading auth state from a React context. Tailwind CSS v4 for styling with a fixed dark theme.

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind CSS v4, react-router-dom v6, @supabase/supabase-js v2, @tiptap/react (rich text editor), date-fns v3.

## Global Constraints

- Dark mode only — no light theme toggle. Fixed palette: background `#16171d`, surface `#1e1f28`, surface border `#2f3040`, primary accent `#7c5cff`, success/done accent `#4ade9a`, main text `#f0f0f5`, muted text `#9a9ab0`.
- Fully responsive: fixed sidebar navigation on desktop (`md:` breakpoint and up), bottom tab bar on mobile.
- Notes folders are single-level — no nested subfolders. A note may have no folder (`folder_id = null`, shown as "Sem pasta").
- Daily habits are a fixed, user-editable list (create/rename/delete). "Reset diário" is implicit: a new day has no `habit_logs` row yet, so it renders unchecked — no reset job needed.
- Tasks belong to one specific date, with an optional time. When a task has a time, the day's task list is sorted by it.
- No automated test suite this version. Every task's deliverable is verified by running `npm run build` (type-safety) and, for interactive tasks, driving the running app with the chrome-devtools MCP tools (navigate, click, screenshot) instead of a human clicking through it manually.
- No deployment this phase — the app runs locally via `npm run dev`.
- Row Level Security is mandatory on every table, scoped to `auth.uid() = user_id` (or, for `habit_logs`, to the owning habit's `user_id`).
- All UI copy is in Brazilian Portuguese (pt-BR).

---

### Task 1: Project Scaffold (Vite + React + TypeScript + Tailwind v4 dark theme)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/index.css`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `.env.local.example`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a running Vite dev server; global Tailwind theme utility classes available to every later task: `bg-app-bg`, `text-app-text`, `text-app-muted`, `bg-surface`, `border-surface-border`, `bg-primary`, `text-primary`, `bg-success`, `text-success`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "organizador-pessoal",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.48.0",
    "@tiptap/pm": "^2.10.0",
    "@tiptap/react": "^2.10.0",
    "@tiptap/starter-kit": "^2.10.0",
    "date-fns": "^3.6.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Organizador Pessoal</title>
  </head>
  <body class="bg-app-bg text-app-text">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/index.css`**

```css
@import "tailwindcss";

@theme {
  --color-app-bg: #16171d;
  --color-surface: #1e1f28;
  --color-surface-border: #2f3040;
  --color-primary: #7c5cff;
  --color-success: #4ade9a;
  --color-app-text: #f0f0f5;
  --color-app-muted: #9a9ab0;
}

body {
  min-height: 100vh;
}

.ProseMirror {
  outline: none;
}
.ProseMirror h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.75rem 0 0.5rem;
}
.ProseMirror ul {
  list-style: disc;
  padding-left: 1.25rem;
}
.ProseMirror ol {
  list-style: decimal;
  padding-left: 1.25rem;
}
.ProseMirror p {
  margin: 0.25rem 0;
}
```

- [ ] **Step 7: Create `src/App.tsx` (placeholder, replaced in Task 4)**

```tsx
export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <p className="text-app-text">Organizador Pessoal — setup ok</p>
    </div>
  );
}
```

- [ ] **Step 8: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: Create `.env.local.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 10: Install dependencies**

Run: `npm install`
Expected: completes with no errors, `node_modules/` and `package-lock.json` created.

- [ ] **Step 11: Verify build and dev server**

Run: `npm run build`
Expected: exits 0, produces `dist/`.

Run: `npm run dev` in the background (keep it running for later tasks).
Use the chrome-devtools MCP tools: open a new page, navigate to the printed local URL (e.g. `http://localhost:5173/`), take a screenshot.
Expected: a dark page (`#16171d` background) with the centered text "Organizador Pessoal — setup ok" in light text.

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/index.css src/App.tsx src/main.tsx .env.local.example
git commit -m "chore: scaffold Vite/React/TS app with Tailwind dark theme"
```

---

### Task 2: Supabase Project, Schema, and Client

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `src/lib/supabase.ts`
- Create: `src/types/index.ts`
- Create: `.env.local` (not committed — gitignored)

**Interfaces:**
- Consumes: nothing new.
- Produces: `supabase` client export from `src/lib/supabase.ts`; `Folder`, `Note`, `Habit`, `HabitLog`, `Task` types from `src/types/index.ts`; a live Supabase project with tables `folders`, `notes`, `habits`, `habit_logs`, `tasks`, all RLS-protected.

- [ ] **Step 1: Confirm project cost and create the Supabase project**

Call `mcp__supabase__get_cost` with `type: "project"`, `organization_id: "fqifqozvqbvlxlbjtxjo"`. Read the returned amount and recurrence.
Call `mcp__supabase__confirm_cost` with `type: "project"`, the `recurrence` and `amount` from the previous call — save the returned `confirm_cost_id`.
Call `mcp__supabase__create_project` with `name: "organizador-pessoal"`, `region: "sa-east-1"`, `organization_id: "fqifqozvqbvlxlbjtxjo"`, `confirm_cost_id: <id from previous step>` — save the returned project `id` as `PROJECT_ID`.

- [ ] **Step 2: Wait for the project to become active**

Call `mcp__supabase__get_project` with `project_id: PROJECT_ID` every ~20 seconds.
Expected: `status` eventually becomes `ACTIVE_HEALTHY` (usually within 2 minutes). Do not proceed until then.

- [ ] **Step 3: Create the migration file `supabase/migrations/0001_init.sql`**

```sql
create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  title text not null default '',
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  done boolean not null default false,
  unique (habit_id, date)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  time time,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index notes_user_folder_idx on notes(user_id, folder_id);
create index tasks_user_date_idx on tasks(user_id, date);
create index habit_logs_habit_date_idx on habit_logs(habit_id, date);

alter table folders enable row level security;
alter table notes enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table tasks enable row level security;

create policy "folders_owner" on folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes_owner" on notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habits_owner" on habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks_owner" on tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "habit_logs_owner" on habit_logs for all
  using (exists (select 1 from habits where habits.id = habit_logs.habit_id and habits.user_id = auth.uid()))
  with check (exists (select 1 from habits where habits.id = habit_logs.habit_id and habits.user_id = auth.uid()));
```

- [ ] **Step 4: Apply the migration**

Call `mcp__supabase__apply_migration` with `project_id: PROJECT_ID`, `name: "init_schema"`, `query: <contents of supabase/migrations/0001_init.sql>`.
Expected: no error returned.

- [ ] **Step 5: Verify the schema**

Call `mcp__supabase__list_tables` with `project_id: PROJECT_ID`, `schemas: ["public"]`, `verbose: true`.
Expected: exactly 5 tables — `folders`, `notes`, `habits`, `habit_logs`, `tasks` — each with the columns defined above and RLS enabled.

- [ ] **Step 6: Fetch connection details and write `.env.local`**

Call `mcp__supabase__get_project_url` with `project_id: PROJECT_ID` — save as `SUPABASE_URL`.
Call `mcp__supabase__get_publishable_keys` with `project_id: PROJECT_ID` — pick the key with `disabled` false or undefined, save as `SUPABASE_ANON_KEY`.

Create `.env.local`:

```
VITE_SUPABASE_URL=<SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
```

- [ ] **Step 7: Create `src/types/index.ts`**

```ts
export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  done: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  date: string;
  time: string | null;
  title: string;
  done: boolean;
}
```

- [ ] **Step 8: Create `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
```

- [ ] **Step 9: Verify the build still passes**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/0001_init.sql src/lib/supabase.ts src/types/index.ts
git commit -m "feat: add Supabase project schema, RLS policies, and client"
```

(`.env.local` stays untracked — already covered by `.gitignore`.)

---

### Task 3: Authentication (Context, Login/Signup Page, Route Guard)

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Create: `src/components/common/Spinner.tsx`
- Create: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts` (Task 2).
- Produces: `AuthProvider`, `useAuth()` returning `{ user: User | null, session: Session | null, loading: boolean, signIn(email, password), signUp(email, password), signOut() }` from `src/contexts/AuthContext.tsx`; `ProtectedRoute` component; `Spinner` component; `LoginPage` component.

- [ ] **Step 1: Create `src/components/common/Spinner.tsx`**

```tsx
export function Spinner() {
  return <div className="w-6 h-6 border-2 border-surface-border border-t-primary rounded-full animate-spin" />;
}
```

- [ ] **Step 2: Create `src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function translateError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (message.includes('Password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? translateError(error.message) : null };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? translateError(error.message) : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Create `src/components/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './common/Spinner';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app-bg">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

- [ ] **Step 4: Create `src/pages/LoginPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-surface-border rounded-xl p-6 flex flex-col gap-4">
        <h1 className="text-xl font-semibold text-app-text">{mode === 'signin' ? 'Entrar' : 'Criar conta'}</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="bg-app-bg border border-surface-border rounded-lg px-3 py-2 text-app-text outline-none focus:border-primary"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="bg-app-bg border border-surface-border rounded-lg px-3 py-2 text-app-text outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="text-sm text-app-muted hover:text-app-text"
        >
          {mode === 'signin' ? 'Não tem conta? Criar uma' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: exits 0. (Routing isn't wired yet — that's Task 4 — so this only checks the new files compile.)

- [ ] **Step 6: Commit**

```bash
git add src/contexts/AuthContext.tsx src/components/ProtectedRoute.tsx src/components/common/Spinner.tsx src/pages/LoginPage.tsx
git commit -m "feat: add Supabase auth context, login/signup page, and route guard"
```

---

### Task 4: App Layout, Navigation, Toasts, and Routing

**Files:**
- Create: `src/contexts/ToastContext.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/pages/DashboardPage.tsx` (placeholder, replaced in Task 8)
- Create: `src/pages/NotesPage.tsx` (placeholder, replaced in Task 5)
- Create: `src/pages/CalendarPage.tsx` (placeholder, replaced in Task 7)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `ProtectedRoute`, `LoginPage` (Task 3).
- Produces: `ToastProvider`, `useToast()` returning `{ showError(message: string) }` from `src/contexts/ToastContext.tsx`; `AppLayout` (renders `Sidebar` + `BottomNav` + header with logout + `<Outlet/>`); fully wired routes in `App.tsx` for `/`, `/notas`, `/calendario`, `/login`.

- [ ] **Step 1: Create `src/contexts/ToastContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastContextValue {
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showError = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="bg-surface border border-surface-border text-app-text px-4 py-2 rounded-lg shadow-lg text-sm">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

- [ ] **Step 2: Create `src/components/layout/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
];

export function Sidebar() {
  return (
    <nav className="hidden md:flex flex-col w-56 shrink-0 bg-surface border-r border-surface-border p-4 gap-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-app-muted hover:text-app-text'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Create `src/components/layout/BottomNav.tsx`**

```tsx
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
];

export function BottomNav() {
  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `flex-1 text-center py-3 text-sm font-medium ${isActive ? 'text-primary' : 'text-app-muted'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Create `src/components/layout/AppLayout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-app-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-surface-border">
          <span className="text-sm text-app-muted truncate">{user?.email}</span>
          <button onClick={signOut} className="text-sm text-app-muted hover:text-app-text">
            Sair
          </button>
        </header>
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 5: Create placeholder pages**

`src/pages/DashboardPage.tsx`:
```tsx
export function DashboardPage() {
  return <div className="p-6 text-app-text">Dashboard (em construção)</div>;
}
```

`src/pages/NotesPage.tsx`:
```tsx
export function NotesPage() {
  return <div className="p-6 text-app-text">Notas (em construção)</div>;
}
```

`src/pages/CalendarPage.tsx`:
```tsx
export function CalendarPage() {
  return <div className="p-6 text-app-text">Calendário (em construção)</div>;
}
```

- [ ] **Step 6: Replace `src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotesPage } from './pages/NotesPage';
import { CalendarPage } from './pages/CalendarPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/notas" element={<NotesPage />} />
                <Route path="/calendario" element={<CalendarPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 7: Verify end to end in the browser**

Run: `npm run build` — expected exit 0.

With `npm run dev` running, use the chrome-devtools MCP tools:
1. Navigate to `/` — expect redirect to `/login` (no session yet).
2. Fill the signup form with a throwaway e-mail (e.g. `teste+<timestamp>@example.com`) and a 6+ char password, submit in "Criar conta" mode.
3. Expected: redirected to `/` and the Dashboard placeholder renders inside the layout, with the sidebar (desktop) showing Dashboard/Notas/Calendário and the header showing the e-mail and a "Sair" button.
4. Resize the page to a mobile viewport (e.g. 390x844) and take a screenshot — expected: sidebar hidden, bottom nav with the 3 links visible instead.
5. Click "Sair" — expected: redirected to `/login`.

- [ ] **Step 8: Commit**

```bash
git add src/contexts/ToastContext.tsx src/components/layout src/pages/DashboardPage.tsx src/pages/NotesPage.tsx src/pages/CalendarPage.tsx src/App.tsx
git commit -m "feat: add responsive app layout, navigation, toasts, and routing"
```

---

### Task 5: Notes (Folders + Notes CRUD + Rich Text Editor + Search)

**Files:**
- Create: `src/features/notes/notesApi.ts`
- Create: `src/features/notes/FolderList.tsx`
- Create: `src/features/notes/NoteList.tsx`
- Create: `src/features/notes/NoteEditor.tsx`
- Modify: `src/pages/NotesPage.tsx`

**Interfaces:**
- Consumes: `supabase` and `Folder`/`Note` types (Task 2), `useToast()` (Task 4).
- Produces: `notesApi` functions `getFolders`, `createFolder`, `renameFolder`, `deleteFolder`, `getNotes(folderId)`, `searchNotes(query)`, `getRecentNotes(limit)`, `createNote`, `updateNote`, `deleteNote` — `getRecentNotes` is consumed by Task 8's Dashboard.

- [ ] **Step 1: Create `src/features/notes/notesApi.ts`**

```ts
import { supabase } from '../../lib/supabase';
import type { Folder, Note } from '../../types';

export async function getFolders(): Promise<Folder[]> {
  const { data, error } = await supabase.from('folders').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createFolder(name: string): Promise<Folder> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('folders')
    .insert({ name, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('folders').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}

export async function getNotes(folderId: string | null): Promise<Note[]> {
  const base = supabase.from('notes').select('*').order('updated_at', { ascending: false });
  const { data, error } = folderId === null ? await base.is('folder_id', null) : await base.eq('folder_id', folderId);
  if (error) throw error;
  return data;
}

export async function searchNotes(query: string): Promise<Note[]> {
  const escaped = query.replace(/[%,]/g, '');
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRecentNotes(limit: number): Promise<Note[]> {
  const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function createNote(folderId: string | null, title: string, content: string): Promise<Note> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('notes')
    .insert({ folder_id: folderId, title, content, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(id: string, fields: Partial<Pick<Note, 'title' | 'content' | 'folder_id'>>): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Create `src/features/notes/FolderList.tsx`**

```tsx
import { useState } from 'react';
import type { Folder } from '../../types';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderList({ folders, selectedFolderId, onSelect, onCreate, onRename, onDelete }: FolderListProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  return (
    <div className="w-48 shrink-0 border-r border-surface-border p-3 flex flex-col gap-1 overflow-y-auto">
      <button
        onClick={() => onSelect(null)}
        className={`text-left px-3 py-1.5 rounded-lg text-sm ${selectedFolderId === null ? 'bg-primary text-white' : 'text-app-muted hover:text-app-text'}`}
      >
        Sem pasta
      </button>
      {folders.map((folder) => (
        <div key={folder.id} className="group flex items-center gap-1">
          {editingId === folder.id ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => {
                if (editingName.trim()) onRename(folder.id, editingName.trim());
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
            />
          ) : (
            <button
              onClick={() => onSelect(folder.id)}
              onDoubleClick={() => {
                setEditingId(folder.id);
                setEditingName(folder.name);
              }}
              className={`flex-1 text-left px-3 py-1.5 rounded-lg text-sm truncate ${selectedFolderId === folder.id ? 'bg-primary text-white' : 'text-app-muted hover:text-app-text'}`}
            >
              {folder.name}
            </button>
          )}
          <button
            onClick={() => onDelete(folder.id)}
            className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 px-1 text-xs"
            title="Excluir pasta"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-1 mt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onCreate(newName.trim());
              setNewName('');
            }
          }}
          placeholder="Nova pasta"
          className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/notes/NoteList.tsx`**

```tsx
import type { Note } from '../../types';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function NoteList({ notes, selectedNoteId, onSelect, onCreate, onDelete }: NoteListProps) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <button onClick={onCreate} className="m-3 bg-primary text-white text-sm rounded-lg py-1.5 font-medium">
        + Nova nota
      </button>
      {notes.map((note) => (
        <div
          key={note.id}
          className={`group flex items-center gap-1 px-3 py-2 border-b border-surface-border cursor-pointer ${selectedNoteId === note.id ? 'bg-surface' : 'hover:bg-surface'}`}
          onClick={() => onSelect(note.id)}
        >
          <span className="flex-1 truncate text-sm text-app-text">{note.title || 'Sem título'}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs"
          >
            ✕
          </button>
        </div>
      ))}
      {notes.length === 0 && <p className="text-center text-app-muted text-sm mt-4">Nenhuma nota aqui</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/notes/NoteEditor.tsx`**

```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';

interface NoteEditorProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (fields: { title: string; content: string }) => void;
}

export function NoteEditor({ noteId, initialTitle, initialContent, onSave }: NoteEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: initialContent,
      onUpdate: () => scheduleSave(),
    },
    [noteId],
  );

  useEffect(() => {
    if (titleRef.current) titleRef.current.value = initialTitle;
  }, [noteId, initialTitle]);

  function scheduleSave() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onSave({
        title: titleRef.current?.value ?? '',
        content: editor?.getHTML() ?? '',
      });
    }, 800);
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <input
        ref={titleRef}
        defaultValue={initialTitle}
        onChange={scheduleSave}
        placeholder="Título"
        className="bg-transparent text-xl font-semibold text-app-text px-4 py-3 outline-none border-b border-surface-border"
      />
      <div className="flex gap-1 px-4 py-2 border-b border-surface-border">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Lista"
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="1,2,3"
        />
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto px-4 py-3 text-app-text" />
    </div>
  );
}

function ToolbarButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-sm ${active ? 'bg-primary text-white' : 'bg-surface text-app-muted hover:text-app-text'}`}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 5: Replace `src/pages/NotesPage.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { Folder, Note } from '../types';
import {
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
} from '../features/notes/notesApi';
import { FolderList } from '../features/notes/FolderList';
import { NoteList } from '../features/notes/NoteList';
import { NoteEditor } from '../features/notes/NoteEditor';
import { useToast } from '../contexts/ToastContext';

export function NotesPage() {
  const { showError } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadFolders = useCallback(async () => {
    try {
      setFolders(await getFolders());
    } catch {
      showError('Não foi possível carregar as pastas.');
    }
  }, [showError]);

  const loadNotes = useCallback(async () => {
    try {
      const result = query.trim() ? await searchNotes(query.trim()) : await getNotes(selectedFolderId);
      setNotes(result);
    } catch {
      showError('Não foi possível carregar as notas.');
    }
  }, [selectedFolderId, query, showError]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  async function handleCreateNote() {
    try {
      const note = await createNote(selectedFolderId, 'Nova nota', '');
      setNotes((prev) => [note, ...prev]);
      setSelectedNoteId(note.id);
    } catch {
      showError('Não foi possível criar a nota.');
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNoteId === id) setSelectedNoteId(null);
    } catch {
      showError('Não foi possível excluir a nota.');
    }
  }

  async function handleSaveNote(fields: { title: string; content: string }) {
    if (!selectedNoteId) return;
    try {
      await updateNote(selectedNoteId, fields);
      setNotes((prev) => prev.map((n) => (n.id === selectedNoteId ? { ...n, ...fields } : n)));
    } catch {
      showError('Não foi possível salvar a nota.');
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-57px)]">
      <FolderList
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelect={(id) => {
          setSelectedFolderId(id);
          setSelectedNoteId(null);
          setQuery('');
        }}
        onCreate={async (name) => {
          try {
            await createFolder(name);
            loadFolders();
          } catch {
            showError('Não foi possível criar a pasta.');
          }
        }}
        onRename={async (id, name) => {
          try {
            await renameFolder(id, name);
            loadFolders();
          } catch {
            showError('Não foi possível renomear a pasta.');
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteFolder(id);
            if (selectedFolderId === id) setSelectedFolderId(null);
            loadFolders();
          } catch {
            showError('Não foi possível excluir a pasta.');
          }
        }}
      />
      <div className="w-72 shrink-0 border-r border-surface-border flex flex-col">
        <div className="p-3 border-b border-surface-border">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar notas..."
            className="w-full bg-app-bg border border-surface-border rounded-lg px-3 py-1.5 text-sm text-app-text outline-none focus:border-primary"
          />
        </div>
        <NoteList notes={notes} selectedNoteId={selectedNoteId} onSelect={setSelectedNoteId} onCreate={handleCreateNote} onDelete={handleDeleteNote} />
      </div>
      <div className="flex-1 min-w-0">
        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            noteId={selectedNote.id}
            initialTitle={selectedNote.title}
            initialContent={selectedNote.content}
            onSave={handleSaveNote}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-app-muted text-sm">Selecione ou crie uma nota</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run build` — expected exit 0.

With `npm run dev` running and logged in, use the chrome-devtools MCP tools to navigate to `/notas`:
1. Create a folder named "Trabalho" — expected: appears in the folder sidebar.
2. Select "Trabalho", click "+ Nova nota" — expected: a new untitled note appears and opens in the editor.
3. Type a title and some body text, apply bold to part of it — expected: after ~1s the note list shows the new title (autosave).
4. Reload the page, reselect the folder and note — expected: title and formatted content persisted.
5. Type part of the title into the search box — expected: the note list filters to matching notes across all folders.
6. Delete the note and the folder — expected: both disappear from their lists.

- [ ] **Step 7: Commit**

```bash
git add src/features/notes src/pages/NotesPage.tsx
git commit -m "feat: add notes with folders, rich text editor, and search"
```

---

### Task 6: Daily Habits (CRUD + Reusable Checklist)

**Files:**
- Create: `src/features/habits/habitsApi.ts`
- Create: `src/features/habits/HabitChecklist.tsx`

**Interfaces:**
- Consumes: `supabase` and `Habit`/`HabitLog` types (Task 2), `useToast()` (Task 4).
- Produces: `habitsApi` functions `getHabits`, `createHabit`, `renameHabit`, `deleteHabit`, `getHabitLogsForDate(date)`, `toggleHabitLog(habitId, date, done)`; `<HabitChecklist date={string} />` component, consumed by both Task 7 (Calendar day panel) and Task 8 (Dashboard today card) so a habit toggled in one place is reflected in the other for the same date.

- [ ] **Step 1: Create `src/features/habits/habitsApi.ts`**

```ts
import { supabase } from '../../lib/supabase';
import type { Habit, HabitLog } from '../../types';

export async function getHabits(): Promise<Habit[]> {
  const { data, error } = await supabase.from('habits').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createHabit(name: string): Promise<Habit> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('habits').insert({ name, user_id: userData.user!.id }).select().single();
  if (error) throw error;
  return data;
}

export async function renameHabit(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('habits').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

export async function getHabitLogsForDate(date: string): Promise<HabitLog[]> {
  const { data, error } = await supabase.from('habit_logs').select('*').eq('date', date);
  if (error) throw error;
  return data;
}

export async function toggleHabitLog(habitId: string, date: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('habit_logs').upsert({ habit_id: habitId, date, done }, { onConflict: 'habit_id,date' });
  if (error) throw error;
}
```

- [ ] **Step 2: Create `src/features/habits/HabitChecklist.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { Habit, HabitLog } from '../../types';
import { getHabits, createHabit, renameHabit, deleteHabit, getHabitLogsForDate, toggleHabitLog } from './habitsApi';
import { useToast } from '../../contexts/ToastContext';

interface HabitChecklistProps {
  date: string;
}

export function HabitChecklist({ date }: HabitChecklistProps) {
  const { showError } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = useCallback(async () => {
    try {
      const [h, l] = await Promise.all([getHabits(), getHabitLogsForDate(date)]);
      setHabits(h);
      setLogs(l);
    } catch {
      showError('Não foi possível carregar os hábitos.');
    }
  }, [date, showError]);

  useEffect(() => {
    load();
  }, [load]);

  function isDone(habitId: string) {
    return logs.find((l) => l.habit_id === habitId)?.done ?? false;
  }

  async function handleToggle(habitId: string) {
    const done = !isDone(habitId);
    setLogs((prev) => {
      const existing = prev.find((l) => l.habit_id === habitId);
      if (existing) return prev.map((l) => (l.habit_id === habitId ? { ...l, done } : l));
      return [...prev, { id: `${habitId}-${date}`, habit_id: habitId, date, done }];
    });
    try {
      await toggleHabitLog(habitId, date, done);
    } catch {
      showError('Não foi possível salvar o hábito.');
      load();
    }
  }

  async function handleCreate() {
    if (!newHabitName.trim()) return;
    try {
      await createHabit(newHabitName.trim());
      setNewHabitName('');
      load();
    } catch {
      showError('Não foi possível criar o hábito.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHabit(id);
      load();
    } catch {
      showError('Não foi possível excluir o hábito.');
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {habits.map((habit) => (
        <div key={habit.id} className="group flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDone(habit.id)} onChange={() => handleToggle(habit.id)} className="accent-primary w-4 h-4" />
            {editingId === habit.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  if (editingName.trim()) renameHabit(habit.id, editingName.trim()).then(load);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="bg-app-bg border border-primary rounded px-1 text-sm text-app-text outline-none"
              />
            ) : (
              <span
                onDoubleClick={() => {
                  setEditingId(habit.id);
                  setEditingName(habit.name);
                }}
                className={`text-sm ${isDone(habit.id) ? 'text-app-muted line-through' : 'text-app-text'}`}
              >
                {habit.name}
              </span>
            )}
          </label>
          <button onClick={() => handleDelete(habit.id)} className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs">
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-1 mt-1">
        <input
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          placeholder="+ Novo hábito"
          className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify with a temporary harness**

`HabitChecklist` isn't mounted anywhere yet (that happens in Tasks 7 and 8). Temporarily render it to verify: edit `src/pages/CalendarPage.tsx` placeholder to `<div className="p-6"><HabitChecklist date="2026-08-07" /></div>` (import it), run `npm run build`, then use chrome-devtools MCP to navigate to `/calendario`:
1. Add a habit named "Beber água" — expected: appears with an unchecked checkbox.
2. Check it — expected: checkbox becomes checked and label gets a strikethrough.
3. Reload the page — expected: still checked (persisted via `habit_logs`).
4. Double-click the label, rename to "Beber 2L de água", press Enter — expected: name updates.
5. Delete the habit — expected: it disappears.

Revert `src/pages/CalendarPage.tsx` back to its Task 4 placeholder afterward — Task 7 will replace it for real.

- [ ] **Step 4: Commit**

```bash
git add src/features/habits
git commit -m "feat: add daily habits CRUD and reusable checklist component"
```

---

### Task 7: Calendar (Month Grid + Day Panel with Tasks and Habits)

**Files:**
- Create: `src/features/calendar/dateUtils.ts`
- Create: `src/features/tasks/tasksApi.ts`
- Create: `src/features/calendar/MonthGrid.tsx`
- Create: `src/features/calendar/DayPanel.tsx`
- Modify: `src/pages/CalendarPage.tsx`

**Interfaces:**
- Consumes: `supabase` and `Task` type (Task 2), `useToast()` (Task 4), `HabitChecklist` (Task 6).
- Produces: `tasksApi` functions `getTasksForDate`, `getTasksForRange`, `createTask`, `updateTask`, `toggleTask`, `deleteTask` (`updateTask` powers double-click-to-edit in `DayPanel`; `getTasksForDate`/`getTasksForRange`/`toggleTask` also consumed by Task 8's Dashboard); `dateUtils` functions `toISODate`, `getMonthGrid`, `formatMonthTitle` — `toISODate` consumed by Task 8.

- [ ] **Step 1: Create `src/features/calendar/dateUtils.ts`**

```ts
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

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

export function formatMonthTitle(year: number, month: number): string {
  return format(new Date(year, month, 1), 'MMMM yyyy', { locale: ptBR });
}
```

- [ ] **Step 2: Create `src/features/tasks/tasksApi.ts`**

```ts
import { supabase } from '../../lib/supabase';
import type { Task } from '../../types';

export async function getTasksForDate(date: string): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').eq('date', date).order('time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function getTasksForRange(startDate: string, endDate: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createTask(date: string, title: string, time: string | null): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('tasks').insert({ date, title, time, user_id: userData.user!.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, fields: Partial<Pick<Task, 'title' | 'time' | 'date'>>): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('tasks').update({ done }).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 3: Create `src/features/calendar/MonthGrid.tsx`**

```tsx
import { toISODate, getMonthGrid, formatMonthTitle } from './dateUtils';
import type { Task } from '../../types';

interface MonthGridProps {
  year: number;
  month: number;
  tasksByDate: Record<string, Task[]>;
  onSelectDay: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MonthGrid({ year, month, tasksByDate, onSelectDay, onMonthChange }: MonthGridProps) {
  const days = getMonthGrid(year, month);
  const today = toISODate(new Date());

  function prevMonth() {
    onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  }
  function nextMonth() {
    onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-app-muted hover:text-app-text px-2">
          ‹
        </button>
        <h2 className="text-app-text font-semibold capitalize">{formatMonthTitle(year, month)}</h2>
        <button onClick={nextMonth} className="text-app-muted hover:text-app-text px-2">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-app-muted mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = toISODate(day);
          const inMonth = day.getMonth() === month;
          const hasTasks = (tasksByDate[iso]?.length ?? 0) > 0;
          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 hover:bg-surface ${
                inMonth ? 'text-app-text' : 'text-app-muted/40'
              } ${iso === today ? 'border border-primary' : ''}`}
            >
              <span>{day.getDate()}</span>
              {hasTasks && <span className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/calendar/DayPanel.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../../types';
import { getTasksForDate, createTask, updateTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { useToast } from '../../contexts/ToastContext';

interface DayPanelProps {
  date: string;
  onClose: () => void;
  onTasksChanged: () => void;
}

export function DayPanel({ date, onClose, onTasksChanged }: DayPanelProps) {
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTime, setEditingTime] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await getTasksForDate(date));
    } catch {
      showError('Não foi possível carregar as tarefas.');
    }
  }, [date, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createTask(date, title.trim(), time || null);
      setTitle('');
      setTime('');
      load();
      onTasksChanged();
    } catch {
      showError('Não foi possível criar a tarefa.');
    }
  }

  async function handleToggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    try {
      await toggleTask(task.id, !task.done);
    } catch {
      showError('Não foi possível atualizar a tarefa.');
      load();
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingTime(task.time ? task.time.slice(0, 5) : '');
  }

  async function commitEdit() {
    if (!editingId) return;
    const id = editingId;
    setEditingId(null);
    if (!editingTitle.trim()) return;
    try {
      await updateTask(id, { title: editingTitle.trim(), time: editingTime || null });
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={onClose}>
      <div className="bg-surface border border-surface-border rounded-xl w-full max-w-md p-5 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-app-text font-semibold">{date}</h3>
          <button onClick={onClose} className="text-app-muted hover:text-app-text">
            ✕
          </button>
        </div>

        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Tarefas do dia</h4>
          <div className="flex flex-col gap-1 mb-2">
            {tasks.map((task) => (
              <div key={task.id} className="group flex items-center gap-2">
                <input type="checkbox" checked={task.done} onChange={() => handleToggle(task)} className="accent-primary w-4 h-4" />
                {editingId === task.id ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="flex-1 bg-app-bg border border-primary rounded px-1 text-sm text-app-text outline-none"
                    />
                    <input
                      type="time"
                      value={editingTime}
                      onChange={(e) => setEditingTime(e.target.value)}
                      onBlur={commitEdit}
                      className="bg-app-bg border border-primary rounded px-1 text-xs text-app-text outline-none"
                    />
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => startEditing(task)}
                    className={`flex-1 text-sm ${task.done ? 'text-app-muted line-through' : 'text-app-text'}`}
                  >
                    {task.time ? `${task.time.slice(0, 5)} — ` : ''}
                    {task.title}
                  </span>
                )}
                <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs">
                  ✕
                </button>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa</p>}
          </div>
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
        </div>

        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Hábitos diários</h4>
          <HabitChecklist date={date} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/pages/CalendarPage.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../types';
import { getTasksForRange } from '../features/tasks/tasksApi';
import { getMonthGrid, toISODate } from '../features/calendar/dateUtils';
import { MonthGrid } from '../features/calendar/MonthGrid';
import { DayPanel } from '../features/calendar/DayPanel';
import { useToast } from '../contexts/ToastContext';

export function CalendarPage() {
  const { showError } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const days = getMonthGrid(year, month);
    const start = toISODate(days[0]);
    const end = toISODate(days[days.length - 1]);
    try {
      const tasks = await getTasksForRange(start, end);
      const grouped: Record<string, Task[]> = {};
      for (const task of tasks) {
        (grouped[task.date] ??= []).push(task);
      }
      setTasksByDate(grouped);
    } catch {
      showError('Não foi possível carregar as tarefas do mês.');
    }
  }, [year, month, showError]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <div>
      <MonthGrid year={year} month={month} tasksByDate={tasksByDate} onSelectDay={setSelectedDate} onMonthChange={(y, m) => { setYear(y); setMonth(m); }} />
      {selectedDate && <DayPanel date={selectedDate} onClose={() => setSelectedDate(null)} onTasksChanged={loadTasks} />}
    </div>
  );
}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run build` — expected exit 0.

With `npm run dev` running and logged in, use the chrome-devtools MCP tools to navigate to `/calendario`:
1. Expected: current month grid renders, today's cell has a visible border.
2. Click a future day — expected: the day panel opens with empty "Tarefas do dia" and the habit checklist (showing whatever habits exist from Task 6's testing, if not deleted).
3. Add a task with title "Reunião" and time `14:00`, press Enter — expected: task appears in the list prefixed with `14:00 —`.
4. Close the panel — expected: that day's cell now shows a small dot indicator.
5. Reopen the same day, check the task done, reopen the habit checklist and check a habit — expected: both persist after closing and reopening the panel.
6. Double-click the task's text — expected: it turns into an editable title + time input. Change the title to "Reunião com cliente" and the time to `15:30`, click elsewhere to blur — expected: the list now shows `15:30 — Reunião com cliente`.
7. Delete the task — expected: it disappears from the list and the day's dot indicator disappears after closing the panel.

- [ ] **Step 7: Commit**

```bash
git add src/features/calendar src/features/tasks src/pages/CalendarPage.tsx
git commit -m "feat: add calendar month grid and day panel with tasks and habits"
```

---

### Task 8: Dashboard (Today Card + Upcoming Agenda + Recent Notes)

**Files:**
- Create: `src/features/dashboard/TodayCard.tsx`
- Create: `src/features/dashboard/UpcomingAgenda.tsx`
- Create: `src/features/dashboard/RecentNotes.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `getTasksForDate`, `getTasksForRange`, `toggleTask` (Task 7's `tasksApi`), `toISODate` (Task 7's `dateUtils`), `HabitChecklist` (Task 6), `getRecentNotes` (Task 5's `notesApi`).
- Produces: final `DashboardPage`.

- [ ] **Step 1: Create `src/features/dashboard/TodayCard.tsx`**

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../../types';
import { getTasksForDate, toggleTask } from '../tasks/tasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

export function TodayCard() {
  const { showError } = useToast();
  const today = toISODate(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    try {
      setTasks(await getTasksForDate(today));
    } catch {
      showError('Não foi possível carregar as tarefas de hoje.');
    }
  }, [today, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    try {
      await toggleTask(task.id, !task.done);
    } catch {
      showError('Não foi possível atualizar a tarefa.');
      load();
    }
  }

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5">
      <h3 className="text-app-text font-semibold mb-3">Hoje</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Tarefas</h4>
          <div className="flex flex-col gap-1">
            {tasks.map((task) => (
              <label key={task.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={task.done} onChange={() => handleToggle(task)} className="accent-primary w-4 h-4" />
                <span className={`text-sm ${task.done ? 'text-app-muted line-through' : 'text-app-text'}`}>
                  {task.time ? `${task.time.slice(0, 5)} — ` : ''}
                  {task.title}
                </span>
              </label>
            ))}
            {tasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa hoje</p>}
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Hábitos</h4>
          <HabitChecklist date={today} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/features/dashboard/UpcomingAgenda.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays } from 'date-fns';
import type { Task } from '../../types';
import { getTasksForRange } from '../tasks/tasksApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

export function UpcomingAgenda() {
  const { showError } = useToast();
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const start = toISODate(addDays(new Date(), 1));
    const end = toISODate(addDays(new Date(), 3));
    getTasksForRange(start, end)
      .then((tasks) => {
        const grouped: Record<string, Task[]> = {};
        for (const task of tasks) (grouped[task.date] ??= []).push(task);
        setTasksByDate(grouped);
      })
      .catch(() => showError('Não foi possível carregar a agenda.'));
  }, [showError]);

  const dates = Object.keys(tasksByDate).sort();

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5">
      <h3 className="text-app-text font-semibold mb-3">Próximos dias</h3>
      {dates.length === 0 && <p className="text-sm text-app-muted">Nada agendado nos próximos dias</p>}
      <div className="flex flex-col gap-3">
        {dates.map((date) => (
          <div key={date}>
            <Link to="/calendario" className="text-xs uppercase text-app-muted hover:text-primary">
              {date}
            </Link>
            <div className="flex flex-col gap-0.5 mt-1">
              {tasksByDate[date].map((task) => (
                <span key={task.id} className="text-sm text-app-text">
                  {task.time ? `${task.time.slice(0, 5)} — ` : ''}
                  {task.title}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/dashboard/RecentNotes.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Note } from '../../types';
import { getRecentNotes } from '../notes/notesApi';
import { useToast } from '../../contexts/ToastContext';

export function RecentNotes() {
  const { showError } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    getRecentNotes(5)
      .then(setNotes)
      .catch(() => showError('Não foi possível carregar as notas recentes.'));
  }, [showError]);

  return (
    <div className="bg-surface border border-surface-border rounded-xl p-5">
      <h3 className="text-app-text font-semibold mb-3">Notas recentes</h3>
      {notes.length === 0 && <p className="text-sm text-app-muted">Nenhuma nota ainda</p>}
      <div className="flex flex-col gap-1">
        {notes.map((note) => (
          <Link key={note.id} to="/notas" className="text-sm text-app-text hover:text-primary truncate">
            {note.title || 'Sem título'}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/pages/DashboardPage.tsx`**

```tsx
import { TodayCard } from '../features/dashboard/TodayCard';
import { UpcomingAgenda } from '../features/dashboard/UpcomingAgenda';
import { RecentNotes } from '../features/dashboard/RecentNotes';

export function DashboardPage() {
  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-3xl mx-auto">
      <TodayCard />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UpcomingAgenda />
        <RecentNotes />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run build` — expected exit 0.

With `npm run dev` running and logged in, use the chrome-devtools MCP tools to navigate to `/`:
1. Expected: "Hoje" card with today's tasks/habits, "Próximos dias" and "Notas recentes" cards below.
2. From the Calendar page (Task 7), add a task for today — return to Dashboard — expected: it appears in the "Hoje" card, checkable there.
3. Check a habit inside the Dashboard's "Hoje" card, then go to `/calendario`, open today's day panel — expected: the same habit shows checked there too (same `date` key, shared `HabitChecklist`).
4. Add a task for 2 days from now via the Calendar — expected: it shows up under "Próximos dias" on the Dashboard, grouped under its date.
5. Edit a note's title in `/notas` — return to Dashboard — expected: "Notas recentes" reflects the updated title at the top (ordered by `updated_at`).

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard src/pages/DashboardPage.tsx
git commit -m "feat: add dashboard with today card, upcoming agenda, and recent notes"
```

---

### Task 9: README and Full End-to-End Pass

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the entire app built in Tasks 1-8.
- Produces: setup documentation; a verified, working app.

- [ ] **Step 1: Create `README.md`**

```markdown
# Organizador Pessoal

App pessoal de organização: dashboard, notas com pastas e calendário com tarefas e hábitos diários.

## Setup

1. `npm install`
2. Copie `.env.local.example` para `.env.local` e preencha com a URL e a anon key do seu projeto Supabase (Project Settings > API).
3. `npm run dev` e abra a URL impressa no terminal (geralmente `http://localhost:5173`).

## Build

`npm run build` gera a versão de produção em `dist/` (type-checks via `tsc -b` antes do build).

## Schema

O schema do banco está em `supabase/migrations/0001_init.sql`. Todas as tabelas têm Row Level Security restringindo cada usuário aos próprios dados.
```

- [ ] **Step 2: Full end-to-end manual pass**

With `npm run dev` running, use the chrome-devtools MCP tools to walk through, in order, on a fresh incognito-style page (clear cookies/local storage first, or use a new throwaway account):

1. Sign up with a new e-mail/password → redirected to `/`.
2. On Dashboard: confirm the three cards render without console errors (check with `list_console_messages`).
3. Go to `/notas`: create a folder, create a note inside it, format some text, confirm autosave, search for it, delete it, delete the folder.
4. Go to `/calendario`: add a habit, add a task with a time on today's date, toggle both, confirm the month dot indicator, navigate to next/previous month and back.
5. Go back to `/`: confirm today's task and habit show as done, confirm the note you didn't delete (create one more first) appears in "Notas recentes".
6. Resize to a mobile viewport (390x844): confirm bottom nav replaces the sidebar and all three pages remain usable (no horizontal scroll, day panel and note editor still fit).
7. Click "Sair": confirm redirect to `/login` and that navigating directly to `/` while logged out redirects back to `/login`.

Expected: no step produces a console error and no data is lost across reloads/navigation.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions"
```
