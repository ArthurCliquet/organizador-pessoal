insert into storage.buckets (id, name, public, file_size_limit)
values ('note-images', 'note-images', true, 5242880);

create policy "note-images public read"
  on storage.objects for select
  to public
  using (bucket_id = 'note-images');

create policy "note-images owner insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "note-images owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
