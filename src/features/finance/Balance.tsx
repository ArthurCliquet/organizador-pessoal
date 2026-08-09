import { useState } from 'react';
import type { Account, Transaction } from '../../types';
import { calculateBalance, calculateContributedTotal, calculateTotalBalance, calculateTotalInvested } from './financeApi';
import { formatCurrency, parseCurrencyInput, formatAmountForInput } from '../../lib/currency';

interface BalanceProps {
  accounts: Account[];
  transactions: Transaction[];
  onUpdateInitialBalance: (accountId: string, value: number) => void;
  onUpdateInvestmentValue: (accountId: string, currentValue: number) => void;
}

function accountInitials(name: string): string {
  return name.slice(0, 2).toUpperCase() || '?';
}

export function Balance({ accounts, transactions, onUpdateInitialBalance, onUpdateInvestmentValue }: BalanceProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [saveError, setSaveError] = useState('');

  const normalAccounts = accounts.filter((a) => !a.is_investment);
  const investmentAccounts = accounts.filter((a) => a.is_investment);
  const totalAvailable = calculateTotalBalance(accounts, transactions);
  const totalInvested = calculateTotalInvested(accounts, transactions);

  function startEditing(account: Account) {
    setEditingId(account.id);
    setValue(formatAmountForInput(account.is_investment ? calculateBalance(account, transactions) : account.initial_balance));
    setSaveError('');
  }

  function handleSave(account: Account) {
    const parsed = parseCurrencyInput(value);
    if (parsed === null) {
      setSaveError('Valor inválido');
      return;
    }
    setSaveError('');
    if (account.is_investment) {
      onUpdateInvestmentValue(account.id, parsed);
    } else {
      onUpdateInitialBalance(account.id, parsed);
    }
    setEditingId(null);
  }

  function renderEditor(account: Account) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave(account);
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="flex-1 bg-app-bg border border-primary rounded px-2 py-1 text-sm text-app-text outline-none"
          />
          <button onClick={() => handleSave(account)} className="font-mono text-xs px-3 py-1.5 rounded bg-primary text-app-bg font-semibold">
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
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-1">Saldo disponível</h2>
      <span className="font-display text-3xl font-semibold text-app-text mb-3">{formatCurrency(totalAvailable)}</span>

      <div className="flex flex-col gap-0.5">
        {normalAccounts.map((account) => (
          <div key={account.id} className="flex flex-col gap-1 py-1.5">
            {editingId === account.id ? (
              renderEditor(account)
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

      {normalAccounts.length > 0 && (
        <p className="font-mono text-[0.6rem] text-app-muted-2 mt-2">Clique numa conta para ajustar o saldo inicial dela</p>
      )}

      {investmentAccounts.length > 0 && (
        <>
          <h2 className="font-display text-lg font-semibold mt-5 mb-1">Investido</h2>
          <span className="font-display text-2xl font-semibold text-app-text mb-3">{formatCurrency(totalInvested)}</span>

          <div className="flex flex-col gap-0.5">
            {investmentAccounts.map((account) => {
              const current = calculateBalance(account, transactions);
              const contributed = calculateContributedTotal(account, transactions);
              const gain = current - contributed;
              const gainPercent = contributed > 0 ? (gain / contributed) * 100 : null;
              return (
                <div key={account.id} className="flex flex-col gap-1 py-1.5">
                  {editingId === account.id ? (
                    renderEditor(account)
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
                      <span className="flex flex-col items-end shrink-0">
                        <span className="font-mono text-sm whitespace-nowrap">{formatCurrency(current)}</span>
                        {(current !== 0 || contributed !== 0) && (
                          <span className={`font-mono text-[0.65rem] whitespace-nowrap ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                            {gain >= 0 ? '+' : ''}
                            {formatCurrency(gain)}
                            {gainPercent !== null &&
                              ` (${gainPercent >= 0 ? '+' : ''}${gainPercent.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}%)`}
                          </span>
                        )}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="font-mono text-[0.6rem] text-app-muted-2 mt-2">Clique numa conta de investimento para atualizar o valor atual</p>
        </>
      )}
    </div>
  );
}
