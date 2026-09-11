interface NockMarkProps {
  size?: number;
  className?: string;
}

const ACCENT_CUT = 'polygon(16% 0%, 55% 0%, 84% 100%, 45% 100%)';

export function NockMark({ size = 32, className = '' }: NockMarkProps) {
  const glyphStyle = {
    fontSize: size * 0.6,
    fontWeight: 700,
  };

  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid place-items-center shrink-0 select-none bg-surface border border-surface-border ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.23 }}
    >
      <span className="leading-none text-app-text" style={glyphStyle}>
        N
      </span>
      <span
        className="absolute inset-0 grid place-items-center leading-none text-primary"
        style={{ ...glyphStyle, clipPath: ACCENT_CUT }}
      >
        N
      </span>
    </span>
  );
}
