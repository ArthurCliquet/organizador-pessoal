import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Task } from '../types';
import { getTasksForRange } from '../features/tasks/tasksApi';
import { getMonthGrid, toISODate } from '../features/calendar/dateUtils';
import { MonthHeader } from '../features/calendar/MonthHeader';
import { MonthGrid } from '../features/calendar/MonthGrid';
import { DayPanel } from '../features/calendar/DayPanel';
import { RecurringTasksModal } from '../features/tasks/RecurringTasksModal';
import { useToast } from '../contexts/ToastContext';

export function CalendarPage() {
  const { showError } = useToast();
  const today = new Date();
  const [searchParams] = useSearchParams();
  const diaParam = searchParams.get('dia');
  const initialDate = diaParam && /^\d{4}-\d{2}-\d{2}$/.test(diaParam) ? diaParam : toISODate(today);
  const initialDateObj = new Date(`${initialDate}T12:00:00`);
  const [year, setYear] = useState(initialDateObj.getFullYear());
  const [month, setMonth] = useState(initialDateObj.getMonth());
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [recurringVersion, setRecurringVersion] = useState(0);
  const [recurringOpen, setRecurringOpen] = useState(false);

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

  function prevMonth() {
    setYear((y) => (month === 0 ? y - 1 : y));
    setMonth((m) => (m === 0 ? 11 : m - 1));
  }
  function nextMonth() {
    setYear((y) => (month === 11 ? y + 1 : y));
    setMonth((m) => (m === 11 ? 0 : m + 1));
  }
  function goToToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const { monthTaskCount, monthEventCount } = useMemo(() => {
    let tasks = 0;
    let events = 0;
    for (const [iso, list] of Object.entries(tasksByDate)) {
      if (new Date(`${iso}T12:00:00`).getMonth() !== month) continue;
      for (const t of list) {
        if (t.is_special_event) events++;
        else tasks++;
      }
    }
    return { monthTaskCount: tasks, monthEventCount: events };
  }, [tasksByDate, month]);

  return (
    <div className="relative overflow-hidden">
      <div className="dash-glow" />
      <div className="relative p-4 md:p-6 max-w-7xl mx-auto">
        <MonthHeader
          year={year}
          month={month}
          monthTaskCount={monthTaskCount}
          monthEventCount={monthEventCount}
          onPrev={prevMonth}
          onNext={nextMonth}
          onToday={goToToday}
          onOpenRecurring={() => setRecurringOpen(true)}
        />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-5 md:items-start">
          <MonthGrid
            year={year}
            month={month}
            tasksByDate={tasksByDate}
            selectedDate={selectedDate}
            onSelectDay={setSelectedDate}
          />
          <div className="md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:flex md:flex-col md:min-h-0">
            {selectedDate && <DayPanel date={selectedDate} onTasksChanged={loadTasks} refreshToken={recurringVersion} />}
          </div>
        </div>
      </div>

      {recurringOpen && (
        <RecurringTasksModal
          onClose={() => setRecurringOpen(false)}
          onChanged={() => {
            loadTasks();
            setRecurringVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
