import { useEffect, useState, useCallback } from 'react';
import type { RecurringTask } from '../../types';
import { getRecurringTasks, createRecurringTask, deleteRecurringTask } from './recurringTasksApi';
import { WEEKDAY_LABELS } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import { Card } from '../../components/common/Card';

interface RecurringTasksManagerProps {
  onChanged: () => void;
}

const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const REC_GRID_COLS = 'grid-cols-[4.6rem_1fr_8.3rem_1.25rem]';

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
    <Card className="mt-8">
      <h3 className="font-mono text-xs uppercase tracking-wider text-app-muted-2 mb-3 font-semibold">Tarefas recorrentes</h3>

      <div className="flex flex-col">
        <div className={`grid ${REC_GRID_COLS} gap-3 items-center px-1.5 -mx-1.5 pb-2 mb-1 border-b border-surface-border font-mono text-[0.6rem] uppercase tracking-wider text-app-muted-2`}>
          <span>Horário</span>
          <span>Tarefa</span>
          <span className="flex gap-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="w-[15px] text-center" title={WEEKDAY_FULL[i]}>
                {label}
              </span>
            ))}
          </span>
          <span aria-hidden="true" />
        </div>

        {recurringTasks.map((rt) => (
          <div
            key={rt.id}
            className={`group grid ${REC_GRID_COLS} gap-3 items-center px-1.5 -mx-1.5 py-2 border-b border-surface-border/60 last:border-b-0 hover:bg-white/[0.025] transition-colors rounded-[10px]`}
          >
            <span className="font-mono text-xs text-app-muted-2">{rt.time ? rt.time.slice(0, 5) : '--:--'}</span>
            <span className="text-sm text-app-text truncate">{rt.title}</span>
            <span className="flex items-center gap-1">
              {WEEKDAY_LABELS.map((_, i) => (
                <span
                  key={i}
                  title={WEEKDAY_FULL[i]}
                  className={`w-[15px] h-[15px] rounded-full border transition-colors ${
                    rt.weekdays.includes(i) ? 'bg-primary border-primary' : 'border-surface-border'
                  }`}
                />
              ))}
            </span>
            <button
              onClick={() => handleDelete(rt.id)}
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-app-muted hover:text-danger text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        {recurringTasks.length === 0 && <p className="text-sm text-app-muted py-2">Nenhuma tarefa recorrente</p>}
      </div>

      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-dashed border-surface-border max-w-sm">
        <div className="flex gap-1.5">
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              title={WEEKDAY_FULL[i]}
              onClick={() => toggleRecWeekday(i)}
              className={`font-mono w-8 h-8 rounded-lg text-xs transition-colors ${recWeekdays.includes(i) ? 'bg-primary text-app-bg' : 'bg-app-bg text-app-muted border border-surface-border'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={recTitle}
            onChange={(e) => setRecTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Nova tarefa recorrente"
            className="flex-1 bg-app-bg border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-primary"
          />
          <input
            type="time"
            value={recTime}
            onChange={(e) => setRecTime(e.target.value)}
            className="bg-app-bg border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-app-text outline-none focus:border-primary"
          />
          <button onClick={handleCreate} className="font-mono bg-primary text-app-bg text-xs rounded-lg px-3 py-1.5 shrink-0">
            Adicionar
          </button>
        </div>
      </div>
    </Card>
  );
}
