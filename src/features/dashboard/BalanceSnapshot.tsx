import { useEffect, useState, useCallback } from 'react';
import type { Account, Transaction } from '../../types';
import { getAccounts, getTransactions, calculateTotalBalance } from '../finance/financeApi';
import { formatCurrency } from '../../lib/currency';
import { useToast } from '../../contexts/ToastContext';

export function BalanceChip() {
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

  if (accounts.length === 0) return null;

  const totalAvailable = calculateTotalBalance(accounts, transactions);

  return (
    <span className="chip">
      Saldo do mês <b className="num">{formatCurrency(totalAvailable)}</b>
    </span>
  );
}
