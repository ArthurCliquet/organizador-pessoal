import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../types';
import { getTasksForRange } from '../features/tasks/tasksApi';
import { getRecurringTasks } from '../features/tasks/recurringTasksApi';
import { getMonthGrid, toISODate } from '../features/calendar/dateUtils';
import { MonthGrid } from '../features/calendar/MonthGrid';
import { DayPanel } from '../features/calendar/DayPanel';
import { useToast } from '../contexts/ToastContext';

export function CalendarPage() {
  const { showError } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [recurringWeekdays, setRecurringWeekdays] = useState<Set<number>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const days = getMonthGrid(year, month);
    const start = toISODate(days[0]);
    const end = toISODate(days[days.length - 1]);
    try {
      const [tasks, recurring] = await Promise.all([getTasksForRange(start, end), getRecurringTasks()]);
      const grouped: Record<string, Task[]> = {};
      for (const task of tasks) {
        if (!task.date) continue;
        (grouped[task.date] ??= []).push(task);
      }
      setTasksByDate(grouped);
      setRecurringWeekdays(new Set(recurring.flatMap((rt) => rt.weekdays)));
    } catch {
      showError('Não foi possível carregar as tarefas do mês.');
    }
  }, [year, month, showError]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <div className="p-4 md:p-6">
      <MonthGrid
        year={year}
        month={month}
        tasksByDate={tasksByDate}
        recurringWeekdays={recurringWeekdays}
        selectedDate={selectedDate}
        onSelectDay={(date) => setSelectedDate((prev) => (prev === date ? null : date))}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      />
      {selectedDate && <DayPanel date={selectedDate} onTasksChanged={loadTasks} />}
    </div>
  );
}
