alter table folders add column position integer not null default 0;
alter table notes   add column position integer not null default 0;

update folders f set position = sub.rn - 1
from (
  select id, row_number() over (partition by user_id, parent_id order by name) as rn
  from folders
) sub
where sub.id = f.id;

update notes n set position = sub.rn - 1
from (
  select id, row_number() over (partition by user_id, folder_id order by updated_at desc) as rn
  from notes
) sub
where sub.id = n.id;

create index folders_parent_position_idx on folders (parent_id, position);
create index notes_folder_position_idx   on notes   (folder_id, position);
