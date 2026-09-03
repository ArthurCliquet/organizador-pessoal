alter table habits add column position integer not null default 0;

update habits h set position = sub.rn - 1
from (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from habits
) sub
where sub.id = h.id;
