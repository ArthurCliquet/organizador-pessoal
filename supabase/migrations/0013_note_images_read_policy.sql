-- Restringe a leitura (listagem) de objetos do bucket note-images ao próprio dono.
-- A política anterior liberava select para o papel public/anon, permitindo que
-- qualquer um com a anon key listasse os caminhos (que contêm o user_id).
-- O bucket continua public = true, então as URLs públicas (<img src>) seguem
-- funcionando via endpoint de serving público, que não passa por esta policy.

drop policy if exists "note-images public read" on storage.objects;

create policy "note-images owner read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'note-images' and (storage.foldername(name))[1] = auth.uid()::text);
