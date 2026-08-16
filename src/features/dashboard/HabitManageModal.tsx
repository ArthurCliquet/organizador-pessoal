import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Habit } from '../../types';
import { HabitRing } from '../../components/common/HabitRing';

interface HabitManageModalProps {
  habits: Habit[];
  isDone: (id: string) => boolean;
  onToggle: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function HabitManageModal({ habits, isDone, onToggle, onCreate, onRename, onDelete, onClose }: HabitManageModalProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function handleCreate() {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-surface-border rounded-card shadow-card p-5 max-w-sm w-full max-h-[80vh] flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Hábitos de hoje</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-app-muted hover:text-app-text text-lg leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin flex flex-col gap-0.5 -mx-1.5 px-1.5">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="group flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] transition-colors hover:bg-white/[0.025]"
            >
              <label className="flex-1 flex items-center gap-2.5 cursor-pointer">
                <HabitRing checked={isDone(habit.id)} onChange={() => onToggle(habit.id)} />
                {editingId === habit.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim()) onRename(habit.id, editingName.trim());
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
                    className={`text-sm strike ${isDone(habit.id) ? 'text-app-muted is-done' : 'text-app-text'}`}
                  >
                    {habit.name}
                  </span>
                )}
              </label>
              <button
                onClick={() => onDelete(habit.id)}
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
          {habits.length === 0 && <p className="text-sm text-app-muted">Nenhum hábito ainda</p>}
        </div>

        <div className="flex items-center gap-2 border border-dashed border-surface-border rounded-[11px] px-3 py-2 focus-within:border-primary transition-colors">
          <span className="font-mono text-app-muted-2 text-sm">+</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Novo hábito"
            className="flex-1 bg-transparent text-xs text-app-text outline-none placeholder:text-app-muted-2"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
