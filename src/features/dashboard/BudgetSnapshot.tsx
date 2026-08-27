import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Category, CategoryLimit, Transaction } from '../../types';
import { getCategoryLimits, ensureDefaultCategories, getTransactionsForRange, calculateCategorySpending } from '../finance/financeApi';
import { toISODate } from '../calendar/dateUtils';
import { useToast } from '../../contexts/ToastContext';

function valueTone(percent: number): string {
  if (percent >= 90) return 'text-danger';
  if (percent >= 70) return 'text-app-text';
  return 'text-success';
}

export function BudgetSnapshot() {
  const { showError } = useToast();
  const [limits, setLimits] = useState<CategoryLimit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const monthStart = toISODate(startOfMonth(now));
      const monthEnd = toISODate(endOfMonth(now));
      const [l, c, tx] = await Promise.all([
        getCategoryLimits(),
        ensureDefaultCategories(),
        getTransactionsForRange(monthStart, monthEnd),
      ]);
      setLimits(l);
      setCategories(c);
      setTransactions(tx);
    } catch {
      showError('Não foi possível carregar o orçamento do mês.');
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));

  function categoryName(categoryId: string) {
    return categories.find((c) => c.id === categoryId)?.name ?? 'Categoria removida';
  }

  const rows = limits
    .map((limit) => {
      const spent = calculateCategorySpending(limit.category_id, transactions, monthStart, monthEnd);
      const percent = Math.round((spent / Number(limit.monthly_limit)) * 100);
      return { limit, percent, name: categoryName(limit.category_id) };
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3);

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-baseline justify-between mb-4">
        <Link to="/financas" className="block-title-link accent-success font-display text-lg font-semibold">
          Orçamento <span className="go-arrow">→ finanças</span>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div>
          <p className="text-sm text-app-muted">Nenhum limite definido</p>
          <p className="text-xs text-app-muted-2 mt-1">
            Crie um em{' '}
            <Link to="/financas" className="text-primary">
              Finanças
            </Link>
          </p>
        </div>
      ) : (
        rows.map(({ limit, percent, name }) => (
          <div key={limit.id} className="flex items-baseline gap-2 py-[0.42rem] text-[0.85rem]">
            <span className="text-app-muted whitespace-nowrap truncate">{name}</span>
            <span className="ledger-leader" />
            <span className={`tabular-nums font-medium whitespace-nowrap ${valueTone(percent)}`}>{percent}%</span>
          </div>
        ))
      )}
    </div>
  );
}
