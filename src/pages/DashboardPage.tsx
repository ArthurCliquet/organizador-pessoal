import { TodayCard } from '../features/dashboard/TodayCard';
import { UpcomingAgenda } from '../features/dashboard/UpcomingAgenda';
import { RecentNotes } from '../features/dashboard/RecentNotes';

export function DashboardPage() {
  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-3xl mx-auto">
      <TodayCard />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UpcomingAgenda />
        <RecentNotes />
      </div>
    </div>
  );
}
