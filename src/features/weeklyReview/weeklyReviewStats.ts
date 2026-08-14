import type { Habit, HabitLog, RecurringTask, RecurringTaskLog, Task } from '../../types';
import { getWeekday } from '../calendar/dateUtils';

export function calculateTaskStats(
  tasks: Task[],
  recurringTasks: RecurringTask[],
  recurringLogs: RecurringTaskLog[],
  weekDates: string[],
): { completed: number; total: number } {
  let completed = tasks.filter((t) => t.done).length;
  let total = tasks.length;

  for (const date of weekDates) {
    const weekday = getWeekday(date);
    for (const rt of recurringTasks) {
      if (!rt.weekdays.includes(weekday)) continue;
      const log = recurringLogs.find((l) => l.recurring_task_id === rt.id && l.date === date);
      if (log?.skipped) continue;
      total += 1;
      if (log?.done) completed += 1;
    }
  }

  return { completed, total };
}

export function calculateHabitStats(
  habits: Habit[],
  habitLogs: HabitLog[],
  weekDates: string[],
): { habitId: string; name: string; done: number; total: number }[] {
  return habits.map((habit) => ({
    habitId: habit.id,
    name: habit.name,
    done: habitLogs.filter((l) => l.habit_id === habit.id && l.done && weekDates.includes(l.date)).length,
    total: weekDates.length,
  }));
}
