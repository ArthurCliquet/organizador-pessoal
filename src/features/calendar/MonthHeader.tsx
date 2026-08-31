interface MonthHeaderProps {
  year: number;
  month: number;
  monthTaskCount: number;
  monthEventCount: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenRecurring: () => void;
}

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function MonthHeader({
  year, month, monthTaskCount, monthEventCount, onPrev, onNext, onToday, onOpenRecurring,
}: MonthHeaderProps) {
  const navBtn =
    'w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-app-muted hover:text-app-text hover:bg-white/[0.04] transition-colors font-mono';

  return (
    <div className="relative pt-4 mb-8">
      <div className="day-pad-sliver day-pad-sliver-2" />
      <div className="day-pad-sliver" />

      <button type="button" onClick={onOpenRecurring} className="day-pad-tab">
        Tarefas recorrentes <span className="go-arrow" aria-hidden="true">→</span>
      </button>

      <div className="animate-card-settle relative z-[1] bg-linear-to-br from-surface-hi via-surface to-surface rounded-hero shadow-hero px-6 py-6 overflow-hidden">
        <div className="hero-texture" />

        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-4xl md:text-5xl text-primary-bright font-semibold capitalize leading-none tracking-tight">
              {MONTH_NAMES[month]}
            </h1>
            <span className="font-mono text-sm text-app-muted-2 tracking-widest">{year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onPrev} aria-label="Mês anterior" className={navBtn}>‹</button>
            <button
              type="button"
              onClick={onToday}
              className="h-8 px-3.5 flex items-center justify-center rounded-lg border border-surface-border text-app-muted hover:text-app-text hover:bg-white/[0.04] transition-colors font-mono text-[0.7rem] uppercase tracking-wider"
            >
              Hoje
            </button>
            <button type="button" onClick={onNext} aria-label="Próximo mês" className={navBtn}>›</button>
          </div>
        </div>

        <p className="relative font-mono text-xs text-app-muted mt-5 flex items-center gap-2 flex-wrap">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span>
            <b className="text-primary-bright font-semibold">{monthTaskCount}</b>{' '}
            {monthTaskCount === 1 ? 'tarefa no mês' : 'tarefas no mês'}
          </span>
          {monthEventCount > 0 && (
            <>
              <span className="text-app-muted-2">·</span>
              <span className="day-pad-event-mark shrink-0" aria-hidden="true" />
              <span>
                <b className="text-special font-semibold">{monthEventCount}</b>{' '}
                {monthEventCount === 1 ? 'evento especial' : 'eventos especiais'}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
