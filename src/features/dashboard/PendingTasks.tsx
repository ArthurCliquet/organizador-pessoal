import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import type { Task } from '../../types';
import { getPendingTasks, createPendingTask, toggleTask, deleteTask } from '../tasks/tasksApi';
import { useToast } from '../../contexts/ToastContext';
import { TaskCheck } from '../../components/common/TaskCheck';

export function PendingTasks() {
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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
      setIsAdding(false);
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
      <div className="flex-1 flex flex-col gap-0.5 mb-3 max-h-[180px] overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin">
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
      {isAdding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="flex items-center gap-2 border border-surface-border rounded-[11px] pl-3 pr-1 py-1"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsAdding(false);
                setTitle('');
              }
            }}
            onBlur={() => {
              if (!title.trim()) setIsAdding(false);
            }}
            placeholder="Nova pendência"
            className="flex-1 min-w-0 bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted-2"
          />
          <button
            type="submit"
            aria-label="Adicionar pendência"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-surface-border bg-surface-2 text-app-muted hover:text-success hover:border-success transition-colors"
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
          className="flex items-center gap-2 w-full border border-dashed border-surface-border rounded-[11px] px-3 py-2 text-left font-mono text-sm text-app-muted-2 hover:text-primary hover:border-app-muted transition-colors"
        >
          + Nova pendência
        </button>
      )}
    </div>
  );
}
