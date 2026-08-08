import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  delay?: string;
  className?: string;
}

export function Card({ children, delay, className = '' }: CardProps) {
  const style: CSSProperties | undefined = delay ? { animationDelay: delay } : undefined;
  return (
    <section
      style={style}
      className={`animate-card-rise flex flex-col bg-surface border border-surface-border rounded-card shadow-card p-5 md:p-6 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:border-glow-border ${className}`}
    >
      {children}
    </section>
  );
}
