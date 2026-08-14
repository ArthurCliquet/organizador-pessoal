interface NockWordmarkProps {
  size?: number;
  className?: string;
}

export function NockWordmark({ size = 20, className = '' }: NockWordmarkProps) {
  return (
    <span
      className={`font-display italic leading-none text-app-text ${className}`}
      style={{ fontSize: size, fontOpticalSizing: 'none', fontVariationSettings: "'opsz' 144" }}
    >
      Nock
    </span>
  );
}
