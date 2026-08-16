import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import type { Task } from '../../types';
import { getPendingTasks, createPendingTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import { useToast } from '../../contexts/ToastContext';
import { TaskCheck } from '../../components/common/TaskCheck';

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
    <div className="flex flex-col flex-1">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Pendências</h2>
        <span className="font-mono text-xs text-app-muted-2">
          {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-0.5 mb-3 max-h-[180px] overflow-y-auto overscroll-contain scrollbar-thin -mr-2 pr-2">
        {tasks.map((task, i) => (
          <div
            key={task.id}
            style={{ '--stagger': i * 40 } as CSSProperties}
            className="list-row-in group flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-[10px] transition-colors hover:bg-white/[0.025]"
          >
            <TaskCheck checked={task.done} onChange={() => handleToggle(task)} />
            <span className={`flex-1 text-sm strike ${task.done ? 'text-app-muted is-done' : 'text-app-text'}`}>{task.title}</span>
            <button
              onClick={() => handleDelete(task.id)}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma pendência</p>}
      </div>
      <div className="flex items-center gap-2 border border-dashed border-surface-border rounded-[11px] px-3 py-2 focus-within:border-primary transition-colors">
        <span className="font-mono text-app-muted-2 text-sm">+</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          placeholder="Nova pendência"
          className="flex-1 bg-transparent text-xs text-app-text outline-none placeholder:text-app-muted-2"
        />
      </div>
    </div>
  );
}
