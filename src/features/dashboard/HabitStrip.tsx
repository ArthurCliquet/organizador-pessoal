import { useEffect, useState, useCallback } from 'react';
import type { Habit, HabitLog } from '../../types';
import { getHabits, createHabit, renameHabit, deleteHabit, getHabitLogsForDate, toggleHabitLog } from '../habits/habitsApi';
import { useToast } from '../../contexts/ToastContext';
import { HabitProgressRing } from './HabitProgressRing';
import { HabitManageModal } from './HabitManageModal';

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

  return (
    <>
      {habits.length > 0 && <HabitProgressRing done={done} total={habits.length} size={30} />}

      <div className="habit-chip-row">
        {habits.map((habit) => (
          <button
            key={habit.id}
            type="button"
            onClick={() => handleToggle(habit.id)}
            className={`habit-chip ${isDone(habit.id) ? 'on' : ''}`}
          >
            {habit.name}
          </button>
        ))}
        {habits.length === 0 && <span className="text-sm text-app-muted">Nenhum hábito ainda</span>}
      </div>

      <button type="button" onClick={() => setManaging(true)} className="habit-more-link">
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
          onClose={() => setManaging(false)}
        />
      )}
    </>
  );
}
