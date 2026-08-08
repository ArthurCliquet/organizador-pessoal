import { startOfMonth, endOfMonth } from 'date-fns';
import type { Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { calculateMonthSummary } from './financeApi';
import { formatCurrency } from '../../lib/currency';

interface MonthSummaryProps {
  transactions: Transaction[];
}

export function MonthSummary({ transactions }: MonthSummaryProps) {
  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));
  const { income, expense } = calculateMonthSummary(transactions, monthStart, monthEnd);

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Resumo do mês</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Entradas</p>
          <p className="font-display text-xl font-semibold text-success">{formatCurrency(income)}</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Gastos</p>
          <p className="font-display text-xl font-semibold text-danger">{formatCurrency(expense)}</p>
        </div>
      </div>
    </div>
  );
}
