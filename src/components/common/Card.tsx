import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  delay?: string;
  className?: string;
  padding?: string;
  direction?: 'row' | 'col';
}

export function Card({ children, delay, className = '', padding = 'p-5 md:p-6', direction = 'col' }: CardProps) {
  const style: CSSProperties | undefined = delay ? { animationDelay: delay } : undefined;
  const directionClass = direction === 'row' ? 'flex-row' : 'flex-col';
  return (
    <section
      style={style}
      className={`animate-card-rise flex ${directionClass} bg-surface border border-surface-border rounded-card shadow-card ${padding} transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-glow-border ${className}`}
    >
      {children}
    </section>
  );
}
