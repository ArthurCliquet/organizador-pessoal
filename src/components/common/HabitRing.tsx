interface HabitRingProps {
  checked: boolean;
  onChange: () => void;
}

export function HabitRing({ checked, onChange }: HabitRingProps) {
  return (
    <span className="ring-control shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="ring-circle" />
      <svg viewBox="0 0 20 20">
        <path d="M5 10l3 3 7-7" />
      </svg>
    </span>
  );
}
