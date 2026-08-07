import { supabase } from '../../lib/supabase';
import type { Task } from '../../types';

export async function getTasksForDate(date: string): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').eq('date', date).order('time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function getTasksForRange(startDate: string, endDate: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createTask(date: string, title: string, time: string | null): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('tasks').insert({ date, title, time, user_id: userData.user!.id }).select().single();
  if (error) throw error;
  return data;
}

export async function getPendingTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').is('date', null).order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createPendingTask(title: string): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ date: null, time: null, title, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, fields: Partial<Pick<Task, 'title' | 'time' | 'date'>>): Promise<void> {
  const { error } = await supabase.from('tasks').update(fields).eq('id', id);
  if (error) throw error;
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('tasks').update({ done }).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
