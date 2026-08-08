import { supabase } from '../../lib/supabase';
import type { Account, Category, Transaction } from '../../types';

const DEFAULT_CATEGORIES: { name: string; type: Category['type'] }[] = [
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Compras', type: 'expense' },
  { name: 'Educação', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Casa', type: 'expense' },
  { name: 'Assinaturas', type: 'expense' },
  { name: 'Roupas', type: 'expense' },
  { name: 'Outros', type: 'expense' },
  { name: 'Salário', type: 'income' },
  { name: 'Presente', type: 'income' },
  { name: 'Mesada', type: 'income' },
  { name: 'Investimentos', type: 'income' },
  { name: 'Outros', type: 'income' },
];

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
  if (error) {
    if (error.code === '23505') {
      const { data: retry, error: retryError } = await supabase.from('categories').select('*').order('created_at');
      if (retryError) throw retryError;
      return retry;
    }
    throw error;
  }
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

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createAccount(name: string, initialBalance: number): Promise<Account> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('accounts')
    .insert({ name, initial_balance: initialBalance, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export function calculateBalance(account: Account, transactions: Transaction[]): number {
  const net = transactions
    .filter((t) => t.account_id === account.id)
    .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return Number(account.initial_balance) + net;
}

export function calculateTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts.reduce((sum, account) => sum + calculateBalance(account, transactions), 0);
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
