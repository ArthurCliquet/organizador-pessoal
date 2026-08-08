import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { calculateBalance, calculateTotalBalance } from './financeApi';
import { formatCurrency, parseCurrencyInput } from '../../lib/currency';

interface BalanceProps {
  accounts: Account[];
  transactions: Transaction[];
  onUpdateInitialBalance: (accountId: string, value: number) => void;
}

function accountInitials(name: string): string {
  return name.slice(0, 2).toUpperCase() || '?';
}

export function Balance({ accounts, transactions, onUpdateInitialBalance }: BalanceProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [saveError, setSaveError] = useState('');

  const total = calculateTotalBalance(accounts, transactions);

  function startEditing(account: Account) {
    setEditingId(account.id);
    setValue(String(account.initial_balance));
    setSaveError('');
  }

  function handleSave(accountId: string) {
    const parsed = parseCurrencyInput(value);
    if (parsed === null) {
      setSaveError('Valor inválido');
      return;
    }
    setSaveError('');
    onUpdateInitialBalance(accountId, parsed);
    setEditingId(null);
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-1">Saldo atual</h2>
      <span className="font-display text-3xl font-semibold text-app-text mb-3">{formatCurrency(total)}</span>

      <div className="flex flex-col gap-0.5">
        {accounts.map((account) => (
          <div key={account.id} className="flex flex-col gap-1 py-1.5">
            {editingId === account.id ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(account.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
                  />
                  <button
                    onClick={() => handleSave(account.id)}
                    className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setSaveError('');
                      setEditingId(null);
                    }}
                    className="font-mono text-xs px-3 py-1.5 rounded text-app-muted hover:text-app-text"
                  >
                    Cancelar
                  </button>
                </div>
                {saveError && <p className="text-xs text-danger">{saveError}</p>}
              </div>
            ) : (
              <button
                onClick={() => startEditing(account)}
                className="flex items-center justify-between gap-2 text-left hover:text-primary-bright transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-surface-2 text-primary font-mono text-[0.55rem] flex items-center justify-center shrink-0">
                    {accountInitials(account.name)}
                  </span>
                  <span className="text-sm truncate">{account.name}</span>
                </span>
                <span className="font-mono text-sm whitespace-nowrap">{formatCurrency(calculateBalance(account, transactions))}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="font-mono text-[0.6rem] text-app-muted-2 mt-2">Clique numa conta para ajustar o saldo inicial dela</p>
    </div>
  );
}
