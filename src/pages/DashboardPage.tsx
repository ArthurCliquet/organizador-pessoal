import { useCallback, useState } from 'react';
import { DayHeader } from '../features/dashboard/DayHeader';
import { TodayAgenda } from '../features/dashboard/TodayAgenda';
import { AgendaRail } from '../features/dashboard/AgendaRail';
import { PendingTasks } from '../features/dashboard/PendingTasks';
import { HabitStrip } from '../features/dashboard/HabitStrip';
import { BudgetSnapshot } from '../features/dashboard/BudgetSnapshot';
import { Card } from '../components/common/Card';
import { toISODate } from '../features/calendar/dateUtils';

export function DashboardPage() {
  const today = toISODate(new Date());
  const [agendaCounts, setAgendaCounts] = useState({ tasks: 0, events: 0 });
  const [habitCounts, setHabitCounts] = useState({ done: 0, total: 0 });

  // Stable references: TodayAgenda/HabitStrip call these from a useEffect keyed
  // partly on the callback itself, so a fresh arrow function every render
  // re-triggers that effect forever ("Maximum update depth exceeded").
  const handleAgendaCounts = useCallback((tasks: number, events: number) => {
    setAgendaCounts({ tasks, events });
  }, []);
  const handleHabitCounts = useCallback((done: number, total: number) => {
    setHabitCounts({ done, total });
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div className="dash-glow" />
      <div className="relative p-4 md:p-6 max-w-5xl mx-auto">
        <DayHeader
          taskCount={agendaCounts.tasks}
          eventCount={agendaCounts.events}
          habitDone={habitCounts.done}
          habitTotal={habitCounts.total}
        />

        <div className="flex flex-col gap-5">
          <Card delay="80ms">
            <TodayAgenda onCountsChange={handleAgendaCounts} rail={<AgendaRail />} />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            <Card delay="150ms">
              <HabitStrip date={today} onCountsChange={handleHabitCounts} />
            </Card>

            <Card delay="220ms">
              <PendingTasks />
            </Card>

            <Card delay="280ms">
              <BudgetSnapshot />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
