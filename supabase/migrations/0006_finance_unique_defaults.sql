-- Prevent duplicate default account/category rows from concurrent bootstrap calls.
-- getOrCreateDefaultAccount() and ensureDefaultCategories() do a non-atomic
-- select-then-insert; without a unique constraint, two near-simultaneous calls
-- (e.g. React StrictMode double-invoke, or two browser tabs) can both see zero
-- rows and both insert, producing duplicate "Nubank" accounts and duplicate
-- category rows for the same user. This constraint does not prevent a user
-- from having multiple differently-named accounts/categories in the future —
-- it only rejects two rows with the identical (user_id, name) pair.

alter table accounts add constraint accounts_user_name_unique unique (user_id, name);
alter table categories add constraint categories_user_name_unique unique (user_id, name);
