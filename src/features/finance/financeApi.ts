import { supabase } from '../../lib/supabase';
import type { Account, Category, Transaction } from '../../types';

const DEFAULT_ACCOUNT_NAME = 'Nubank';

const DEFAULT_CATEGORIES: { name: string; type: Category['type'] }[] = [
  { name: 'Salário', type: 'income' },
  { name: 'Outras receitas', type: 'income' },
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Moradia', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Outros', type: 'expense' },
];

export async function getOrCreateDefaultAccount(): Promise<Account> {
  const { data: existing, error: fetchError } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at')
    .limit(1);
  if (fetchError) throw fetchError;
  if (existing.length > 0) return existing[0];

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('accounts')
    .insert({ name: DEFAULT_ACCOUNT_NAME, initial_balance: 0, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccountInitialBalance(id: string, initialBalance: number): Promise<void> {
  const { error } = await supabase.from('accounts').update({ initial_balance: initialBalance }).eq('id', id);
  if (error) throw error;
}

export async function ensureDefaultCategories(): Promise<Category[]> {
  const { data: existing, error: fetchError } = await supabase.from('categories').select('*').order('created_at');
  if (fetchError) throw fetchError;
  if (existing.length > 0) return existing;

  const { data: userData } = await supabase.auth.getUser();
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userData.user!.id }));
  const { data, error } = await supabase.from('categories').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function getAccountTransactions(accountId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTransaction(input: {
  accountId: string;
  categoryId: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
}): Promise<Transaction> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      account_id: input.accountId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      date: input.date,
      user_id: userData.user!.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function calculateBalance(account: Account, transactions: Transaction[]): number {
  const net = transactions.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return Number(account.initial_balance) + net;
}

export function calculateMonthSummary(
  transactions: Transaction[],
  monthStart: string,
  monthEnd: string,
): { income: number; expense: number } {
  return transactions.reduce(
    (acc, t) => {
      if (t.date < monthStart || t.date > monthEnd) return acc;
      if (t.type === 'income') acc.income += Number(t.amount);
      else acc.expense += Number(t.amount);
      return acc;
    },
    { income: 0, expense: 0 },
  );
}
