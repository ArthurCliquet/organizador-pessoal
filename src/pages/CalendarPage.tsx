import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../types';
import { getTasksForRange } from '../features/tasks/tasksApi';
import { getMonthGrid, toISODate } from '../features/calendar/dateUtils';
import { MonthGrid } from '../features/calendar/MonthGrid';
import { DayPanel } from '../features/calendar/DayPanel';
import { RecurringTasksManager } from '../features/tasks/RecurringTasksManager';
import { useToast } from '../contexts/ToastContext';

export function CalendarPage() {
  const { showError } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(toISODate(today));
  const [recurringVersion, setRecurringVersion] = useState(0);

  const loadTasks = useCallback(async () => {
    const days = getMonthGrid(year, month);
    const start = toISODate(days[0]);
    const end = toISODate(days[days.length - 1]);
    try {
      const tasks = await getTasksForRange(start, end);
      const grouped: Record<string, Task[]> = {};
      for (const task of tasks) {
        if (!task.date) continue;
        (grouped[task.date] ??= []).push(task);
      }
      setTasksByDate(grouped);
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
        selectedDate={selectedDate}
        onSelectDay={setSelectedDate}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      />
      {selectedDate && <DayPanel date={selectedDate} onTasksChanged={loadTasks} refreshToken={recurringVersion} />}
      <RecurringTasksManager
        onChanged={() => {
          loadTasks();
          setRecurringVersion((v) => v + 1);
        }}
      />
    </div>
  );
}
