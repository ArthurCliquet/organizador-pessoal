import { useEffect, useState, useCallback } from 'react';
import type { Task } from '../../types';
import { getPendingTasks, createPendingTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import { useToast } from '../../contexts/ToastContext';

export function PendingTasks() {
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await getPendingTasks());
    } catch {
      showError('Não foi possível carregar as pendências.');
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createPendingTask(title.trim());
      setTitle('');
      load();
    } catch {
      showError('Não foi possível criar a pendência.');
    }
  }

  async function handleToggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    try {
      await toggleTask(task.id, !task.done);
    } catch {
      showError('Não foi possível atualizar a pendência.');
      load();
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      load();
    } catch {
      showError('Não foi possível excluir a pendência.');
    }
  }

  return (
    <div className="bg-surface border border-surface-border rounded p-5">
      <h3 className="font-display text-base mb-3">Pendências</h3>
      <div className="flex flex-col gap-1 mb-2">
        {tasks.map((task) => (
          <div key={task.id} className="group flex items-center gap-2">
            <input type="checkbox" checked={task.done} onChange={() => handleToggle(task)} className="accent-primary w-4 h-4" />
            <span className={`flex-1 text-sm ${task.done ? 'text-app-muted line-through' : 'text-app-text'}`}>
              <span className="font-mono text-app-muted-2">— </span>
              {task.title}
            </span>
            <button
              onClick={() => handleDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 text-app-muted hover:text-danger text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma pendência</p>}
      </div>
      <div className="flex gap-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          placeholder="+ Nova pendência"
          className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
