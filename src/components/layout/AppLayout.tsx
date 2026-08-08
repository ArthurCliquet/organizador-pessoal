import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-app-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-surface-border">
          <span className="font-mono text-sm text-app-muted truncate">{user?.email}</span>
          <button onClick={signOut} className="text-sm text-app-muted hover:text-app-text">
            Sair
          </button>
        </header>
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
