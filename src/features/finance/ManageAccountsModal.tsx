import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { isAccountEmpty } from './financeApi';
import { Modal } from '../../components/common/Modal';

interface ManageAccountsModalProps {
  accounts: Account[];
  transactions: Transaction[];
  onRename: (accountId: string, name: string) => void;
  onDelete: (accountId: string) => void;
  onCancel: () => void;
}

export function ManageAccountsModal({ accounts, transactions, onRename, onDelete, onCancel }: ManageAccountsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function startEditing(account: Account) {
    setEditingId(account.id);
    setNameValue(account.name);
    setNameError('');
    setConfirmingId(null);
  }

  function handleSaveName(accountId: string) {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError('Informe um nome para a conta');
      return;
    }
    setNameError('');
    onRename(accountId, trimmed);
    setEditingId(null);
  }

  return (
    <Modal
      onClose={onCancel}
      title="Editar contas"
      size="sm"
      footer={
        <button type="button" onClick={onCancel} className="btn ghost">
          Fechar
        </button>
      }
    >
      {accounts.map((account) => {
        const empty = isAccountEmpty(account, transactions);
        return (
          <div key={account.id} className={`ae-row${editingId === account.id ? ' edit' : confirmingId === account.id ? ' confirm' : ''}`}>
            {editingId === account.id ? (
              <>
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName(account.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="input"
                  aria-label="Nome da conta"
                />
                <button onClick={() => handleSaveName(account.id)} className="mini-btn accent">
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setNameError('');
                    setEditingId(null);
                  }}
                  className="mini-btn"
                >
                  Cancelar
                </button>
                {nameError && <p className="err">{nameError}</p>}
              </>
            ) : confirmingId === account.id ? (
              <>
                <span>Excluir "{account.name}"?</span>
                <span className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onDelete(account.id);
                      setConfirmingId(null);
                    }}
                    className="mini-btn danger"
                  >
                    Confirmar
                  </button>
                  <button onClick={() => setConfirmingId(null)} className="mini-btn">
                    Cancelar
                  </button>
                </span>
              </>
            ) : (
              <>
                <button onClick={() => startEditing(account)} className="ae-name truncate">
                  {account.name}
                </button>
                <button
                  onClick={() => empty && setConfirmingId(account.id)}
                  disabled={!empty}
                  title={empty ? undefined : 'Só é possível excluir contas sem movimentações e com saldo zero'}
                  className="ae-del"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        );
      })}
    </Modal>
  );
}
