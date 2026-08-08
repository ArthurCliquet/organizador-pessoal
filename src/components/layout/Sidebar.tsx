import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { emailInitials } from '../../lib/emailInitials';

const links = [
  { to: '/', label: 'Hoje' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
];

export function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="hidden md:flex flex-col w-[150px] shrink-0 border-r border-surface-border pl-4 pr-6 pt-6 pb-4 gap-1.5">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `font-mono text-xs px-2 py-2 rounded ${isActive ? 'text-primary bg-surface font-bold' : 'text-app-muted hover:text-app-text'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
      <div className="mt-auto pt-3 border-t border-surface-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-surface text-primary font-mono text-[0.6rem] flex items-center justify-center shrink-0">
          {emailInitials(user?.email)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[0.6rem] text-app-muted" title={user?.email ?? ''}>
            {user?.email}
          </div>
          <button onClick={signOut} className="font-mono text-[0.6rem] text-app-muted hover:text-primary">
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}
