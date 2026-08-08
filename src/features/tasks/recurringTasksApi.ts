import { supabase } from '../../lib/supabase';
import type { RecurringTask, RecurringTaskLog } from '../../types';

export async function getRecurringTasks(): Promise<RecurringTask[]> {
  const { data, error } = await supabase.from('recurring_tasks').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createRecurringTask(title: string, weekdays: number[], time: string | null): Promise<RecurringTask> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('recurring_tasks')
    .insert({ title, weekdays, time, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecurringTask(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function getRecurringLogsForDate(date: string): Promise<RecurringTaskLog[]> {
  const { data, error } = await supabase.from('recurring_task_logs').select('*').eq('date', date);
  if (error) throw error;
  return data;
}

export async function toggleRecurringLog(recurringTaskId: string, date: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('recurring_task_logs')
    .upsert({ recurring_task_id: recurringTaskId, date, done }, { onConflict: 'recurring_task_id,date' });
  if (error) throw error;
}

export async function skipRecurringOccurrence(recurringTaskId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_task_logs')
    .upsert({ recurring_task_id: recurringTaskId, date, skipped: true }, { onConflict: 'recurring_task_id,date' });
  if (error) throw error;
}
