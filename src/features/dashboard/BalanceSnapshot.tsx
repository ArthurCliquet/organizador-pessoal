import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Account, Transaction } from '../../types';
import { getAccounts, getTransactions, calculateBalance, calculateTotalBalance, calculateTotalInvested } from '../finance/financeApi';
import { formatCurrency } from '../../lib/currency';
import { useToast } from '../../contexts/ToastContext';

function accountInitials(name: string): string {
  return name.slice(0, 2).toUpperCase() || '?';
}

export function BalanceSnapshot() {
  const { showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    try {
      const [accs, tx] = await Promise.all([getAccounts(), getTransactions()]);
      setAccounts(accs);
      setTransactions(tx);
    } catch {
      showError('Não foi possível carregar o saldo.');
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const normalAccounts = accounts.filter((a) => !a.is_investment);
  const investmentAccounts = accounts.filter((a) => a.is_investment);
  const totalAvailable = calculateTotalBalance(accounts, transactions);
  const totalInvested = calculateTotalInvested(accounts, transactions);

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-baseline justify-between mb-4">
        <Link to="/financas" className="block-title-link accent-primary font-display text-lg font-semibold">
          Saldo disponível <span className="go-arrow">→ finanças</span>
        </Link>
      </div>

      <span className="font-display text-3xl font-semibold text-app-text mb-3">{formatCurrency(totalAvailable)}</span>

      {normalAccounts.length === 0 ? (
        <p className="text-sm text-app-muted">Nenhuma conta ainda</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {normalAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-surface-2 text-primary font-mono text-[0.55rem] flex items-center justify-center shrink-0">
                  {accountInitials(account.name)}
                </span>
                <span className="text-sm truncate">{account.name}</span>
              </span>
              <span className="font-mono text-sm whitespace-nowrap">{formatCurrency(calculateBalance(account, transactions))}</span>
            </div>
          ))}
        </div>
      )}

      {investmentAccounts.length > 0 && (
        <>
          <h3 className="font-display text-lg font-semibold mt-5 mb-1">Investido</h3>
          <span className="font-display text-2xl font-semibold text-app-text">{formatCurrency(totalInvested)}</span>
        </>
      )}
    </div>
  );
}
