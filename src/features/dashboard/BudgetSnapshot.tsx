import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Category, CategoryLimit, Transaction } from '../../types';
import { getCategoryLimits, ensureDefaultCategories, getTransactionsForRange, calculateCategorySpending } from '../finance/financeApi';
import { toISODate } from '../calendar/dateUtils';
import { formatCurrency } from '../../lib/currency';
import { useToast } from '../../contexts/ToastContext';

function valueTone(percent: number): string {
  if (percent >= 90) return 'text-danger';
  if (percent >= 70) return 'text-app-text';
  return 'text-success';
}

// Mesma escala de cor das barras de limite em Finanças (MonthlyLimits).
function barColor(percent: number): string {
  if (percent >= 100) return 'bg-danger';
  if (percent >= 70) return 'bg-yellow-500';
  return 'bg-success';
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

  const allRows = limits.map((limit) => {
    const spent = calculateCategorySpending(limit.category_id, transactions, monthStart, monthEnd);
    const limitValue = Number(limit.monthly_limit);
    const percent = limitValue > 0 ? Math.round((spent / limitValue) * 100) : 0;
    return { limit, spent, limitValue, percent, name: categoryName(limit.category_id) };
  });

  const rows = [...allRows].sort((a, b) => b.percent - a.percent).slice(0, 4);
  const totalSpent = allRows.reduce((sum, r) => sum + r.spent, 0);
  const totalLimit = allRows.reduce((sum, r) => sum + r.limitValue, 0);
  const totalPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

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
        <>
          <div className="flex flex-col gap-3.5">
            {rows.map(({ limit, percent, name }) => (
              <div key={limit.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-[0.8rem]">
                  <span className="text-app-muted truncate">{name}</span>
                  <span className={`tabular-nums font-medium whitespace-nowrap ${valueTone(percent)}`}>{percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor(percent)}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-surface-border/60">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-app-muted-2">Total do mês</span>
              <span className="font-mono text-[0.72rem] text-app-muted-2">
                <b className={`font-semibold ${valueTone(totalPercent)}`}>{formatCurrency(totalSpent)}</b> / {formatCurrency(totalLimit)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor(totalPercent)}`}
                style={{ width: `${Math.min(totalPercent, 100)}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
