import { DayHeader } from '../features/dashboard/DayHeader';
import { TodayAgenda } from '../features/dashboard/TodayAgenda';
import { MiniStrip } from '../features/dashboard/MiniStrip';
import { RecentNotes } from '../features/dashboard/RecentNotes';
import { PendingTasks } from '../features/dashboard/PendingTasks';
import { HabitChecklist } from '../features/habits/HabitChecklist';
import { toISODate } from '../features/calendar/dateUtils';

export function DashboardPage() {
  const today = toISODate(new Date());

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <DayHeader />

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-start">
        <div>
          <TodayAgenda />
          <div className="mt-8">
            <MiniStrip />
          </div>
          <div className="mt-10">
            <PendingTasks />
          </div>
        </div>

        <div>
          <h2 className="font-display text-base mb-3">Hábitos diários</h2>
          <HabitChecklist date={today} />

          <div className="mt-9">
            <RecentNotes />
          </div>
        </div>
      </div>
    </div>
  );
}
