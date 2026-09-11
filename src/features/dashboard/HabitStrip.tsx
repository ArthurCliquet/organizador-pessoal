import { useEffect, useState, useCallback } from 'react';
import type { Habit, HabitLog } from '../../types';
import {
  getHabits,
  createHabit,
  renameHabit,
  deleteHabit,
  reorderHabits,
  getHabitLogsForRange,
  toggleHabitLog,
} from '../habits/habitsApi';
import { useToast } from '../../contexts/ToastContext';
import { HabitProgressRing } from './HabitProgressRing';
import { HabitManageModal } from './HabitManageModal';
import { TaskCheck } from '../../components/common/TaskCheck';
import { getWeekRange, getSevenDaysFrom, toISODate } from '../calendar/dateUtils';

interface HabitStripProps {
  date: string;
  onCountsChange?: (done: number, total: number) => void;
}

export function HabitStrip({ date, onCountsChange }: HabitStripProps) {
  const { showError } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [managing, setManaging] = useState(false);

  const { start: weekStart } = getWeekRange(new Date());
  const weekDays = getSevenDaysFrom(weekStart);

  const load = useCallback(async () => {
    try {
      const [h, l] = await Promise.all([getHabits(), getHabitLogsForRange(weekDays[0], weekDays[6])]);
      setHabits(h);
      setLogs(l);
    } catch {
      showError('Não foi possível carregar os hábitos.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, showError]);

  useEffect(() => {
    load();
  }, [load]);

  function isDone(habitId: string, forDate = date) {
    return logs.find((l) => l.habit_id === habitId && l.date === forDate)?.done ?? false;
  }

  const done = habits.filter((h) => isDone(h.id)).length;

  useEffect(() => {
    onCountsChange?.(done, habits.length);
  }, [done, habits.length, onCountsChange]);

  async function handleToggle(habitId: string) {
    const nextDone = !isDone(habitId);
    setLogs((prev) => {
      const existing = prev.find((l) => l.habit_id === habitId && l.date === date);
      if (existing) return prev.map((l) => (l.habit_id === habitId && l.date === date ? { ...l, done: nextDone } : l));
      return [...prev, { id: `${habitId}-${date}`, habit_id: habitId, date, done: nextDone }];
    });
    try {
      await toggleHabitLog(habitId, date, nextDone);
    } catch {
      showError('Não foi possível salvar o hábito.');
      load();
    }
  }

  async function handleCreate(name: string) {
    try {
      await createHabit(name);
      load();
    } catch {
      showError('Não foi possível criar o hábito.');
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      await renameHabit(id, name);
      load();
    } catch {
      showError('Não foi possível renomear o hábito.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHabit(id);
      load();
    } catch {
      showError('Não foi possível excluir o hábito.');
    }
  }

  async function handleReorder(orderedIds: string[]) {
    const prev = habits;
    setHabits((cur) => orderedIds.map((id) => cur.find((h) => h.id === id)).filter((h): h is Habit => !!h));
    try {
      await reorderHabits(orderedIds);
    } catch {
      setHabits(prev);
      showError('Não foi possível reordenar os hábitos.');
    }
  }

  const todayIso = toISODate(new Date());

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-baseline justify-between mb-3 shrink-0">
        <h2 className="text-base font-semibold">Hábitos</h2>
        {habits.length > 0 && <HabitProgressRing done={done} total={habits.length} size={30} />}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain scrollbar-thin">
        {habits.map((habit) => (
          <div key={habit.id} className="flex items-center gap-2.5 py-2 border-t border-border-2 first:border-t-0">
            <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
              <TaskCheck checked={isDone(habit.id)} onChange={() => handleToggle(habit.id)} />
              <span className="flex-1 text-sm text-app-text truncate">{habit.name}</span>
            </label>
            <span className="habit-week shrink-0">
              {weekDays.map((d) => (
                <i key={d} className={isDone(habit.id, d) ? 'hit' : ''} title={d === todayIso ? 'hoje' : d} />
              ))}
            </span>
          </div>
        ))}
        {habits.length === 0 && <p className="text-sm text-app-muted">Nenhum hábito ainda</p>}
      </div>

      <button type="button" onClick={() => setManaging(true)} className="foot-link text-left">
        + hábito
      </button>

      {managing && (
        <HabitManageModal
          habits={habits}
          isDone={isDone}
          onToggle={handleToggle}
          onCreate={handleCreate}
          onRename={handleRename}
          onDelete={handleDelete}
          onReorder={handleReorder}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}
