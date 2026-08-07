import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../../types';
import { getTasksForDate, createTask, updateTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import { HabitChecklist } from '../habits/HabitChecklist';
import { useToast } from '../../contexts/ToastContext';

interface DayPanelProps {
  date: string;
  onClose: () => void;
  onTasksChanged: () => void;
}

export function DayPanel({ date, onClose, onTasksChanged }: DayPanelProps) {
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTime, setEditingTime] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await getTasksForDate(date));
    } catch {
      showError('Não foi possível carregar as tarefas.');
    }
  }, [date, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createTask(date, title.trim(), time || null);
      setTitle('');
      setTime('');
      load();
      onTasksChanged();
    } catch {
      showError('Não foi possível criar a tarefa.');
    }
  }

  async function handleToggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    try {
      await toggleTask(task.id, !task.done);
    } catch {
      showError('Não foi possível atualizar a tarefa.');
      load();
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingTime(task.time ? task.time.slice(0, 5) : '');
  }

  async function commitEdit() {
    if (!editingId) return;
    const id = editingId;
    setEditingId(null);
    if (!editingTitle.trim()) return;
    try {
      await updateTask(id, { title: editingTitle.trim(), time: editingTime || null });
      load();
    } catch {
      showError('Não foi possível editar a tarefa.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      load();
      onTasksChanged();
    } catch {
      showError('Não foi possível excluir a tarefa.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={onClose}>
      <div className="bg-surface border border-surface-border rounded-xl w-full max-w-md p-5 flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-app-text font-semibold">{date}</h3>
          <button onClick={onClose} className="text-app-muted hover:text-app-text">
            ✕
          </button>
        </div>

        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Tarefas do dia</h4>
          <div className="flex flex-col gap-1 mb-2">
            {tasks.map((task) => (
              <div key={task.id} className="group flex items-center gap-2">
                <input type="checkbox" checked={task.done} onChange={() => handleToggle(task)} className="accent-primary w-4 h-4" />
                {editingId === task.id ? (
                  <div
                    className="flex-1 flex gap-1"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) commitEdit();
                    }}
                  >
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      className="flex-1 bg-app-bg border border-primary rounded px-1 text-sm text-app-text outline-none"
                    />
                    <input
                      type="time"
                      value={editingTime}
                      onChange={(e) => setEditingTime(e.target.value)}
                      className="bg-app-bg border border-primary rounded px-1 text-xs text-app-text outline-none"
                    />
                  </div>
                ) : (
                  <span
                    onDoubleClick={() => startEditing(task)}
                    className={`flex-1 text-sm ${task.done ? 'text-app-muted line-through' : 'text-app-text'}`}
                  >
                    {task.time ? `${task.time.slice(0, 5)} — ` : ''}
                    {task.title}
                  </span>
                )}
                <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-red-400 text-xs">
                  ✕
                </button>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa</p>}
          </div>
          <div className="flex gap-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="Nova tarefa"
              className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase text-app-muted mb-2">Hábitos diários</h4>
          <HabitChecklist date={date} />
        </div>
      </div>
    </div>
  );
}
