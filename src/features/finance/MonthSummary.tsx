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
  const total = income + expense;
  const incomePct = total > 0 ? (income / total) * 100 : 50;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-base font-semibold mb-3">Resumo do mês</h2>

      <div className="sline">
        <span className="n">Entradas</span>
        <span className="d" />
        <span className="v">{formatCurrency(income)}</span>
      </div>
      <div className="sline">
        <span className="n">Gastos</span>
        <span className="d" />
        <span className="v">{formatCurrency(expense)}</span>
      </div>

      <div className="stacked">
        <i className="bar-fill" style={{ width: `${incomePct}%`, background: 'var(--color-success)' }} />
        <i className="bar-fill" style={{ width: `${100 - incomePct}%`, background: 'var(--color-danger)' }} />
      </div>

      <hr className="rule" />

      <div className="sline">
        <span className="n text-app-text">Saldo</span>
        <span className="d" />
        <span className={`v big ${net >= 0 ? 'pos' : 'neg'}`}>{formatCurrency(net)}</span>
      </div>
      <div className="sline">
        <span className="n">Investido</span>
        <span className="d" />
        <span className="v">{formatCurrency(invested)}</span>
      </div>
    </div>
  );
}
