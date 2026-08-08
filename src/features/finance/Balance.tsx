import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { calculateBalance } from './financeApi';
import { formatCurrency } from '../../lib/currency';

interface BalanceProps {
  account: Account;
  transactions: Transaction[];
  onUpdateInitialBalance: (value: number) => void;
}

export function Balance({ account, transactions, onUpdateInitialBalance }: BalanceProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const balance = calculateBalance(account, transactions);

  function startEditing() {
    setValue(String(account.initial_balance));
    setEditing(true);
  }

  function handleSave() {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isNaN(parsed)) return;
    onUpdateInitialBalance(parsed);
    setEditing(false);
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-1">Saldo atual</h2>
      <p className="font-mono text-[0.65rem] text-app-muted-2 mb-3">{account.name}</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-2xl font-display text-app-text outline-none"
          />
          <button onClick={handleSave} className="font-mono text-xs px-3 py-2 rounded bg-primary text-app-bg font-semibold">
            Salvar
          </button>
          <button onClick={() => setEditing(false)} className="font-mono text-xs px-3 py-2 rounded text-app-muted hover:text-app-text">
            Cancelar
          </button>
        </div>
      ) : (
        <button onClick={startEditing} className="text-left">
          <span className="font-display text-3xl font-semibold text-app-text hover:text-primary-bright transition-colors">
            {formatCurrency(balance)}
          </span>
        </button>
      )}
      <p className="font-mono text-[0.6rem] text-app-muted-2 mt-2">Clique no saldo para ajustar o saldo inicial da conta</p>
    </div>
  );
}
