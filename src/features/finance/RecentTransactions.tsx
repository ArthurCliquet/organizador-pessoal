import { startOfMonth, endOfMonth } from 'date-fns';
import type { Account, Category, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { formatCurrency } from '../../lib/currency';
import { formatRelativeDate } from '../../lib/relativeDate';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export function RecentTransactions({ transactions, categories, accounts }: RecentTransactionsProps) {
  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));
  const recent = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);

  function categoryName(categoryId: string | null) {
    if (!categoryId) return 'Sem categoria';
    return categories.find((c) => c.id === categoryId)?.name ?? 'Sem categoria';
  }

  function accountName(accountId: string) {
    return accounts.find((a) => a.id === accountId)?.name ?? 'Conta removida';
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Últimas movimentações</h2>
      {recent.length === 0 && <p className="text-sm text-app-muted">Nenhuma movimentação ainda</p>}
      <div className={`flex flex-col ${recent.length > 5 ? 'max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin pr-1' : ''}`}>
        {recent.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 py-2.5 px-1.5 -mx-1.5 border-b border-surface-2 last:border-none"
          >
            <div className="min-w-0">
              <p className="text-sm text-app-text truncate">
                {t.description || (t.type === 'transfer' ? 'Transferência' : 'Sem descrição')}
              </p>
              <p className="font-mono text-[0.65rem] text-app-muted-2">
                {t.type === 'transfer'
                  ? `${accountName(t.account_id)} → ${accountName(t.to_account_id ?? '')} · ${formatRelativeDate(t.date)}`
                  : `${categoryName(t.category_id)} · ${accountName(t.account_id)} · ${formatRelativeDate(t.date)}`}
              </p>
            </div>
            <span
              className={`font-mono text-sm whitespace-nowrap ${
                t.type === 'income' ? 'text-success' : t.type === 'expense' ? 'text-danger' : 'text-primary'
              }`}
            >
              {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
              {formatCurrency(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
