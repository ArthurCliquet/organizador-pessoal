# Revisão Semanal (design)

## Contexto

Hoje o app só mostra recortes de "agora": o Dashboard mostra o dia atual (`DayHeader`, `TodayAgenda`, `MiniStrip` com os próximos 3 dias), o Calendário mostra mês a mês, e Finanças resume só o mês corrente (`MonthSummary`, `MonthlyLimits`). Não existe nenhuma visão que consolide "como foi minha semana" cruzando tarefas, hábitos e finanças num lugar só — cada área tem que ser checada separadamente, e não dá pra olhar pra trás além do que cada widget já mostra.

Esta etapa adiciona uma **Revisão Semanal**: uma página própria, calculada sob demanda (sem job em background, sem nota gerada, sem persistência — pura leitura e agregação dos dados já existentes), acessível a partir de um link no Dashboard.

## Objetivo

1. Nova rota `/revisao-semanal`, acessível via link no Dashboard (não entra no menu principal — Sidebar/BottomNav continuam com as mesmas 4 entradas).
2. Mostra a semana atual (domingo a sábado, mesma convenção já usada no `MonthGrid`) por padrão, com setas para navegar para semanas anteriores (sem limite) e para frente até no máximo a semana atual (não é possível avançar além dela).
3. Três blocos, sem cruzar dados entre eles:
   - **Tarefas**: quantas concluídas de quantas no total na semana, somando tarefas avulsas com data e ocorrências de tarefas recorrentes.
   - **Hábitos**: por hábito, quantos dos 7 dias da semana foram marcados como feitos.
   - **Finanças**: receita, despesa, saldo e total investido na semana.
4. Todo o cálculo acontece no client a partir de dados buscados sob demanda quando a página abre ou a semana muda — nada é salvo, reabrir a mesma semana depois recalcula do zero.

Fora de escopo nesta etapa: comparação do gasto semanal com o limite mensal (a proporção fica ambígua quando a semana cruza dois meses com limites diferentes, e não agrega valor suficiente pra justificar a complexidade); geração automática/agendada (exigiria Supabase Edge Function + `pg_cron`, infraestrutura que o projeto não usa hoje); virar nota editável em Notas; navegação para semanas futuras; qualquer correlação entre os três blocos (ex: "gastos sobem quando hábito X falha") — pode ser uma iteração futura, não faz parte desta.

## Modelo de dados

Nenhuma tabela ou coluna nova. A feature só lê dados que já existem: `tasks`, `recurring_tasks`, `recurring_task_logs`, `habits`, `habit_logs`, `transactions`, `accounts`. RLS existente já cobre tudo (owner-scoped via `user_id`, direto ou pela tabela pai).

## Camada de dados

Três funções novas, seguindo o mesmo padrão de `getTasksForRange` (`src/features/tasks/tasksApi.ts`), que já existe e é reaproveitada sem alteração:

- **`recurringTasksApi.ts`** — `getRecurringLogsForRange(startDate: string, endDate: string): Promise<RecurringTaskLog[]>`, mesmo padrão `.gte('date', startDate).lte('date', endDate)` de `getTasksForRange`.
- **`habitsApi.ts`** — `getHabitLogsForRange(startDate: string, endDate: string): Promise<HabitLog[]>`, mesmo padrão.
- **`financeApi.ts`** — `getTransactionsForRange(startDate: string, endDate: string): Promise<Transaction[]>`, mesmo padrão de filtro por data, mesma ordenação de `getTransactions()`. Evita repetir o full-fetch sem filtro que `getTransactions()` faz hoje (aceitável nas telas atuais, mas desnecessário aqui).

Nenhuma função nova para o resumo financeiro: `calculateMonthSummary(transactions, monthStart, monthEnd, accounts)` (já existe em `financeApi.ts`) já recebe `start`/`end` como strings genéricas apesar do nome — é reaproveitada diretamente passando os limites da semana em vez do mês, sem alteração de assinatura.

## Agregação (`src/features/weeklyReview/weeklyReviewStats.ts`, novo arquivo)

Funções puras (sem I/O), consumidas pela página:

- **`calculateTaskStats(tasks, recurringTasks, recurringLogs, weekDates): { completed: number; total: number }`**
  - Tarefas avulsas: cada uma em `tasks` soma 1 ao total; soma 1 ao `completed` se `done`.
  - Ocorrências recorrentes: para cada data em `weekDates`, calcula o dia da semana (`getWeekday`, já existe em `dateUtils.ts`) e itera as `recurringTasks` cujo `weekdays` inclui aquele dia. Para cada uma, procura o log daquela tarefa+data: se `skipped`, a ocorrência não conta em nada (mesma regra que o `DayPanel` já aplica por dia); senão, soma 1 ao total e mais 1 ao `completed` se `done`.
- **`calculateHabitStats(habits, habitLogs, weekDates): { habitId: string; name: string; done: number; total: number }[]`**
  - `total` é sempre `weekDates.length` (7) para todo hábito, sem descontar dias antes da criação do hábito — mesma simplicidade que tarefas recorrentes já têm hoje (nenhuma tela do app hoje filtra ocorrências por `created_at`).
  - `done` conta os `habitLogs` daquele hábito com `date` em `weekDates` e `done === true`.

O bloco financeiro não precisa de função de agregação própria: a página chama `calculateMonthSummary` direto com os limites da semana.

## Utilitário de data (`src/features/calendar/dateUtils.ts`)

- **`getWeekRange(date: Date): { start: Date; end: Date }`** — `startOfWeek(date, { weekStartsOn: 0 })` / `endOfWeek(date, { weekStartsOn: 0 })`, mesma convenção do `MonthGrid`.
- Rótulo do intervalo formatado como `d MMM` (locale `ptBR`, minúsculo, sem ponto final) para cada extremo, mesmo padrão de `src/lib/relativeDate.ts` — ex: "9 fev – 15 fev". Sem tratamento especial para semana cruzando o ano (caso raro, mantém o formato simples).

## Componentes

**`src/pages/WeeklyReviewPage.tsx`** (novo):
- Estado: `weekStart` (Date, inicializado no início da semana que contém hoje), dados carregados (tarefas, recorrentes, logs recorrentes, hábitos, logs de hábitos, transações, contas), `loading`, erro.
- Ao montar e a cada mudança de `weekStart`, busca em paralelo (`Promise.all`, mesmo padrão do `DayPanel.load`): `getTasksForRange`, `getRecurringTasks`, `getRecurringLogsForRange`, `getHabits`, `getHabitLogsForRange`, `getTransactionsForRange`, `getAccounts`.
- Cabeçalho: rótulo do intervalo da semana + botões "‹"/"›"; "›" desabilitado quando `weekStart` já é a semana que contém hoje (não avança para semanas futuras).
- Três `Card` (componente já existente em `src/components/common/Card.tsx`): Tarefas ("X de Y concluídas"), Hábitos (lista "Nome do hábito: X/7"), Finanças (receita/despesa/saldo/investido, formatados com `src/lib/currency.ts`).
- Loading: `Spinner` de página inteira. Erro: toast (`useToast().showError`) + botão de tentar novamente, mesmo padrão de `FinancePage`.

**`src/pages/DashboardPage.tsx`**: link "Ver revisão da semana →" logo abaixo do `DayHeader`, antes do grid de cards, usando `Link` do `react-router-dom` para `/revisao-semanal`.

**`src/App.tsx`**: nova rota protegida `<Route path="/revisao-semanal" element={<WeeklyReviewPage />} />` dentro do `AppLayout` existente, junto das outras 4.

## Teste

Sem suíte automatizada (decisão intencional do projeto) — validação manual: abrir a Revisão Semanal a partir do link no Dashboard e conferir que a semana atual aparece com os números batendo com o que se vê hoje em Tarefas/Hábitos/Finanças. Navegar para a semana anterior e conferir que os números mudam e refletem uma semana concluída. Confirmar que a seta "›" fica desabilitada ao voltar até a semana atual. Marcar/desmarcar uma tarefa, hábito ou lançar uma transação numa data dentro da semana visível e reabrir a Revisão Semanal (sem navegar) para conferir que reflete o dado atualizado. Testar uma semana que cruza dois meses (ex: 25 de fev a 3 de mar) e conferir que transações e tarefas de ambos os meses aparecem somadas corretamente. Conferir que uma tarefa recorrente marcada como "pulada" (`skip`) num dia da semana não conta nem como concluída nem como pendente no total.
