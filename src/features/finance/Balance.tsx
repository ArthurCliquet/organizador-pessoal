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
      <div className="flex flex-col gap-1 py-1.5 w-full">
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
            className="input flex-1"
          />
          <button onClick={() => handleSave(account)} className="mini-btn accent">
            Salvar
          </button>
          <button
            onClick={() => {
              setSaveError('');
              setEditingId(null);
            }}
            className="mini-btn"
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
      <h2 className="text-base font-semibold mb-1">Saldo disponível</h2>
      <span className="text-2xl font-semibold text-app-text font-mono">{formatCurrency(totalAvailable)}</span>

      <div className="flex flex-col mt-2">
        {normalAccounts.map((account) =>
          editingId === account.id ? (
            <div key={account.id}>{renderEditor(account)}</div>
          ) : (
            <button key={account.id} onClick={() => startEditing(account)} className="acct hover:text-primary-bright transition-colors">
              <span className="n truncate">{account.name}</span>
              <span className="v">{formatCurrency(calculateBalance(account, transactions))}</span>
            </button>
          ),
        )}
      </div>

      {normalAccounts.length > 0 && (
        <p className="text-[11px] text-app-muted-2 mt-2">Clique numa conta para ajustar o saldo inicial dela</p>
      )}

      {investmentAccounts.length > 0 && (
        <>
          <h2 className="text-base font-semibold mt-5 mb-1">Investido</h2>
          <span className="text-xl font-semibold text-app-text font-mono">{formatCurrency(totalInvested)}</span>

          <div className="flex flex-col mt-2">
            {investmentAccounts.map((account) => {
              const current = calculateBalance(account, transactions);
              const contributed = calculateContributedTotal(account, transactions);
              const gain = current - contributed;
              const gainPercent = contributed > 0 ? (gain / contributed) * 100 : null;
              return editingId === account.id ? (
                <div key={account.id}>{renderEditor(account)}</div>
              ) : (
                <button key={account.id} onClick={() => startEditing(account)} className="acct hover:text-primary-bright transition-colors">
                  <span className="n truncate">{account.name}</span>
                  <span className="flex flex-col items-end shrink-0">
                    <span className="v">{formatCurrency(current)}</span>
                    {(current !== 0 || contributed !== 0) && (
                      <span className={`sub ${gain < 0 ? '!text-danger' : ''}`}>
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
              );
            })}
          </div>

          <p className="text-[11px] text-app-muted-2 mt-2">Clique numa conta de investimento para atualizar o valor atual</p>
        </>
      )}
    </div>
  );
}
