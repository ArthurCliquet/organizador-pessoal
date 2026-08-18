alter table folders add column parent_id uuid references folders(id) on delete cascade;

alter table notes drop constraint notes_folder_id_fkey;
alter table notes add constraint notes_folder_id_fkey
  foreign key (folder_id) references folders(id) on delete cascade;
