import { useEffect, useState, useCallback } from 'react';
import type { Habit, HabitLog } from '../../types';
import { getHabits, createHabit, renameHabit, deleteHabit, getHabitLogsForDate, toggleHabitLog } from './habitsApi';
import { useToast } from '../../contexts/ToastContext';

interface HabitChecklistProps {
  date: string;
}

export function HabitChecklist({ date }: HabitChecklistProps) {
  const { showError } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  async function handleToggle(habitId: string) {
    const done = !isDone(habitId);
    setLogs((prev) => {
      const existing = prev.find((l) => l.habit_id === habitId);
      if (existing) return prev.map((l) => (l.habit_id === habitId ? { ...l, done } : l));
      return [...prev, { id: `${habitId}-${date}`, habit_id: habitId, date, done }];
    });
    try {
      await toggleHabitLog(habitId, date, done);
    } catch {
      showError('Não foi possível salvar o hábito.');
      load();
    }
  }

  async function handleCreate() {
    if (!newHabitName.trim()) return;
    try {
      await createHabit(newHabitName.trim());
      setNewHabitName('');
      load();
    } catch {
      showError('Não foi possível criar o hábito.');
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

  async function commitRename(id: string, name: string) {
    if (!name.trim()) return;
    try {
      await renameHabit(id, name.trim());
      load();
    } catch {
      showError('Não foi possível renomear o hábito.');
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {habits.map((habit) => (
        <div key={habit.id} className="group flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isDone(habit.id)} onChange={() => handleToggle(habit.id)} className="accent-primary w-4 h-4" />
            {editingId === habit.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => {
                  commitRename(habit.id, editingName);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="bg-app-bg border border-primary rounded px-1 text-sm text-app-text outline-none"
              />
            ) : (
              <span
                onDoubleClick={() => {
                  setEditingId(habit.id);
                  setEditingName(habit.name);
                }}
                className={`text-sm ${isDone(habit.id) ? 'text-app-muted line-through' : 'text-app-text'}`}
              >
                {habit.name}
              </span>
            )}
          </label>
          <button onClick={() => handleDelete(habit.id)} className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs">
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-1 mt-1">
        <input
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          placeholder="+ Novo hábito"
          className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
