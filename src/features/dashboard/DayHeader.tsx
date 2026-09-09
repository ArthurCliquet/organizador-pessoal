import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface DayHeaderProps {
  taskDone: number;
  taskTotal: number;
  habitDone: number;
  habitTotal: number;
}

function periodGreeting(hour: number): { hello: string; nudge: string } {
  if (hour < 12) return { hello: 'Bom dia', nudge: 'Comece o dia com foco no que importa.' };
  if (hour < 18) return { hello: 'Boa tarde', nudge: 'Mantenha o ritmo nos seus objetivos.' };
  return { hello: 'Boa noite', nudge: 'Hora de fechar o dia e revisar o que rendeu.' };
}

function firstNameFrom(user: ReturnType<typeof useAuth>['user']): string {
  const meta = user?.user_metadata ?? {};
  const raw = (meta.full_name || meta.name || meta.display_name || '') as string;
  return raw.trim().split(/\s+/)[0] ?? '';
}

function ProgressMeter({
  label,
  done,
  total,
  tone,
}: {
  label: string;
  done: number;
  total: number;
  tone: 'primary' | 'success';
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const bar = tone === 'success' ? 'bg-success' : 'bg-primary';
  const num = tone === 'success' ? 'text-success' : 'text-primary-bright';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-app-muted-2">{label}</span>
        <span className="font-mono text-[0.68rem] text-app-muted-2">
          {total > 0 && (
            <>
              <b className={`${num} font-semibold`}>{done}</b>/{total}
            </>
          )}
          <span className={`ml-2 font-semibold ${num}`}>{pct}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DayHeader({ taskDone, taskTotal, habitDone, habitTotal }: DayHeaderProps) {
  const { user } = useAuth();
  const now = new Date();
  const weekdayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

  const { hello, nudge } = periodGreeting(now.getHours());
  const name = firstNameFrom(user);
  const greeting = name ? `${hello}, ${name}!` : `${hello}!`;

  return (
    <div className="relative mb-6">
      <div className="day-pad-sliver day-pad-sliver-2" />
      <div className="day-pad-sliver" />

      <div className="animate-card-settle relative z-[1] bg-linear-to-br from-surface-hi via-surface to-surface rounded-hero shadow-hero px-6 py-5 overflow-hidden">
        <div className="hero-texture" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
          <Link
            to="/revisao-semanal"
            className="group order-first self-end md:order-last md:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-2 px-3.5 py-2 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-app-muted transition-colors hover:border-primary/40 hover:text-primary-bright"
          >
            Revisão semanal
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>

          <div className="flex items-start gap-4 shrink-0">
            <span className="font-display text-6xl md:text-7xl text-primary-bright font-semibold leading-none tracking-tight shrink-0">
              {now.getDate()}
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-display text-2xl capitalize font-medium leading-tight">{weekdayLabel}</span>
              <span className="font-mono text-[0.68rem] tracking-widest text-app-muted-2 uppercase">
                {monthLabel} {now.getFullYear()} — Hoje
              </span>
              <p className="text-sm text-app-muted mt-1.5">
                <b className="text-app-text font-semibold">{greeting}</b>
                <span className="hidden sm:inline"> {nudge}</span>
              </p>
            </div>
          </div>

          <div className="flex-1 grid gap-x-10 gap-y-4 sm:grid-cols-2 md:pr-4">
            <ProgressMeter label="Tarefas do dia" done={taskDone} total={taskTotal} tone="primary" />
            <ProgressMeter label="Hábitos" done={habitDone} total={habitTotal} tone="success" />
          </div>
        </div>
      </div>
    </div>
  );
}
