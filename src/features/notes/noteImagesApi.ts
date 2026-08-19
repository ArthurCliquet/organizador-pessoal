import { supabase } from '../../lib/supabase';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadNoteImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Imagem maior que 5MB.');
  }
  const { data: userData } = await supabase.auth.getUser();
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'png';
  const path = `${userData.user!.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('note-images').upload(path, file, {
    contentType: file.type || 'image/png',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('note-images').getPublicUrl(path);
  return data.publicUrl;
}
