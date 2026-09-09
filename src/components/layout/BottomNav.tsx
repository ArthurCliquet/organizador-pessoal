import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, NotebookPen, Sun, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { emailInitials } from '../../lib/emailInitials';

const links: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Hoje', icon: Sun },
  { to: '/notas', label: 'Notas', icon: NotebookPen },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/financas', label: 'Finanças', icon: Wallet },
];

export function BottomNav() {
  const { user, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              `flex-1 flex items-center justify-center py-3 ${isActive ? 'text-primary' : 'text-app-muted'}`
            }
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
          </NavLink>
        ))}
        <button
          onClick={() => setAccountOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
        >
          <span className="w-5 h-5 rounded-full bg-surface-2 text-primary font-mono text-[0.55rem] flex items-center justify-center">
            {emailInitials(user?.email)}
          </span>
          <span className="font-mono text-[0.65rem] text-app-muted">Conta</span>
        </button>
      </nav>

      {accountOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-50" onClick={() => setAccountOpen(false)}>
          <div
            className="absolute bottom-16 right-2 left-2 bg-surface border border-surface-border rounded p-4 flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-8 rounded-full bg-surface-2 text-primary font-mono text-xs flex items-center justify-center shrink-0">
              {emailInitials(user?.email)}
            </div>
            <div className="min-w-0 flex-1 truncate font-mono text-xs text-app-muted">{user?.email}</div>
            <button
              onClick={() => {
                setAccountOpen(false);
                signOut();
              }}
              className="font-mono text-xs text-primary shrink-0"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  );
}
