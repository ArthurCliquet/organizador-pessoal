export function emailInitials(email: string | undefined): string {
  return (email?.split('@')[0] ?? '').slice(0, 2).toUpperCase() || '?';
}
