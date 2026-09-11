import { useEffect, useState, useCallback } from 'react';
import type { RecurringTask } from '../../types';
import { getRecurringTasks, createRecurringTask, deleteRecurringTask } from './recurringTasksApi';
import { WEEKDAY_LABELS } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../../components/common/Modal';

interface RecurringTasksModalProps {
  onClose: () => void;
  onChanged: () => void;
}

const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function RecurringTasksModal({ onClose, onChanged }: RecurringTasksModalProps) {
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
    <Modal
      onClose={onClose}
      title="Tarefas recorrentes"
      subtitle="Aparecem automaticamente nos dias da semana escolhidos."
      size="lg"
    >
      <table className="rec-table">
        <thead>
          <tr>
            <th>Horário</th>
            <th>Tarefa</th>
            <th>
              <span className="flex gap-1">
                {WEEKDAY_LABELS.map((label, i) => (
                  <span key={i} className="w-[15px] text-center" title={WEEKDAY_FULL[i]}>{label}</span>
                ))}
              </span>
            </th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {recurringTasks.map((rt) => (
            <tr key={rt.id}>
              <td className="num">{rt.time ? rt.time.slice(0, 5) : '--:--'}</td>
              <td className="truncate">{rt.title}</td>
              <td>
                <span className="wk">
                  {WEEKDAY_LABELS.map((_, i) => (
                    <i key={i} title={WEEKDAY_FULL[i]} className={rt.weekdays.includes(i) ? 'on' : ''} />
                  ))}
                </span>
              </td>
              <td>
                <button onClick={() => handleDelete(rt.id)} className="del" title="Excluir">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {recurringTasks.length === 0 && <p className="text-sm text-app-muted py-2">Nenhuma tarefa recorrente</p>}

      <div className="rec-add">
        <div className="wk-pick">
          {WEEKDAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              title={WEEKDAY_FULL[i]}
              onClick={() => toggleRecWeekday(i)}
              className={recWeekdays.includes(i) ? 'on' : ''}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rec-add-row">
          <input
            value={recTitle}
            onChange={(e) => setRecTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Nova tarefa recorrente"
            className="input"
          />
          <input type="time" value={recTime} onChange={(e) => setRecTime(e.target.value)} className="input t-in" />
          <button onClick={handleCreate} className="btn primary">
            Adicionar
          </button>
        </div>
      </div>
    </Modal>
  );
}
