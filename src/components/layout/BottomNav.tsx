import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { emailInitials } from '../../lib/emailInitials';

const links = [
  { to: '/', label: 'Hoje' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
];

export function BottomNav() {
  const { user, signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex-1 text-center py-3 font-mono text-xs ${isActive ? 'text-primary font-bold' : 'text-app-muted'}`
            }
          >
            {link.label}
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
