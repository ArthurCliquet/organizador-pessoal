import { useState } from 'react';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { RevealOnMount } from '../components/common/RevealOnMount';
import { useToast } from '../contexts/ToastContext';
import { useFinanceData } from '../contexts/FinanceDataContext';
import type { Transaction } from '../types';
import {
  createAccount,
  updateAccountInitialBalance,
  updateAccountName,
  deleteAccount,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createTransfer,
  updateTransfer,
  updateInvestmentValue,
  calculateContributedTotal,
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
  const { accounts, categories, transactions, categoryLimits, loading, error, refresh } = useFinanceData();
  const [addOpen, setAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  async function handleCreateAccount(input: { name: string; initialBalance: number; isInvestment: boolean }) {
    setCreatingAccount(true);
    try {
      await createAccount(input.name, input.initialBalance, input.isInvestment);
      await refresh();
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
      await refresh();
    } catch {
      showError('Não foi possível atualizar o saldo.');
    }
  }

  async function handleRenameAccount(accountId: string, name: string) {
    try {
      await updateAccountName(accountId, name);
      await refresh();
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
      await refresh();
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
      await refresh();
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
      await refresh();
      setTransferOpen(false);
    } catch {
      showError('Não foi possível salvar a transferência.');
    }
  }

  async function handleUpdateTransfer(
    id: string,
    input: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string },
  ) {
    try {
      await updateTransfer(id, input);
      await refresh();
      setEditingTransaction(null);
    } catch {
      showError('Não foi possível atualizar a transferência.');
    }
  }

  async function handleCreateCategoryLimit(categoryId: string, monthlyLimit: number) {
    try {
      await createCategoryLimit(categoryId, monthlyLimit);
      await refresh();
    } catch {
      showError('Não foi possível criar o limite.');
    }
  }

  async function handleUpdateCategoryLimit(id: string, monthlyLimit: number) {
    try {
      await updateCategoryLimit(id, monthlyLimit);
      await refresh();
    } catch {
      showError('Não foi possível atualizar o limite.');
    }
  }

  async function handleDeleteCategoryLimit(id: string) {
    try {
      await deleteCategoryLimit(id);
      await refresh();
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
      await refresh();
      setAddOpen(false);
    } catch {
      showError('Não foi possível salvar a movimentação.');
    }
  }

  async function handleUpdateTransaction(
    id: string,
    input: {
      type: 'income' | 'expense';
      amount: number;
      description: string;
      date: string;
      categoryId: string | null;
      accountId: string;
    },
  ) {
    try {
      await updateTransaction(id, input);
      await refresh();
      setEditingTransaction(null);
    } catch {
      showError('Não foi possível atualizar a movimentação.');
    }
  }

  async function handleDeleteTransaction(id: string) {
    try {
      await deleteTransaction(id);
      await refresh();
      setEditingTransaction(null);
    } catch {
      showError('Não foi possível excluir a movimentação.');
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
          onClick={() => refresh()}
          className="font-mono text-xs px-4 py-2 rounded bg-primary text-on-primary font-semibold"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return <CreateAccountModal onCreate={handleCreateAccount} creating={creatingAccount} />;
  }

  const now = new Date();
  const monthTag = `${now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} ${now.getFullYear()}`;

  return (
    <RevealOnMount className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4">
      <div className="reveal-in flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-2">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-semibold text-app-text">Finanças</h1>
          <span className="font-mono text-xs text-app-muted-2">{monthTag}</span>
        </div>
        <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
            <button onClick={() => setNewAccountOpen(true)} className="btn shrink-0 whitespace-nowrap">
              Nova conta
            </button>
            <button onClick={() => setManageAccountsOpen(true)} className="btn shrink-0 whitespace-nowrap">
              Editar contas
            </button>
            {accounts.length >= 2 && (
              <button onClick={() => setTransferOpen(true)} className="btn shrink-0 whitespace-nowrap">
                Transferir
              </button>
            )}
          </div>
          {accounts.some((a) => !a.is_investment) && (
            <button onClick={() => setAddOpen(true)} className="btn primary shrink-0 whitespace-nowrap md:ml-2">
              + Adicionar movimentação
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <Card className="reveal-in">
          <Balance
            accounts={accounts}
            transactions={transactions}
            onUpdateInitialBalance={handleUpdateInitialBalance}
            onUpdateInvestmentValue={handleUpdateInvestmentValue}
          />
        </Card>
        <Card className="reveal-in">
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

      <Card className="reveal-in">
        <MonthSummary transactions={transactions} accounts={accounts} />
      </Card>

      <Card className="reveal-in">
        <RecentTransactions
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          onEdit={setEditingTransaction}
        />
      </Card>

      {addOpen && (
        <AddTransactionModal
          categories={categories}
          accounts={accounts}
          onCancel={() => setAddOpen(false)}
          onSave={handleCreateTransaction}
        />
      )}

      {editingTransaction && editingTransaction.type === 'transfer' && (
        <TransferModal
          accounts={accounts}
          transfer={editingTransaction}
          onCancel={() => setEditingTransaction(null)}
          onSave={(input) => handleUpdateTransfer(editingTransaction.id, input)}
          onDelete={() => handleDeleteTransaction(editingTransaction.id)}
        />
      )}

      {editingTransaction && editingTransaction.type !== 'transfer' && (
        <AddTransactionModal
          categories={categories}
          accounts={accounts}
          transaction={editingTransaction}
          onCancel={() => setEditingTransaction(null)}
          onSave={(input) => handleUpdateTransaction(editingTransaction.id, input)}
          onDelete={() => handleDeleteTransaction(editingTransaction.id)}
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
    </RevealOnMount>
  );
}
