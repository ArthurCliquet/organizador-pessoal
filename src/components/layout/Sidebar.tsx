import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
];

export function Sidebar() {
  return (
    <nav className="hidden md:flex flex-col w-56 shrink-0 bg-surface border-r border-surface-border p-4 gap-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-app-muted hover:text-app-text'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
