import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { RevealOnMount } from '../components/common/RevealOnMount';
import { Card } from '../components/common/Card';
import { TodayAgenda } from '../features/dashboard/TodayAgenda';
import { AgendaRail } from '../features/dashboard/AgendaRail';
import { PendingTasks } from '../features/dashboard/PendingTasks';
import { HabitStrip } from '../features/dashboard/HabitStrip';
import { BudgetSnapshot } from '../features/dashboard/BudgetSnapshot';
import { BalanceChip } from '../features/dashboard/BalanceSnapshot';
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

  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateLabelCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <RevealOnMount className="p-4 md:p-6 max-w-[980px] mx-auto flex flex-col gap-4">
      <div className="reveal-in flex items-baseline justify-between gap-3.5 flex-wrap">
        <span className="text-xl font-semibold text-app-text">{dateLabelCapitalized}</span>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="chip">
            <b className="num">{agendaCounts.done}</b>/<span className="num">{agendaCounts.total}</span> tarefas
          </span>
          <span className="chip">
            <b className="num">{habitCounts.done}</b>/<span className="num">{habitCounts.total}</span> hábitos
          </span>
          <BalanceChip />
          <Link to="/revisao-semanal" className="chip hover:text-app-text transition-colors">
            Revisão semanal →
          </Link>
        </div>
      </div>

      <Card className="reveal-in">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-semibold">Agenda de hoje</h2>
          <span className="font-mono text-xs text-app-muted-2">
            {agendaCounts.total} {agendaCounts.total === 1 ? 'tarefa' : 'tarefas'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5">
          <TodayAgenda onCountsChange={handleAgendaCounts} />
          <AgendaRail />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <Card className="reveal-in h-[280px] md:h-[300px] overflow-hidden">
          <HabitStrip date={today} onCountsChange={handleHabitCounts} />
        </Card>
        <Card className="reveal-in h-[280px] md:h-[300px] overflow-hidden">
          <PendingTasks />
        </Card>
        <Card className="reveal-in h-[280px] md:h-[300px] overflow-hidden">
          <BudgetSnapshot />
        </Card>
      </div>
    </RevealOnMount>
  );
}
