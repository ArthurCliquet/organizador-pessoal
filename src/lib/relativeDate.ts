import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatRelativeDate(isoDate: string): string {
  const date = parseISO(isoDate);

  if (isToday(date)) return 'hoje';
  if (isYesterday(date)) return 'ontem';

  return format(date, 'd MMM', { locale: ptBR }).toLowerCase().replace('.', '');
}
