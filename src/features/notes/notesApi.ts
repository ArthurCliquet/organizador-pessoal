import { supabase } from '../../lib/supabase';
import type { Folder, Note } from '../../types';

export async function getFolders(): Promise<Folder[]> {
  const { data, error } = await supabase.from('folders').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createFolder(name: string, parentId: string | null = null): Promise<Folder> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('folders')
    .insert({ name, parent_id: parentId, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('folders').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}

export function getDescendantFolderIds(folders: Folder[], id: string): string[] {
  const directChildren = folders.filter((f) => f.parent_id === id).map((f) => f.id);
  return directChildren.concat(directChildren.flatMap((childId) => getDescendantFolderIds(folders, childId)));
}

export async function getFolderDeletionImpact(
  folders: Folder[],
  id: string,
): Promise<{ descendantFolderIds: string[]; noteCount: number }> {
  const descendantFolderIds = getDescendantFolderIds(folders, id);
  const folderIds = [id, ...descendantFolderIds];
  const { count, error } = await supabase
    .from('notes')
    .select('id', { count: 'exact', head: true })
    .in('folder_id', folderIds);
  if (error) throw error;
  return { descendantFolderIds, noteCount: count ?? 0 };
}

export async function pinFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').update({ pinned_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function unpinFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').update({ pinned_at: null }).eq('id', id);
  if (error) throw error;
}

export async function getNotes(folderId: string | null): Promise<Note[]> {
  const base = supabase.from('notes').select('*').order('updated_at', { ascending: false });
  const { data, error } = folderId === null ? await base.is('folder_id', null) : await base.eq('folder_id', folderId);
  if (error) throw error;
  return data;
}

export async function searchNotes(query: string): Promise<Note[]> {
  const escaped = query.replace(/[%,]/g, '');
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRecentNotes(limit: number): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .not('viewed_at', 'is', null)
    .order('viewed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function touchNoteViewed(id: string): Promise<void> {
  const { error } = await supabase.from('notes').update({ viewed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function createNote(folderId: string | null, title: string, content: string): Promise<Note> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('notes')
    .insert({ folder_id: folderId, title, content, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(id: string, fields: Partial<Pick<Note, 'title' | 'content' | 'folder_id'>>): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

export async function pinNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').update({ pinned_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function unpinNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').update({ pinned_at: null }).eq('id', id);
  if (error) throw error;
}

export async function getPinnedNotes(): Promise<Note[]> {
  const { data, error } = await supabase.from('notes').select('*').not('pinned_at', 'is', null).order('pinned_at', { ascending: false });
  if (error) throw error;
  return data;
}
