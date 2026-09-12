-- Performance: evita reavaliação de auth.uid() por linha nas policies RLS
-- e adiciona índices que faltam em foreign keys (apontado pelos advisors do Supabase).

drop policy "folders_owner" on folders;
create policy "folders_owner" on folders for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "notes_owner" on notes;
create policy "notes_owner" on notes for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "habits_owner" on habits;
create policy "habits_owner" on habits for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "tasks_owner" on tasks;
create policy "tasks_owner" on tasks for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "habit_logs_owner" on habit_logs;
create policy "habit_logs_owner" on habit_logs for all
  using (exists (select 1 from habits where habits.id = habit_logs.habit_id and habits.user_id = (select auth.uid())))
  with check (exists (select 1 from habits where habits.id = habit_logs.habit_id and habits.user_id = (select auth.uid())));

drop policy "recurring_tasks_owner" on recurring_tasks;
create policy "recurring_tasks_owner" on recurring_tasks for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "recurring_task_logs_owner" on recurring_task_logs;
create policy "recurring_task_logs_owner" on recurring_task_logs for all
  using (exists (select 1 from recurring_tasks where recurring_tasks.id = recurring_task_logs.recurring_task_id and recurring_tasks.user_id = (select auth.uid())))
  with check (exists (select 1 from recurring_tasks where recurring_tasks.id = recurring_task_logs.recurring_task_id and recurring_tasks.user_id = (select auth.uid())));

drop policy "accounts_owner" on accounts;
create policy "accounts_owner" on accounts for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "categories_owner" on categories;
create policy "categories_owner" on categories for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "transactions_owner" on transactions;
create policy "transactions_owner" on transactions for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "category_limits_owner" on category_limits;
create policy "category_limits_owner" on category_limits for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Índices para foreign keys sem cobertura
create index if not exists category_limits_category_id_idx on category_limits(category_id);
create index if not exists folders_user_id_idx on folders(user_id);
create index if not exists habits_user_id_idx on habits(user_id);
create index if not exists recurring_tasks_user_id_idx on recurring_tasks(user_id);
create index if not exists transactions_account_id_idx on transactions(account_id);
create index if not exists transactions_to_account_id_idx on transactions(to_account_id);
