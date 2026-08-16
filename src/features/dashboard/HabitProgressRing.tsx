interface HabitProgressRingProps {
  done: number;
  total: number;
  size?: number;
}

const RADIUS = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function HabitProgressRing({ done, total, size = 46 }: HabitProgressRingProps) {
  const pct = total === 0 ? 0 : done / total;
  const offset = CIRCUMFERENCE * (1 - pct);
  const complete = total > 0 && done === total;

  return (
    <div className="flex items-center gap-3 shrink-0">
      <svg width={size} height={size} viewBox="0 0 46 46" className={`-rotate-90 shrink-0 ${complete ? 'ring-complete' : ''}`}>
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
      <span className="font-mono text-xs text-app-muted whitespace-nowrap">
        <b className="text-success font-semibold">{done}</b> de {total}
      </span>
    </div>
  );
}
