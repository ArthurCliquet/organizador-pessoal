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

export function FinancePage() {
  const { showError } = useToast();
  const [account, setAccount] = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  // `categories` is loaded here for Tasks 6-10, which will pass it as props to the real card
  // components (this placeholder shell doesn't render it yet).
  void categories;

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
          <h2 className="font-display text-lg font-semibold mb-1">Quanto posso gastar</h2>
          <p className="text-sm text-app-muted">Em breve</p>
        </Card>
      </div>

      <Card>
        <MonthSummary transactions={transactions} />
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold mb-1">Últimas movimentações</h2>
        <p className="text-sm text-app-muted">
          {transactions.length === 0 ? 'Nenhuma movimentação ainda' : `${transactions.length} movimentações`}
        </p>
      </Card>
    </div>
  );
}
