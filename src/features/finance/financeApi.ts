import { supabase } from '../../lib/supabase';
import type { Account, Category, CategoryLimit, Transaction } from '../../types';

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

export async function updateInvestmentValue(accountId: string, currentValue: number, contributedTotal: number): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ value_adjustment: currentValue - contributedTotal })
    .eq('id', accountId);
  if (error) throw error;
}

export async function updateAccountName(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('accounts').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
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

export async function createTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  date: string;
}): Promise<Transaction> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      account_id: input.fromAccountId,
      to_account_id: input.toAccountId,
      category_id: null,
      type: 'transfer',
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

export async function createAccount(name: string, initialBalance: number, isInvestment = false): Promise<Account> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      name,
      initial_balance: isInvestment ? 0 : initialBalance,
      is_investment: isInvestment,
      user_id: userData.user!.id,
    })
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

function accountNetFlow(account: Account, transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === 'transfer') {
      if (t.account_id === account.id) return sum - Number(t.amount);
      if (t.to_account_id === account.id) return sum + Number(t.amount);
      return sum;
    }
    if (t.account_id !== account.id) return sum;
    return sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
  }, 0);
}

export function calculateContributedTotal(account: Account, transactions: Transaction[]): number {
  return Number(account.initial_balance) + accountNetFlow(account, transactions);
}

export function calculateBalance(account: Account, transactions: Transaction[]): number {
  const adjustment = account.is_investment ? Number(account.value_adjustment) : 0;
  return calculateContributedTotal(account, transactions) + adjustment;
}

export function isAccountEmpty(account: Account, transactions: Transaction[]): boolean {
  const hasTransaction = transactions.some((t) => t.account_id === account.id || t.to_account_id === account.id);
  return !hasTransaction && calculateBalance(account, transactions) === 0;
}

export function calculateTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => !a.is_investment)
    .reduce((sum, account) => sum + calculateBalance(account, transactions), 0);
}

export function calculateTotalInvested(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter((a) => a.is_investment)
    .reduce((sum, account) => sum + calculateBalance(account, transactions), 0);
}

export function calculateMonthSummary(
  transactions: Transaction[],
  monthStart: string,
  monthEnd: string,
  accounts: Account[] = [],
): { income: number; expense: number; invested: number } {
  const investmentAccountIds = new Set(accounts.filter((a) => a.is_investment).map((a) => a.id));
  return transactions.reduce(
    (acc, t) => {
      if (t.date < monthStart || t.date > monthEnd) return acc;
      if (t.type === 'income') acc.income += Number(t.amount);
      else if (t.type === 'expense') acc.expense += Number(t.amount);
      else if (t.type === 'transfer' && t.to_account_id && investmentAccountIds.has(t.to_account_id)) acc.invested += Number(t.amount);
      return acc;
    },
    { income: 0, expense: 0, invested: 0 },
  );
}

export async function getCategoryLimits(): Promise<CategoryLimit[]> {
  const { data, error } = await supabase.from('category_limits').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export async function createCategoryLimit(categoryId: string, monthlyLimit: number): Promise<CategoryLimit> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('category_limits')
    .insert({ category_id: categoryId, monthly_limit: monthlyLimit, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoryLimit(id: string, monthlyLimit: number): Promise<void> {
  const { error } = await supabase.from('category_limits').update({ monthly_limit: monthlyLimit }).eq('id', id);
  if (error) throw error;
}

export async function deleteCategoryLimit(id: string): Promise<void> {
  const { error } = await supabase.from('category_limits').delete().eq('id', id);
  if (error) throw error;
}

export function calculateCategorySpending(
  categoryId: string,
  transactions: Transaction[],
  monthStart: string,
  monthEnd: string,
): number {
  return transactions
    .filter((t) => t.category_id === categoryId && t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}
