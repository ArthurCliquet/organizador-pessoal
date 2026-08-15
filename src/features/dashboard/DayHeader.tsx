import { Link } from 'react-router-dom';

interface DayHeaderProps {
  taskCount: number;
  eventCount: number;
  habitDone: number;
  habitTotal: number;
}

export function DayHeader({ taskCount, eventCount, habitDone, habitTotal }: DayHeaderProps) {
  const now = new Date();
  const weekdayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

  return (
    <div className="relative pt-4 mb-8">
      <div className="day-pad-sliver day-pad-sliver-2" />
      <div className="day-pad-sliver" />

      <Link to="/revisao-semanal" className="day-pad-tab">
        Revisão semanal <span className="go-arrow" aria-hidden="true">→</span>
      </Link>

      <div className="animate-card-settle relative z-[1] bg-linear-to-br from-surface-hi via-surface to-surface rounded-hero shadow-hero px-6 py-6 overflow-hidden">
        <div className="hero-texture" />

        <div className="relative flex items-baseline gap-4">
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

        <p className="relative font-mono text-xs text-app-muted mt-5 flex items-center gap-2 flex-wrap">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span>
            <b className="text-primary-bright font-semibold">{taskCount}</b>{' '}
            {taskCount === 1 ? 'tarefa hoje' : 'tarefas hoje'}
          </span>
          {eventCount > 0 && (
            <>
              <span className="text-app-muted-2">·</span>
              <span className="day-pad-event-mark shrink-0" aria-hidden="true" />
              <span>
                <b className="text-special font-semibold">{eventCount}</b>{' '}
                {eventCount === 1 ? 'evento especial' : 'eventos especiais'}
              </span>
            </>
          )}
          {habitTotal > 0 && (
            <>
              <span className="text-app-muted-2">·</span>
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              <span>
                <b className="text-primary-bright font-semibold">
                  {habitDone}/{habitTotal}
                </b>{' '}
                hábitos
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
