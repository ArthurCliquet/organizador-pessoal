import { startOfMonth, endOfMonth } from 'date-fns';
import type { Account, Transaction } from '../../types';
import { toISODate } from '../calendar/dateUtils';
import { calculateMonthSummary } from './financeApi';
import { formatCurrency } from '../../lib/currency';

interface MonthSummaryProps {
  transactions: Transaction[];
  accounts: Account[];
}

export function MonthSummary({ transactions, accounts }: MonthSummaryProps) {
  const now = new Date();
  const monthStart = toISODate(startOfMonth(now));
  const monthEnd = toISODate(endOfMonth(now));
  const { income, expense, invested } = calculateMonthSummary(transactions, monthStart, monthEnd, accounts);
  const net = income - expense;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="font-display text-lg font-semibold mb-4">Resumo do mês</h2>
      <div className="flex flex-wrap gap-x-16 gap-y-4">
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Entradas</p>
          <p className="font-display text-xl font-semibold text-success">{formatCurrency(income)}</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Gastos</p>
          <p className="font-display text-xl font-semibold text-danger">{formatCurrency(expense)}</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Lucro / perda</p>
          <p className={`font-display text-xl font-semibold ${net >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(net)}</p>
        </div>
        <div>
          <p className="font-mono text-[0.65rem] text-app-muted-2 mb-1">Investido</p>
          <p className="font-display text-xl font-semibold text-primary">{formatCurrency(invested)}</p>
        </div>
      </div>
    </div>
  );
}
