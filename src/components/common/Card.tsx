import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  direction?: 'row' | 'col';
}

export function Card({ children, className = '', padding = 'p-4 md:p-5', direction = 'col' }: CardProps) {
  return (
    <section
      className={`flex ${direction === 'row' ? 'flex-row' : 'flex-col'} bg-surface border border-surface-border rounded-card ${padding} ${className}`}
    >
      {children}
    </section>
  );
}
