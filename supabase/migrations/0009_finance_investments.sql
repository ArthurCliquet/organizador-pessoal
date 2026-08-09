alter table accounts add column is_investment boolean not null default false;
alter table accounts add column value_adjustment numeric not null default 0;

alter table transactions add column to_account_id uuid references accounts(id) on delete cascade;

alter table transactions drop constraint transactions_type_check;
alter table transactions add constraint transactions_type_check check (type in ('income', 'expense', 'transfer'));

alter table transactions add constraint transactions_transfer_shape_check check (
  (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
  or (type <> 'transfer' and to_account_id is null)
);
