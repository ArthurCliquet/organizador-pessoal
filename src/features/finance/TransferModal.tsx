import { useState } from 'react';
import type { Account } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { parseCurrencyInput } from '../../lib/currency';

interface TransferModalProps {
  accounts: Account[];
  onCancel: () => void;
  onSave: (input: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string }) => void;
}

export function TransferModal({ accounts, onCancel, onSave }: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [amountError, setAmountError] = useState('');

  const destinationOptions = accounts.filter((a) => a.id !== fromAccountId);

  function handleFromChange(id: string) {
    setFromAccountId(id);
    if (toAccountId === id) {
      setToAccountId(accounts.find((a) => a.id !== id)?.id ?? '');
    }
  }

  function handleSubmit() {
    const parsed = parseCurrencyInput(amount);
    if (parsed === null || parsed <= 0) {
      setAmountError('Valor inválido');
      return;
    }
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    setAmountError('');
    onSave({ fromAccountId, toAccountId, amount: parsed, description: description.trim(), date });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Transferir entre contas</h3>

        <select
          value={fromAccountId}
          onChange={(e) => handleFromChange(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          {destinationOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />
        {amountError && <p className="text-xs text-danger">{amountError}</p>}

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        />

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
