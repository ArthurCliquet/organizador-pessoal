create table category_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index category_limits_user_idx on category_limits(user_id);

alter table category_limits enable row level security;

create policy "category_limits_owner" on category_limits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
