import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/notas', label: 'Notas' },
  { to: '/calendario', label: 'Calendário' },
];

export function BottomNav() {
  return (
    <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `flex-1 text-center py-3 text-sm font-medium ${isActive ? 'text-primary' : 'text-app-muted'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
