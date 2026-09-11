import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  /** seletor dos elementos a animar; default = filhos diretos */
  selector?: string;
  /** ms entre cada elemento */
  step?: number;
  /** teto do delay em ms */
  cap?: number;
}

export function RevealOnMount({ children, className = '', selector = ':scope > *', step = 55, cap = 330 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('revealing');
    // força reflow para reiniciar a animação a cada mount
    void el.offsetWidth;
    el.querySelectorAll<HTMLElement>(`${selector} .reveal-in, ${selector}.reveal-in`).forEach((n, i) => {
      n.style.animationDelay = `${Math.min(i * step, cap)}ms`;
    });
    // fallback: se o seletor não casar nada, anima .reveal-in diretos
    if (!el.querySelector('.reveal-in')) return;
    el.classList.add('revealing');
  }, [selector, step, cap]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
