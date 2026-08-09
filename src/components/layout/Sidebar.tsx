import type { LucideIcon } from 'lucide-react';
import { CalendarDays, LogOut, NotebookPen, Sun, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { emailInitials } from '../../lib/emailInitials';

const links: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Hoje', icon: Sun },
  { to: '/notas', label: 'Notas', icon: NotebookPen },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/financas', label: 'Finanças', icon: Wallet },
];

export function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="hidden md:flex flex-col md:w-20 lg:w-56 shrink-0 h-full bg-surface border-r border-surface-border shadow-card z-10">
      <div className="flex flex-col items-center gap-1 justify-center lg:flex-row lg:items-center lg:justify-start lg:gap-2.5 h-16 shrink-0 px-3 lg:px-5 border-b border-surface-border">
        <span className="font-display text-xl leading-none text-primary-bright select-none">Op</span>
        <span className="hidden lg:inline font-mono text-[0.63rem] tracking-[0.08em] text-app-muted-2 uppercase">
          Organizador
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-1 px-2 lg:px-3 py-4 overflow-y-auto scrollbar-thin">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              `group relative flex items-center md:justify-center lg:justify-start gap-3 rounded-lg px-3 py-2.5 font-mono text-xs transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-dim text-primary-bright font-semibold'
                  : 'text-app-muted hover:text-app-text hover:bg-surface-hi'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary transition-opacity duration-150 ${
                    isActive ? 'opacity-100 shadow-[0_0_8px_var(--color-glow-border)]' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <Icon size={17} strokeWidth={2} className="shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="shrink-0 px-2 lg:px-3 py-3 border-t border-surface-border">
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:gap-2.5 rounded-lg bg-surface-2 p-2 lg:p-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-dim text-primary-bright font-mono text-[0.65rem] font-semibold flex items-center justify-center shrink-0">
            {emailInitials(user?.email)}
          </div>
          <div className="hidden lg:flex min-w-0 flex-1 flex-col">
            <span className="truncate font-mono text-[0.65rem] text-app-muted" title={user?.email ?? ''}>
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1 font-mono text-[0.65rem] text-app-muted-2 hover:text-danger transition-colors w-fit"
            >
              <LogOut size={11} aria-hidden="true" /> Sair
            </button>
          </div>
          <button
            onClick={signOut}
            title="Sair"
            aria-label="Sair"
            className="lg:hidden text-app-muted-2 hover:text-danger transition-colors"
          >
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
