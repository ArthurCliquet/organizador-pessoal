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
  updateAccountName,
  deleteAccount,
  createTransaction,
  createTransfer,
  updateInvestmentValue,
  calculateContributedTotal,
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
import { TransferModal } from '../features/finance/TransferModal';
import { ManageAccountsModal } from '../features/finance/ManageAccountsModal';

export function FinancePage() {
  const { showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);
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

  async function handleCreateAccount(input: { name: string; initialBalance: number; isInvestment: boolean }) {
    setCreatingAccount(true);
    try {
      const account = await createAccount(input.name, input.initialBalance, input.isInvestment);
      setAccounts((prev) => [...prev, account]);
      setNewAccountOpen(false);
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

  async function handleRenameAccount(accountId: string, name: string) {
    try {
      await updateAccountName(accountId, name);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, name } : a)));
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        showError('Você já tem uma conta com esse nome.');
      } else {
        showError('Não foi possível renomear a conta.');
      }
    }
  }

  async function handleDeleteAccount(accountId: string) {
    try {
      await deleteAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch {
      showError('Não foi possível excluir a conta.');
    }
  }

  async function handleUpdateInvestmentValue(accountId: string, currentValue: number) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const contributed = calculateContributedTotal(account, transactions);
    try {
      await updateInvestmentValue(accountId, currentValue, contributed);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, value_adjustment: currentValue - contributed } : a)));
    } catch {
      showError('Não foi possível atualizar o valor da conta.');
    }
  }

  async function handleCreateTransfer(input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) {
    try {
      await createTransfer(input);
      setTransactions(await getTransactions());
      setTransferOpen(false);
    } catch {
      showError('Não foi possível salvar a transferência.');
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-2">
        <h1 className="font-display text-2xl font-semibold">Finanças</h1>
        <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
            <button
              onClick={() => setNewAccountOpen(true)}
              className="shrink-0 whitespace-nowrap font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
            >
              + Nova conta
            </button>
            <button
              onClick={() => setManageAccountsOpen(true)}
              className="shrink-0 whitespace-nowrap font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
            >
              Editar contas
            </button>
            {accounts.length >= 2 && (
              <button
                onClick={() => setTransferOpen(true)}
                className="shrink-0 whitespace-nowrap font-mono text-xs px-4 py-2.5 rounded-full bg-surface-2 text-app-text font-semibold hover:text-primary-bright transition-colors"
              >
                Transferir
              </button>
            )}
          </div>
          {accounts.some((a) => !a.is_investment) && (
            <button
              onClick={() => setAddOpen(true)}
              className="shrink-0 whitespace-nowrap font-mono text-xs px-4 py-2.5 rounded-full bg-primary text-app-bg font-semibold hover:bg-primary-bright transition-colors md:ml-2"
            >
              + Adicionar movimentação
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        <Card>
          <Balance
            accounts={accounts}
            transactions={transactions}
            onUpdateInitialBalance={handleUpdateInitialBalance}
            onUpdateInvestmentValue={handleUpdateInvestmentValue}
          />
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
        <MonthSummary transactions={transactions} accounts={accounts} />
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

      {newAccountOpen && (
        <CreateAccountModal onCreate={handleCreateAccount} creating={creatingAccount} onCancel={() => setNewAccountOpen(false)} />
      )}

      {transferOpen && <TransferModal accounts={accounts} onCancel={() => setTransferOpen(false)} onSave={handleCreateTransfer} />}

      {manageAccountsOpen && (
        <ManageAccountsModal
          accounts={accounts}
          transactions={transactions}
          onRename={handleRenameAccount}
          onDelete={handleDeleteAccount}
          onCancel={() => setManageAccountsOpen(false)}
        />
      )}
    </div>
  );
}
