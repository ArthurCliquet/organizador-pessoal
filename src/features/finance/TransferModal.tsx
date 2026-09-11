import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { parseCurrencyInput, formatAmountForInput } from '../../lib/currency';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';

interface TransferModalProps {
  accounts: Account[];
  transfer?: Transaction | null;
  onCancel: () => void;
  onSave: (input: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string }) => void;
  onDelete?: () => void;
}

export function TransferModal({ accounts, transfer, onCancel, onSave, onDelete }: TransferModalProps) {
  const isEditing = !!transfer;
  const [fromAccountId, setFromAccountId] = useState(transfer?.account_id ?? accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(
    transfer?.to_account_id ?? accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '',
  );
  const [amount, setAmount] = useState(transfer ? formatAmountForInput(Number(transfer.amount)) : '');
  const [description, setDescription] = useState(transfer?.description ?? '');
  const [date, setDate] = useState(transfer?.date ?? toISODate(new Date()));
  const [amountError, setAmountError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    <>
      <Modal
        onClose={onCancel}
        title={isEditing ? 'Editar transferência' : 'Transferir entre contas'}
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
          <select value={fromAccountId} onChange={(e) => handleFromChange(e.target.value)} className="input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="input">
            {destinationOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" className="input" />
          {amountError && <p className="text-xs text-danger">{amountError}</p>}

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="input"
          />
        </div>
      </Modal>

      {confirmDelete && onDelete && (
        <ConfirmDialog
          title="Excluir transferência"
          message="Esta transferência será removida e os saldos serão recalculados."
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
