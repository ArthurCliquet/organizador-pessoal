import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { isAccountEmpty } from './financeApi';

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div
        className="bg-surface border border-surface-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg">Editar contas</h3>

        <div className="flex flex-col gap-3">
          {accounts.map((account) => {
            const empty = isAccountEmpty(account, transactions);
            return (
              <div key={account.id} className="flex flex-col gap-1.5 pb-3 border-b border-surface-2 last:border-none last:pb-0">
                {editingId === account.id ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(account.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
                      />
                      <button
                        onClick={() => handleSaveName(account.id)}
                        className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setNameError('');
                          setEditingId(null);
                        }}
                        className="font-mono text-xs px-3 py-1.5 rounded text-app-muted hover:text-app-text"
                      >
                        Cancelar
                      </button>
                    </div>
                    {nameError && <p className="text-xs text-danger">{nameError}</p>}
                  </div>
                ) : confirmingId === account.id ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Excluir "{account.name}"?</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          onDelete(account.id);
                          setConfirmingId(null);
                        }}
                        className="font-mono text-xs px-3 py-1.5 rounded bg-danger text-app-bg font-semibold"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="font-mono text-xs px-3 py-1.5 rounded text-app-muted hover:text-app-text"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => startEditing(account)}
                      className="text-sm text-left truncate hover:text-primary-bright transition-colors"
                    >
                      {account.name}
                    </button>
                    <button
                      onClick={() => empty && setConfirmingId(account.id)}
                      disabled={!empty}
                      title={empty ? undefined : 'Só é possível excluir contas sem movimentações e com saldo zero'}
                      className="text-app-muted hover:text-danger text-xs disabled:opacity-30 disabled:hover:text-app-muted disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-1">
          <button type="button" onClick={onCancel} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
