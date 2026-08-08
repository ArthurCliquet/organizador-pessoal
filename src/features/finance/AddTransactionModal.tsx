import { useState } from 'react';
import type { Category } from '../../types';
import { toISODate } from '../calendar/dateUtils';

interface AddTransactionModalProps {
  categories: Category[];
  onCancel: () => void;
  onSave: (input: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
  }) => void;
}

export function AddTransactionModal({ categories, onCancel, onSave }: AddTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [categoryId, setCategoryId] = useState('');

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleSubmit() {
    const parsed = Number(amount.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0 || !description.trim()) return;
    onSave({ type, amount: parsed, description: description.trim(), date, categoryId: categoryId || null });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Nova movimentação</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 font-mono text-xs px-3 py-2 rounded ${type === 'expense' ? 'bg-danger text-app-bg font-semibold' : 'bg-surface-2 text-app-muted'}`}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 font-mono text-xs px-3 py-2 rounded ${type === 'income' ? 'bg-success text-app-bg font-semibold' : 'bg-surface-2 text-app-muted'}`}
          >
            Entrada
          </button>
        </div>

        <input
          autoFocus
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          <option value="">Sem categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
