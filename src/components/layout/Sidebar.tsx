import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Hoje' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
];

export function Sidebar() {
  return (
    <nav className="hidden md:flex flex-col w-[150px] shrink-0 border-r border-surface-border pl-4 pr-6 pt-6 gap-1.5">
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
    </nav>
  );
}
