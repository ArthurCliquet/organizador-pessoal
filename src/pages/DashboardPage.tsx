import { useState } from 'react';
import { DayHeader } from '../features/dashboard/DayHeader';
import { TodayAgenda } from '../features/dashboard/TodayAgenda';
import { MiniStrip } from '../features/dashboard/MiniStrip';
import { RecentNotes } from '../features/dashboard/RecentNotes';
import { PendingTasks } from '../features/dashboard/PendingTasks';
import { HabitChecklist } from '../features/habits/HabitChecklist';
import { HabitProgressRing } from '../features/dashboard/HabitProgressRing';
import { Card } from '../components/common/Card';
import { toISODate } from '../features/calendar/dateUtils';

export function DashboardPage() {
  const today = toISODate(new Date());
  const [taskCount, setTaskCount] = useState(0);
  const [habitCounts, setHabitCounts] = useState({ done: 0, total: 0 });

  return (
    <div className="relative overflow-hidden">
      <div className="dash-glow" />
      <div className="relative p-4 md:p-6 max-w-4xl mx-auto">
        <DayHeader taskCount={taskCount} habitDone={habitCounts.done} habitTotal={habitCounts.total} />

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 items-stretch">
            <Card delay="80ms">
              <TodayAgenda onCountChange={setTaskCount} />
              <hr className="my-5 border-surface-border" />
              <MiniStrip />
            </Card>

            <Card delay="150ms">
              <h2 className="font-display text-lg font-semibold mb-1">Hábitos diários</h2>
              {habitCounts.total > 0 && <HabitProgressRing done={habitCounts.done} total={habitCounts.total} />}
              <HabitChecklist date={today} allowCreate onCountsChange={(done, total) => setHabitCounts({ done, total })} />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            <Card delay="220ms">
              <PendingTasks />
            </Card>

            <Card delay="280ms">
              <RecentNotes />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
