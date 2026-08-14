interface NockMarkProps {
  size?: number;
  className?: string;
}

const ACCENT_CUT = 'polygon(16% 0%, 55% 0%, 84% 100%, 45% 100%)';

export function NockMark({ size = 32, className = '' }: NockMarkProps) {
  const glyphStyle = {
    fontSize: size * 0.6,
    fontWeight: 640,
    fontOpticalSizing: 'none' as const,
    fontVariationSettings: "'opsz' 144",
  };

  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid place-items-center shrink-0 select-none bg-surface-2 border border-surface-border ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    >
      <span className="font-display leading-none text-app-text" style={glyphStyle}>
        N
      </span>
      <span
        className="absolute inset-0 grid place-items-center font-display leading-none text-primary-bright"
        style={{ ...glyphStyle, clipPath: ACCENT_CUT }}
      >
        N
      </span>
    </span>
  );
}
