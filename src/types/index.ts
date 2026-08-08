export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  pinned_at: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string;
  updated_at: string;
  viewed_at: string | null;
  pinned_at: string | null;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  done: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  date: string | null;
  time: string | null;
  title: string;
  done: boolean;
  created_at: string;
}

export interface RecurringTask {
  id: string;
  user_id: string;
  title: string;
  time: string | null;
  weekdays: number[];
  created_at: string;
}

export interface RecurringTaskLog {
  id: string;
  recurring_task_id: string;
  date: string;
  done: boolean;
  skipped: boolean;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  created_at: string;
}
