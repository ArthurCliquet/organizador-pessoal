import { useState } from 'react';
import type { Account, Category, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { parseCurrencyInput, formatAmountForInput } from '../../lib/currency';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';

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
      <Modal
        onClose={onCancel}
        title={isEditing ? 'Editar movimentação' : 'Nova movimentação'}
        size="md"
        footer={
          <>
            {isEditing && onDelete && (
              <button type="button" onClick={() => setConfirmDelete(true)} className="mini-btn danger mr-auto">
                Excluir
              </button>
            )}
            <button type="button" onClick={onCancel} className="mini-btn">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} className="mini-btn accent">
              Salvar
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategoryId('');
              }}
              className={`btn flex-1 justify-center ${type === 'expense' ? 'border-danger text-danger' : ''}`}
            >
              Saída
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategoryId('');
              }}
              className={`btn flex-1 justify-center ${type === 'income' ? 'border-success text-success' : ''}`}
            >
              Entrada
            </button>
          </div>

          <input autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" className="input" />

          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" className="input" />
          {amountError && <p className="text-xs text-danger">{amountError}</p>}

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />

          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
            <option value="">Sem categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
            {accounts
              .filter((a) => !a.is_investment)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>
      </Modal>

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
