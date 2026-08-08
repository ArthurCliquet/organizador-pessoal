-- A category's real identity is (name, type), not just name: e.g. "Outros"
-- should be allowed to exist as both an income category and an expense
-- category. The 0006 migration's unique (user_id, name) constraint forbids
-- that. Replace it with a constraint scoped to (user_id, name, type).

alter table categories drop constraint categories_user_name_unique;
alter table categories add constraint categories_user_name_type_unique unique (user_id, name, type);
