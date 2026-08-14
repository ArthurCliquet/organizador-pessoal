# Calendário — Evento especial (design)

## Contexto

Hoje o Calendário e o Dashboard só têm um tipo de item de agenda: `Task` (`date`, `time`, `title`, `done`), sem noção de "tipo" ou destaque visual. `MonthGrid` (grade do mês) e `MiniStrip` (faixa de 3 dias no Dashboard, dentro do card "Agenda de hoje") mostram uma bolinha azul (`bg-primary`) no dia quando ele tem qualquer tarefa; não existe diferenciação entre uma tarefa qualquer e algo que a pessoa queira destacar como especial (aniversário, viagem, compromisso importante).

Esta etapa adiciona uma marcação "evento especial" em cima da tarefa existente — sem criar uma entidade nova — refletida como bolinha roxa nos dois calendários (grade do mês e faixa do dashboard) e como indicador visual nas listas de tarefas do dia.

## Objetivo

1. Ao criar uma tarefa (no `DayPanel`, dentro do Calendário), marcar um checkbox "Evento especial".
2. Ao editar uma tarefa já existente (edição inline por duplo clique, já existente no `DayPanel`), marcar/desmarcar essa mesma flag.
3. No `MonthGrid`, cada dia mostra bolinha azul se tem tarefa normal e bolinha roxa (adicional, lado a lado) se tem evento especial — as duas aparecem juntas quando o dia tem os dois tipos; só a roxa aparece se o dia só tem evento especial.
4. Na `MiniStrip` do Dashboard (os 3 dias seguintes mostrados no card "Agenda de hoje"), mesma lógica de bolinha azul/roxa/ambas, no lugar do texto "livre" quando há algo no dia.
5. Nas listas de tarefas do dia (`DayPanel` e `TodayAgenda`, o card "Agenda de hoje"), a tarefa marcada como especial ganha um indicador roxo antes do título, consistente com a cor das bolinhas.

Fora de escopo nesta etapa: entidade separada de "evento" (sem checkbox de conclusão), recorrência de eventos especiais, cor customizável (é sempre roxo), notificações/lembretes.

## Modelo de dados

**`tasks`** ganha uma coluna: `is_special_event boolean not null default false`.

Sem mudança de RLS — as políticas existentes na tabela `tasks` já cobrem a linha inteira (owner-scoped via `user_id`), independente de quais colunas mudam.

`Task` (`src/types/index.ts`) ganha o campo `is_special_event: boolean`.

## Camada de dados (`src/features/tasks/tasksApi.ts`)

- **`createTask(date, title, time, isSpecialEvent = false)`**: novo parâmetro, gravado como `is_special_event` no insert.
- **`updateTask(id, fields)`**: o tipo do parâmetro `fields` (`Partial<Pick<Task, ...>>`) passa a incluir `is_special_event`, permitindo marcar/desmarcar na edição.
- `getTasksForDate` / `getTasksForRange` continuam sem mudança de assinatura — já retornam `select('*')`, então o campo novo vem junto automaticamente.

## Componentes

**`DayPanel.tsx`**:
- Formulário de criação: checkbox "Evento especial" ao lado dos campos de título e hora; estado local novo (`isSpecialEvent`), passado para `createTask` e resetado após criar.
- Edição inline (duplo clique numa tarefa): mesmo checkbox aparece junto dos campos de título/hora em edição; `commitEdit` passa `is_special_event` para `updateTask`.
- Lista de tarefas do dia (`dayItems`): quando `item.kind === 'task' && item.task.is_special_event`, mostra um indicador roxo (`●`) antes do título, na mesma posição onde hoje aparece o `↻` de tarefa recorrente.

**`MonthGrid.tsx`**: em vez de `hasTasks` (booleano único), calcula por dia `hasRegularTask` (alguma tarefa do dia com `is_special_event === false`) e `hasSpecialEvent` (alguma tarefa do dia com `is_special_event === true`). Renderiza a bolinha azul existente quando `hasRegularTask`, e uma segunda bolinha roxa (mesmo tamanho, ao lado) quando `hasSpecialEvent`.

**`MiniStrip.tsx`**: `getTasksForRange` já retorna `is_special_event`; o cálculo de `hasSomethingByDate` (hoje um booleano) passa a virar dois mapas (`hasRegularByDate`, `hasSpecialByDate`), e a área que hoje mostra uma bolinha azul ou o texto "livre" passa a mostrar: nada com tarefas → "livre"; só regular → bolinha azul; só especial → bolinha roxa; os dois → as duas bolinhas lado a lado.

**`TodayAgenda.tsx`**: `DayItem` (tipo local `kind: 'task' | 'recurring'`) ganha `is_special_event` para itens `kind: 'task'` (tarefas recorrentes não têm a flag — não fazem parte de `tasks`). Na renderização da lista, mesmo indicador roxo usado no `DayPanel`, antes do título.

## Teste

Sem suíte automatizada no projeto (decisão intencional, conforme README) — validação manual: no Calendário, criar uma tarefa marcando "Evento especial" numa data 2 dias no futuro; conferir bolinha roxa no `MonthGrid` nesse dia, e — quando a data cair dentro da janela dos 3 próximos dias — bolinha roxa na `MiniStrip` do Dashboard. Criar, no mesmo dia, uma segunda tarefa sem marcar a flag; conferir que as duas bolinhas (azul e roxa) aparecem juntas nesse dia, no `MonthGrid` e na `MiniStrip`. No `DayPanel`, conferir o indicador roxo antes do título da tarefa especial. Editar (duplo clique) a tarefa não-especial e marcar como evento especial; conferir que a bolinha e o indicador atualizam sem recarregar a página. Para uma tarefa especial de hoje, conferir que o indicador aparece também em "Agenda de hoje" no Dashboard. Confirmar que criar/editar/concluir/excluir tarefas normais continua funcionando sem alteração de comportamento.
