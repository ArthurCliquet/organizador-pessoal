import { useState } from 'react';
import type { Account, Category, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { parseCurrencyInput, formatAmountForInput } from '../../lib/currency';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface AddTransactionModalProps {
  categories: Category[];
  accounts: Account[];
  transaction?: Transaction | null;
  onCancel: () => void;
  onSave: (input: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
    accountId: string;
  }) => void;
  onDelete?: () => void;
}

export function AddTransactionModal({
  categories,
  accounts,
  transaction,
  onCancel,
  onSave,
  onDelete,
}: AddTransactionModalProps) {
  const isEditing = !!transaction;
  const [type, setType] = useState<'income' | 'expense'>(
    transaction && transaction.type !== 'transfer' ? transaction.type : 'expense',
  );
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [amount, setAmount] = useState(transaction ? formatAmountForInput(Number(transaction.amount)) : '');
  const [date, setDate] = useState(transaction?.date ?? toISODate(new Date()));
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '');
  const [accountId, setAccountId] = useState(
    transaction?.account_id ?? accounts.find((a) => !a.is_investment)?.id ?? '',
  );
  const [amountError, setAmountError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  function handleSubmit() {
    const parsed = parseCurrencyInput(amount);
    if (parsed === null || parsed <= 0) {
      setAmountError('Valor inválido');
      return;
    }
    if (!description.trim()) return;
    if (!accountId) return;
    setAmountError('');
    onSave({ type, amount: parsed, description: description.trim(), date, categoryId: categoryId || null, accountId });
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">{isEditing ? 'Editar movimentação' : 'Nova movimentação'}</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              setCategoryId('');
            }}
            className={`flex-1 font-mono text-xs px-3 py-2 rounded ${type === 'expense' ? 'bg-danger text-app-bg font-semibold' : 'bg-surface-2 text-app-muted'}`}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              setCategoryId('');
            }}
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
        {amountError && <p className="text-xs text-danger">{amountError}</p>}

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

        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="bg-app-bg border border-surface-border rounded px-3 py-2 text-sm text-app-text outline-none focus:border-primary"
        >
          {accounts
            .filter((a) => !a.is_investment)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>

        <div className="flex items-center gap-2 mt-1">
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="font-mono text-xs px-3 py-2 rounded text-danger hover:bg-danger/10"
            >
              Excluir
            </button>
          )}
          <div className="flex justify-end gap-2 ml-auto">
            <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>

      {confirmDelete && onDelete && (
        <ConfirmDialog
          title="Excluir movimentação"
          message="Esta movimentação será removida e os saldos serão recalculados."
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
