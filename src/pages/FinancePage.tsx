import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Category, Transaction } from '../types';
import {
  getOrCreateDefaultAccount,
  ensureDefaultCategories,
  getAccountTransactions,
  updateAccountInitialBalance,
} from '../features/finance/financeApi';
import { Balance } from '../features/finance/Balance';
import { MonthSummary } from '../features/finance/MonthSummary';
import { AvailableToSpend } from '../features/finance/AvailableToSpend';
import { RecentTransactions } from '../features/finance/RecentTransactions';

export function FinancePage() {
  const { showError } = useToast();
  const [account, setAccount] = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [acc, cats] = await Promise.all([getOrCreateDefaultAccount(), ensureDefaultCategories()]);
      setAccount(acc);
      setCategories(cats);
      setTransactions(await getAccountTransactions(acc.id));
    } catch {
      showError('Não foi possível carregar seus dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdateInitialBalance(value: number) {
    if (!account) return;
    try {
      await updateAccountInitialBalance(account.id, value);
      setAccount({ ...account, initial_balance: value });
    } catch {
      showError('Não foi possível atualizar o saldo.');
    }
  }

  if (loading || !account) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Finanças</h1>
        <button className="font-mono text-xs px-4 py-2.5 rounded-full bg-primary text-app-bg font-semibold hover:bg-primary-bright transition-colors">
          + Adicionar movimentação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <Card>
          <Balance account={account} transactions={transactions} onUpdateInitialBalance={handleUpdateInitialBalance} />
        </Card>
        <Card>
          <AvailableToSpend />
        </Card>
      </div>

      <Card>
        <MonthSummary transactions={transactions} />
      </Card>

      <Card>
        <RecentTransactions transactions={transactions} categories={categories} account={account} />
      </Card>
    </div>
  );
}
