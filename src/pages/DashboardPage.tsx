import { useState } from 'react';
import { DayHeader } from '../features/dashboard/DayHeader';
import { TodayAgenda } from '../features/dashboard/TodayAgenda';
import { MiniStrip } from '../features/dashboard/MiniStrip';
import { RecentNotes } from '../features/dashboard/RecentNotes';
import { PendingTasks } from '../features/dashboard/PendingTasks';
import { HabitStrip } from '../features/dashboard/HabitStrip';
import { Card } from '../components/common/Card';
import { toISODate } from '../features/calendar/dateUtils';

export function DashboardPage() {
  const today = toISODate(new Date());
  const [agendaCounts, setAgendaCounts] = useState({ tasks: 0, events: 0 });
  const [habitCounts, setHabitCounts] = useState({ done: 0, total: 0 });

  return (
    <div className="relative overflow-hidden">
      <div className="dash-glow" />
      <div className="relative p-4 md:p-6 max-w-4xl mx-auto">
        <DayHeader
          taskCount={agendaCounts.tasks}
          eventCount={agendaCounts.events}
          habitDone={habitCounts.done}
          habitTotal={habitCounts.total}
        />

        <div className="flex flex-col gap-5">
          <Card delay="80ms">
            <TodayAgenda onCountsChange={(tasks, events) => setAgendaCounts({ tasks, events })} />
            <MiniStrip />
          </Card>

          <Card delay="150ms" direction="row" padding="px-5 py-4" className="items-center gap-4">
            <HabitStrip date={today} onCountsChange={(done, total) => setHabitCounts({ done, total })} />
          </Card>

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
