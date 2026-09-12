import { startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { calculateCategorySpending } from '../finance/financeApi';
import { toISODate } from '../calendar/dateUtils';
import { formatCurrency } from '../../lib/currency';
import { useFinanceData } from '../../contexts/FinanceDataContext';

// Mesma escala de cor das barras de limite em Finanças (MonthlyLimits).
function barTone(percent: number): 'hot' | 'warn' | 'ok' {
  if (percent >= 85) return 'hot';
  if (percent >= 60) return 'warn';
  return 'ok';
}

function valueTone(percent: number): string {
  const tone = barTone(percent);
  if (tone === 'hot') return 'text-danger';
  if (tone === 'warn') return 'text-warn';
  return 'text-success';
}

export function BudgetSnapshot() {
  const { categoryLimits: limits, categories, transactions } = useFinanceData();

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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-baseline justify-between mb-3 shrink-0">
        <h2 className="text-base font-semibold">Orçamento do mês</h2>
        <Link to="/financas" className="text-xs text-app-muted-2 hover:text-primary-bright transition-colors">
          Finanças
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
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain scrollbar-thin">
          <div className="flex flex-col gap-3">
            {rows.map(({ limit, percent, name }) => (
              <div key={limit.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-[0.8rem]">
                  <span className="text-app-muted truncate">{name}</span>
                  <span className={`tabular-nums font-medium whitespace-nowrap font-mono text-[11.5px] ${valueTone(percent)}`}>{percent}%</span>
                </div>
                <div className="track">
                  <i className={`bar-fill ${barTone(percent)}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border-2">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-[11px] uppercase tracking-[0.04em] text-app-muted-2">Total do mês</span>
              <span className="font-mono text-[0.72rem] text-app-muted-2">
                <b className={`font-semibold ${valueTone(totalPercent)}`}>{formatCurrency(totalSpent)}</b> / {formatCurrency(totalLimit)}
              </span>
            </div>
            <div className="track">
              <i className={`bar-fill ${barTone(totalPercent)}`} style={{ width: `${Math.min(totalPercent, 100)}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
