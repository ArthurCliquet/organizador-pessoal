import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useToast } from '../contexts/ToastContext';
import type { Account, Category, CategoryLimit, Transaction } from '../types';
import {
  getAccounts,
  createAccount,
  ensureDefaultCategories,
  getTransactions,
  updateAccountInitialBalance,
  createTransaction,
  getCategoryLimits,
  createCategoryLimit,
  updateCategoryLimit,
  deleteCategoryLimit,
} from '../features/finance/financeApi';
import { Balance } from '../features/finance/Balance';
import { MonthSummary } from '../features/finance/MonthSummary';
import { MonthlyLimits } from '../features/finance/MonthlyLimits';
import { RecentTransactions } from '../features/finance/RecentTransactions';
import { AddTransactionModal } from '../features/finance/AddTransactionModal';
import { CreateAccountModal } from '../features/finance/CreateAccountModal';

export function FinancePage() {
  const { showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [accs, cats, limits] = await Promise.all([getAccounts(), ensureDefaultCategories(), getCategoryLimits()]);
      setAccounts(accs);
      setCategories(cats);
      setCategoryLimits(limits);
      setTransactions(await getTransactions());
    } catch {
      showError('Não foi possível carregar seus dados financeiros.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateAccount(input: { name: string; initialBalance: number }) {
    setCreatingAccount(true);
    try {
      const account = await createAccount(input.name, input.initialBalance);
      setAccounts((prev) => [...prev, account]);
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        showError('Você já tem uma conta com esse nome.');
      } else {
        showError('Não foi possível criar a conta.');
      }
    } finally {
      setCreatingAccount(false);
    }
  }

  async function handleUpdateInitialBalance(accountId: string, value: number) {
    try {
      await updateAccountInitialBalance(accountId, value);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, initial_balance: value } : a)));
    } catch {
      showError('Não foi possível atualizar o saldo.');
    }
  }

  async function handleCreateCategoryLimit(categoryId: string, monthlyLimit: number) {
    try {
      const limit = await createCategoryLimit(categoryId, monthlyLimit);
      setCategoryLimits((prev) => [...prev, limit]);
    } catch {
      showError('Não foi possível criar o limite.');
    }
  }

  async function handleUpdateCategoryLimit(id: string, monthlyLimit: number) {
    try {
      await updateCategoryLimit(id, monthlyLimit);
      setCategoryLimits((prev) => prev.map((l) => (l.id === id ? { ...l, monthly_limit: monthlyLimit } : l)));
    } catch {
      showError('Não foi possível atualizar o limite.');
    }
  }

  async function handleDeleteCategoryLimit(id: string) {
    try {
      await deleteCategoryLimit(id);
      setCategoryLimits((prev) => prev.filter((l) => l.id !== id));
    } catch {
      showError('Não foi possível remover o limite.');
    }
  }

  async function handleCreateTransaction(input: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryId: string | null;
    accountId: string;
  }) {
    try {
      await createTransaction(input);
      setTransactions(await getTransactions());
      setAddOpen(false);
    } catch {
      showError('Não foi possível salvar a movimentação.');
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center gap-3 min-h-[50vh]">
        <p className="text-sm text-app-muted">Não foi possível carregar seus dados financeiros.</p>
        <button
          onClick={() => load()}
          className="font-mono text-xs px-4 py-2 rounded bg-primary text-app-bg font-semibold"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return <CreateAccountModal onCreate={handleCreateAccount} creating={creatingAccount} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Finanças</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="font-mono text-xs px-4 py-2.5 rounded-full bg-primary text-app-bg font-semibold hover:bg-primary-bright transition-colors"
        >
          + Adicionar movimentação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <Card>
          <Balance accounts={accounts} transactions={transactions} onUpdateInitialBalance={handleUpdateInitialBalance} />
        </Card>
        <Card>
          <MonthlyLimits
            categoryLimits={categoryLimits}
            categories={categories}
            transactions={transactions}
            onCreate={handleCreateCategoryLimit}
            onUpdate={handleUpdateCategoryLimit}
            onDelete={handleDeleteCategoryLimit}
          />
        </Card>
      </div>

      <Card>
        <MonthSummary transactions={transactions} />
      </Card>

      <Card>
        <RecentTransactions transactions={transactions} categories={categories} accounts={accounts} />
      </Card>

      {addOpen && (
        <AddTransactionModal
          categories={categories}
          accounts={accounts}
          onCancel={() => setAddOpen(false)}
          onSave={handleCreateTransaction}
        />
      )}
    </div>
  );
}
