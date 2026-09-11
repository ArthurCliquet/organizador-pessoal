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
  return (
    <div className="reveal-in flex items-center justify-between gap-3 mb-4 md:shrink-0 flex-wrap">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-semibold capitalize">{MONTH_NAMES[month]}</h1>
        <span className="text-sm text-app-muted-2">{year}</span>
        <span className="text-xs text-app-muted-2 ml-2">
          {monthTaskCount} {monthTaskCount === 1 ? 'tarefa' : 'tarefas'}
          {monthEventCount > 0 && (
            <>
              {' · '}
              {monthEventCount} {monthEventCount === 1 ? 'evento especial' : 'eventos especiais'}
            </>
          )}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onPrev} aria-label="Mês anterior" className="ib">‹</button>
        <button type="button" onClick={onToday} className="btn">
          Hoje
        </button>
        <button type="button" onClick={onNext} aria-label="Próximo mês" className="ib">›</button>
        <button type="button" onClick={onOpenRecurring} className="btn ml-1.5">
          Recorrentes
        </button>
      </div>
    </div>
  );
}
