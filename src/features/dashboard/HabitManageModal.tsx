import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Habit } from '../../types';
import { HabitRing } from '../../components/common/HabitRing';

interface HabitManageModalProps {
  habits: Habit[];
  isDone: (id: string) => boolean;
  onToggle: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onClose: () => void;
}

export function HabitManageModal({
  habits,
  isDone,
  onToggle,
  onCreate,
  onRename,
  onDelete,
  onReorder,
  onClose,
}: HabitManageModalProps) {
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleCreate() {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setIsAdding(false);
  }

  function handleDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;
    const oldIndex = habits.findIndex((h) => h.id === activeId);
    const newIndex = habits.findIndex((h) => h.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(habits, oldIndex, newIndex).map((h) => h.id));
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  done={isDone(habit.id)}
                  editing={editingId === habit.id}
                  editingName={editingName}
                  onToggle={() => onToggle(habit.id)}
                  onStartEdit={() => {
                    setEditingId(habit.id);
                    setEditingName(habit.name);
                  }}
                  onChangeEditName={setEditingName}
                  onCommitEdit={() => {
                    if (editingName.trim()) onRename(habit.id, editingName.trim());
                    setEditingId(null);
                  }}
                  onDelete={() => onDelete(habit.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
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

interface HabitRowProps {
  habit: Habit;
  done: boolean;
  editing: boolean;
  editingName: string;
  onToggle: () => void;
  onStartEdit: () => void;
  onChangeEditName: (v: string) => void;
  onCommitEdit: () => void;
  onDelete: () => void;
}

function HabitRow(p: HabitRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: p.habit.id,
  });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] transition-colors hover:bg-white/[0.025] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        className="drag-grip opacity-100 md:opacity-0 md:group-hover:opacity-100"
        title="Arrastar"
        aria-label="Arrastar hábito"
      >
        <IconGrip />
      </button>
      <label className="flex-1 flex items-center gap-2.5 cursor-pointer">
        <HabitRing checked={p.done} onChange={p.onToggle} />
        {p.editing ? (
          <input
            autoFocus
            value={p.editingName}
            onChange={(e) => p.onChangeEditName(e.target.value)}
            onBlur={p.onCommitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="bg-app-bg border border-primary rounded px-1 text-sm text-app-text outline-none"
          />
        ) : (
          <span
            onDoubleClick={p.onStartEdit}
            className={`text-sm strike ${p.done ? 'text-app-muted is-done' : 'text-app-text'}`}
          >
            {p.habit.name}
          </span>
        )}
      </label>
      <button
        onClick={p.onDelete}
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs px-1"
      >
        ✕
      </button>
    </div>
  );
}

function IconGrip() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <circle cx="7" cy="5" r="1.4" />
      <circle cx="13" cy="5" r="1.4" />
      <circle cx="7" cy="10" r="1.4" />
      <circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="15" r="1.4" />
      <circle cx="13" cy="15" r="1.4" />
    </svg>
  );
}
