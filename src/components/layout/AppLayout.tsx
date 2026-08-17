import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex h-dvh overflow-hidden bg-app-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
