import { supabase } from '../../lib/supabase';
import type { Habit, HabitLog } from '../../types';

export async function getHabits(): Promise<Habit[]> {
  const { data, error } = await supabase.from('habits').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createHabit(name: string): Promise<Habit> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('habits').insert({ name, user_id: userData.user!.id }).select().single();
  if (error) throw error;
  return data;
}

export async function renameHabit(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('habits').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

export async function getHabitLogsForDate(date: string): Promise<HabitLog[]> {
  const { data, error } = await supabase.from('habit_logs').select('*').eq('date', date);
  if (error) throw error;
  return data;
}

export async function toggleHabitLog(habitId: string, date: string, done: boolean): Promise<void> {
  const { error } = await supabase.from('habit_logs').upsert({ habit_id: habitId, date, done }, { onConflict: 'habit_id,date' });
  if (error) throw error;
}
