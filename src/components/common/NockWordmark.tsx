interface NockWordmarkProps {
  size?: number;
  className?: string;
}

export function NockWordmark({ size = 20, className = '' }: NockWordmarkProps) {
  return (
    <span
      className={`font-sans italic leading-none text-app-text ${className}`}
      style={{ fontSize: size, fontWeight: 600 }}
    >
      Nock
    </span>
  );
}
