const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(value: number): string {
  return formatter.format(value);
}

export function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/^R\$\s*/, '').replace(/\./g, '').replace(',', '.');
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatAmountForInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
