interface HabitRingProps {
  checked: boolean;
  onChange: () => void;
}

export function HabitRing({ checked, onChange }: HabitRingProps) {
  return (
    <span className="check-control tone-success shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="check-box" />
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 8l2.5 2.5L12 5" />
      </svg>
    </span>
  );
}
