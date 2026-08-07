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
