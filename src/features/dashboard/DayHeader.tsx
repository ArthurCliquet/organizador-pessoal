interface DayHeaderProps {
  taskCount: number;
  habitDone: number;
  habitTotal: number;
}

const PERFORATION_DOTS = 18;

export function DayHeader({ taskCount, habitDone, habitTotal }: DayHeaderProps) {
  const now = new Date();
  const weekdayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

  return (
    <div className="animate-card-settle relative bg-linear-to-br from-surface-hi via-surface to-surface rounded-hero shadow-hero px-6 py-6 mb-6 overflow-hidden">
      <div className="hero-texture" />

      <div className="relative flex justify-between px-0.5 pb-5">
        {Array.from({ length: PERFORATION_DOTS }).map((_, i) => (
          <span key={i} className="perforation-dot" />
        ))}
      </div>

      <div className="relative flex items-end justify-between gap-5 flex-wrap">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-6xl md:text-7xl text-primary-bright font-semibold leading-none tracking-tight">
            {now.getDate()}
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-display text-2xl capitalize font-medium">{weekdayLabel}</span>
            <span className="font-mono text-[0.68rem] tracking-widest text-app-muted-2 uppercase">
              {monthLabel} {now.getFullYear()} — Hoje
            </span>
          </div>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <span className="font-mono text-xs flex items-center gap-2 bg-white/[0.03] border border-surface-border rounded-full px-3.5 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <b className="text-primary-bright font-semibold">{taskCount}</b>
            {taskCount === 1 ? 'tarefa hoje' : 'tarefas hoje'}
          </span>
          {habitTotal > 0 && (
            <span className="font-mono text-xs flex items-center gap-2 bg-white/[0.03] border border-surface-border rounded-full px-3.5 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              <b className="text-primary-bright font-semibold">
                {habitDone}/{habitTotal}
              </b>
              hábitos
            </span>
          )}
        </div>
      </div>

      <div className="hero-fold" />
    </div>
  );
}
