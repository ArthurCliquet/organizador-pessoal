interface HabitProgressRingProps {
  done: number;
  total: number;
}

const RADIUS = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HabitProgressRing({ done, total }: HabitProgressRingProps) {
  const pct = total === 0 ? 0 : done / total;
  const offset = CIRCUMFERENCE * (1 - pct);

  return (
    <div className="flex items-center gap-3 mb-4">
      <svg width="46" height="46" viewBox="0 0 46 46" className="-rotate-90 shrink-0">
        <circle cx="23" cy="23" r={RADIUS} fill="none" strokeWidth="4" className="text-surface-2" stroke="currentColor" />
        <circle
          cx="23"
          cy="23"
          r={RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke="currentColor"
          className="text-success transition-[stroke-dashoffset] duration-500 ease-out"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="font-mono text-xs text-app-muted">
        <b className="text-success font-semibold">{done}</b> de {total} feito{total === 1 ? '' : 's'} hoje
      </span>
    </div>
  );
}
