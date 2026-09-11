import { useCallback, useState } from 'react';
import { DayHeader } from '../features/dashboard/DayHeader';
import { TodayAgenda } from '../features/dashboard/TodayAgenda';
import { AgendaRail } from '../features/dashboard/AgendaRail';
import { PendingTasks } from '../features/dashboard/PendingTasks';
import { HabitStrip } from '../features/dashboard/HabitStrip';
import { BudgetSnapshot } from '../features/dashboard/BudgetSnapshot';
import { BalanceSnapshot } from '../features/dashboard/BalanceSnapshot';
import { Card } from '../components/common/Card';
import { toISODate } from '../features/calendar/dateUtils';

export function DashboardPage() {
  const today = toISODate(new Date());
  const [agendaCounts, setAgendaCounts] = useState({ tasks: 0, events: 0, total: 0, done: 0 });
  const [habitCounts, setHabitCounts] = useState({ done: 0, total: 0 });

  // Stable references: TodayAgenda/HabitStrip call these from a useEffect keyed
  // partly on the callback itself, so a fresh arrow function every render
  // re-triggers that effect forever ("Maximum update depth exceeded").
  const handleAgendaCounts = useCallback((tasks: number, events: number, total: number, done: number) => {
    setAgendaCounts({ tasks, events, total, done });
  }, []);
  const handleHabitCounts = useCallback((done: number, total: number) => {
    setHabitCounts({ done, total });
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div className="dash-glow" />
      <div className="relative p-4 md:p-6 max-w-7xl mx-auto">
        <DayHeader
          taskDone={agendaCounts.done}
          taskTotal={agendaCounts.total}
          habitDone={habitCounts.done}
          habitTotal={habitCounts.total}
        />

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            <Card>
              <TodayAgenda onCountsChange={handleAgendaCounts} rail={<AgendaRail />} />
            </Card>

            <Card>
              <BalanceSnapshot />
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            <Card
              padding="p-0"
              className="md:col-span-2 overflow-hidden flex-col md:flex-row divide-y divide-surface-border md:divide-y-0 md:divide-x"
            >
              <div className="flex-1 flex flex-col p-5 pb-6 md:p-6 md:pb-7">
                <HabitStrip date={today} onCountsChange={handleHabitCounts} />
              </div>
              <div className="flex-1 flex flex-col p-5 pb-6 md:p-6 md:pb-7">
                <PendingTasks />
              </div>
            </Card>

            <Card>
              <BudgetSnapshot />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
