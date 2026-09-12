import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Account, Category, CategoryLimit, Transaction } from '../types';
import { getAccounts, ensureDefaultCategories, getCategoryLimits, getTransactions } from '../features/finance/financeApi';
import { useToast } from './ToastContext';

interface FinanceDataContextValue {
  accounts: Account[];
  categories: Category[];
  categoryLimits: CategoryLimit[];
  transactions: Transaction[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const FinanceDataContext = createContext<FinanceDataContextValue | undefined>(undefined);

export function FinanceDataProvider({ children }: { children: ReactNode }) {
  const { showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setError(false);
    try {
      const [accs, cats, limits, txs] = await Promise.all([
        getAccounts(),
        ensureDefaultCategories(),
        getCategoryLimits(),
        getTransactions(),
      ]);
      setAccounts(accs);
      setCategories(cats);
      setCategoryLimits(limits);
      setTransactions(txs);
    } catch {
      showError('Não foi possível carregar seus dados financeiros.');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <FinanceDataContext.Provider value={{ accounts, categories, categoryLimits, transactions, loading, error, refresh }}>
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData(): FinanceDataContextValue {
  const ctx = useContext(FinanceDataContext);
  if (!ctx) throw new Error('useFinanceData must be used within FinanceDataProvider');
  return ctx;
}
