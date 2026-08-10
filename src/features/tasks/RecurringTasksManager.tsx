import { useEffect, useState, useCallback } from 'react';
import type { RecurringTask } from '../../types';
import { getRecurringTasks, createRecurringTask, deleteRecurringTask } from './recurringTasksApi';
import { WEEKDAY_LABELS } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

interface RecurringTasksManagerProps {
  onChanged: () => void;
}

export function RecurringTasksManager({ onChanged }: RecurringTasksManagerProps) {
  const { showError } = useToast();
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recTitle, setRecTitle] = useState('');
  const [recTime, setRecTime] = useState('');
  const [recWeekdays, setRecWeekdays] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      setRecurringTasks(await getRecurringTasks());
    } catch {
      showError('Não foi possível carregar as tarefas recorrentes.');
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleRecWeekday(day: number) {
    setRecWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  async function handleCreate() {
    if (!recTitle.trim() || recWeekdays.length === 0) return;
    try {
      await createRecurringTask(recTitle.trim(), recWeekdays, recTime || null);
      setRecTitle('');
      setRecTime('');
      setRecWeekdays([]);
      load();
      onChanged();
    } catch {
      showError('Não foi possível criar a tarefa recorrente.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRecurringTask(id);
      load();
      onChanged();
    } catch {
      showError('Não foi possível excluir a tarefa recorrente.');
    }
  }

  return (
    <div className="mt-8 border border-surface-border rounded bg-surface p-6">
      <h3 className="font-mono text-xs uppercase tracking-wider text-app-muted-2 mb-3 font-semibold">Tarefas recorrentes</h3>
      <div className="flex flex-col gap-1 mb-3">
        {recurringTasks.map((rt) => (
          <div key={rt.id} className="group flex items-center gap-2">
            <span className="flex-1 text-sm text-app-text">
              {rt.time ? <span className="font-mono text-app-muted-2">{rt.time.slice(0, 5)} — </span> : ''}
              {rt.title}{' '}
              <span className="font-mono text-app-muted-2 text-xs">({rt.weekdays.map((d) => WEEKDAY_LABELS[d]).join('')})</span>
            </span>
            <button
              onClick={() => handleDelete(rt.id)}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
        {recurringTasks.length === 0 && <p className="text-sm text-app-muted">Nenhuma tarefa recorrente</p>}
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <div className="flex gap-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleRecWeekday(i)}
              className={`font-mono w-6 h-6 rounded text-xs ${recWeekdays.includes(i) ? 'bg-primary text-app-bg' : 'bg-app-bg text-app-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={recTitle}
            onChange={(e) => setRecTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Nova tarefa recorrente"
            className="flex-1 bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
          />
          <input
            type="time"
            value={recTime}
            onChange={(e) => setRecTime(e.target.value)}
            className="bg-app-bg border border-surface-border rounded px-2 py-1 text-xs text-app-text outline-none focus:border-primary"
          />
          <button onClick={handleCreate} className="font-mono bg-primary text-app-bg text-xs rounded px-2 py-1 shrink-0">
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
