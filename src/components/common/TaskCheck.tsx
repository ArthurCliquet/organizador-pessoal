interface TaskCheckProps {
  checked: boolean;
  onChange: () => void;
}

export function TaskCheck({ checked, onChange }: TaskCheckProps) {
  return (
    <span className="check-control shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="check-box" />
      <svg viewBox="0 0 18 18">
        <path d="M4 9l3 3 7-7" />
      </svg>
    </span>
  );
}
