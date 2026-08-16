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
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  function handleCreate() {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setIsAdding(false);
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-surface-border rounded-card shadow-card p-5 max-w-sm w-full max-h-[80vh] flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
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

        <div className="-mx-5 -mb-5 border-t border-surface-border">
          {isAdding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="flex items-center gap-2 px-5 py-3"
            >
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewName('');
                  }
                }}
                placeholder="Nome do hábito"
                maxLength={40}
                className="flex-1 min-w-0 bg-app-bg border border-surface-border rounded-lg px-2.5 py-1.5 text-sm text-app-text outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                aria-label="Adicionar hábito"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-app-muted hover:text-success hover:border-success transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="block w-full text-left px-5 py-3 text-sm text-app-muted hover:text-primary transition-colors"
            >
              + hábito
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
