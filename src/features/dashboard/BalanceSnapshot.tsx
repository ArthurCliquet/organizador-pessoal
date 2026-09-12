import { calculateTotalBalance } from '../finance/financeApi';
import { formatCurrency } from '../../lib/currency';
import { useFinanceData } from '../../contexts/FinanceDataContext';

export function BalanceChip() {
  const { accounts, transactions } = useFinanceData();

  if (accounts.length === 0) return null;

  const totalAvailable = calculateTotalBalance(accounts, transactions);

  return (
    <span className="chip">
      Saldo do mês <b className="num">{formatCurrency(totalAvailable)}</b>
    </span>
  );
}
