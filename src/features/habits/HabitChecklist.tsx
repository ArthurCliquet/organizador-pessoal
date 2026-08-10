import { useEffect, useState, useCallback } from 'react';
import type { Habit, HabitLog } from '../../types';
import { getHabits, createHabit, renameHabit, deleteHabit, getHabitLogsForDate, toggleHabitLog } from './habitsApi';
import { useToast } from '../../contexts/ToastContext';
import { HabitRing } from '../../components/common/HabitRing';

interface HabitChecklistProps {
  date: string;
  allowCreate?: boolean;
  onCountsChange?: (done: number, total: number) => void;
}

export function HabitChecklist({ date, allowCreate = false, onCountsChange }: HabitChecklistProps) {
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

  useEffect(() => {
    const done = habits.filter((h) => isDone(h.id)).length;
    onCountsChange?.(done, habits.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, logs, onCountsChange]);

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
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col gap-0.5">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="group flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] transition-colors hover:bg-white/[0.025]"
          >
            <label className="flex-1 flex items-center gap-2.5 cursor-pointer">
              <HabitRing checked={isDone(habit.id)} onChange={() => handleToggle(habit.id)} />
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
            <button onClick={() => handleDelete(habit.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs px-1">
              ✕
            </button>
          </div>
        ))}
      </div>
      {allowCreate && (
        <div className="flex items-center gap-2 border border-dashed border-surface-border rounded-[11px] px-3 py-2 mt-2 focus-within:border-primary transition-colors">
          <span className="font-mono text-app-muted-2 text-sm">+</span>
          <input
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Novo hábito"
            className="flex-1 bg-transparent text-xs text-app-text outline-none placeholder:text-app-muted-2"
          />
        </div>
      )}
    </div>
  );
}
