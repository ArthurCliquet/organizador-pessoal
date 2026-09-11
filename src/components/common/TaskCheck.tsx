interface TaskCheckProps {
  checked: boolean;
  onChange: () => void;
  tone?: 'primary' | 'success';
}

export function TaskCheck({ checked, onChange, tone = 'primary' }: TaskCheckProps) {
  return (
    <span className={`check-control shrink-0${tone === 'success' ? ' tone-success' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="check-box" />
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 8l2.5 2.5L12 5" />
      </svg>
    </span>
  );
}
