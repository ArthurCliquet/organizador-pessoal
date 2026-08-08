export function DayHeader() {
  const now = new Date();
  const weekdayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

  return (
    <div className="flex items-center gap-4 border border-surface-border bg-surface rounded px-5 py-4 mb-8">
      <span className="font-display text-5xl text-primary font-semibold leading-none">{now.getDate()}</span>
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-lg capitalize">{weekdayLabel}</span>
        <span className="font-mono text-[0.65rem] tracking-widest text-app-muted-2 uppercase">
          {monthLabel} {now.getFullYear()} — Hoje
        </span>
      </div>
    </div>
  );
}
