create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  initial_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  description text not null default '',
  date date not null,
  created_at timestamptz not null default now()
);

create index transactions_user_account_date_idx on transactions(user_id, account_id, date);
create index transactions_category_idx on transactions(category_id);

alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

create policy "accounts_owner" on accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_owner" on categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_owner" on transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
