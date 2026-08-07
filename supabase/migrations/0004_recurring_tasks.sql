create table recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  time time,
  weekdays smallint[] not null,
  created_at timestamptz not null default now()
);

create table recurring_task_logs (
  id uuid primary key default gen_random_uuid(),
  recurring_task_id uuid not null references recurring_tasks(id) on delete cascade,
  date date not null,
  done boolean not null default false,
  unique (recurring_task_id, date)
);

create index recurring_task_logs_task_date_idx on recurring_task_logs(recurring_task_id, date);

alter table recurring_tasks enable row level security;
alter table recurring_task_logs enable row level security;

create policy "recurring_tasks_owner" on recurring_tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recurring_task_logs_owner" on recurring_task_logs for all
  using (exists (select 1 from recurring_tasks where recurring_tasks.id = recurring_task_logs.recurring_task_id and recurring_tasks.user_id = auth.uid()))
  with check (exists (select 1 from recurring_tasks where recurring_tasks.id = recurring_task_logs.recurring_task_id and recurring_tasks.user_id = auth.uid()));
