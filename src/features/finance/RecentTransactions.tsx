import { startOfMonth, endOfMonth } from 'date-fns';
import type { Account, Category, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { formatCurrency } from '../../lib/currency';
import { formatRelativeDate } from '../../lib/relativeDate';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onEdit?: (transaction: Transaction) => void;
}

export function RecentTransactions({ transactions, categories, accounts, onEdit }: RecentTransactionsProps) {
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
      <h2 className="text-base font-semibold mb-3">Últimas movimentações</h2>
      {recent.length === 0 && <p className="text-sm text-app-muted">Nenhuma movimentação ainda</p>}
      {recent.length > 0 && (
        <div className={`overflow-x-auto ${recent.length > 8 ? 'max-h-[340px] overflow-y-auto scrollbar-thin' : ''}`}>
          <table className="txt">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th className="hidden sm:table-cell">Categoria</th>
                <th className="hidden sm:table-cell">Conta</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => {
                const editable = !!onEdit;
                return (
                  <tr
                    key={t.id}
                    onClick={editable ? () => onEdit!(t) : undefined}
                    role={editable ? 'button' : undefined}
                    tabIndex={editable ? 0 : undefined}
                    onKeyDown={
                      editable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onEdit!(t);
                            }
                          }
                        : undefined
                    }
                    className={editable ? 'editable' : ''}
                  >
                    <td className="dt">{formatRelativeDate(t.date)}</td>
                    <td className="truncate max-w-[180px]">{t.description || (t.type === 'transfer' ? 'Transferência' : 'Sem descrição')}</td>
                    <td className="hidden sm:table-cell">
                      {t.type === 'transfer' ? (
                        <span className="ac">
                          {accountName(t.account_id)} → {accountName(t.to_account_id ?? '')}
                        </span>
                      ) : (
                        <span className="cat">{categoryName(t.category_id)}</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell ac">{t.type === 'transfer' ? '—' : accountName(t.account_id)}</td>
                    <td className={`a ${t.type === 'income' ? 'pos' : t.type === 'expense' ? 'neg' : 'transfer'}`}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
