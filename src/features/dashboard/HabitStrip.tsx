import { useEffect, useState, useCallback } from 'react';
import type { Habit, HabitLog } from '../../types';
import {
  getHabits,
  createHabit,
  renameHabit,
  deleteHabit,
  reorderHabits,
  getHabitLogsForDate,
  toggleHabitLog,
} from '../habits/habitsApi';
import { useToast } from '../../contexts/ToastContext';
import { HabitProgressRing } from './HabitProgressRing';
import { HabitManageModal } from './HabitManageModal';
import { HabitRing } from '../../components/common/HabitRing';

interface HabitStripProps {
  date: string;
  onCountsChange?: (done: number, total: number) => void;
}

export function HabitStrip({ date, onCountsChange }: HabitStripProps) {
  const { showError } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [managing, setManaging] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, l] = await Promise.all([getHabits(), getHabitLogsForDate(date)]);
      setHabits(h);
      setLogs(l);
    } catch {
      showError('Não foi possível carregar os hábitos.');
    }
  }, [date, showError]);

  useEffect(() => {
    load();
  }, [load]);

  function isDone(habitId: string) {
    return logs.find((l) => l.habit_id === habitId)?.done ?? false;
  }

  const done = habits.filter((h) => isDone(h.id)).length;

  useEffect(() => {
    onCountsChange?.(done, habits.length);
  }, [done, habits.length, onCountsChange]);

  async function handleToggle(habitId: string) {
    const nextDone = !isDone(habitId);
    setLogs((prev) => {
      const existing = prev.find((l) => l.habit_id === habitId);
      if (existing) return prev.map((l) => (l.habit_id === habitId ? { ...l, done: nextDone } : l));
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

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Hábitos</h2>
        {habits.length > 0 && <HabitProgressRing done={done} total={habits.length} size={30} />}
      </div>

      <div className="flex flex-col gap-0.5">
        {habits.map((habit) => (
          <label
            key={habit.id}
            className="flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] cursor-pointer transition-colors hover:bg-white/[0.025]"
          >
            <HabitRing checked={isDone(habit.id)} onChange={() => handleToggle(habit.id)} />
            <span className={`flex-1 text-sm ${isDone(habit.id) ? 'text-success' : 'text-app-text'}`}>{habit.name}</span>
          </label>
        ))}
        {habits.length === 0 && <p className="text-sm text-app-muted">Nenhum hábito ainda</p>}
      </div>

      <button type="button" onClick={() => setManaging(true)} className="habit-more-link mt-2">
        ver mais
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
