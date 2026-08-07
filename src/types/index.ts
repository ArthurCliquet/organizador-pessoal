export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string;
  updated_at: string;
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
  date: string;
  time: string | null;
  title: string;
  done: boolean;
}
