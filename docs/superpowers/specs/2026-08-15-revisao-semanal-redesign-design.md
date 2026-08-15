# Revisão Semanal — redesign visual (design)

## Contexto

A Revisão Semanal (`docs/superpowers/specs/2026-08-14-revisao-semanal-design.md`) foi implementada com três `Card`s idênticos empilhados (Tarefas, Hábitos, Finanças), cada um só com texto solto — "7 de 12 concluídas", uma lista "Nome: X/7", quatro números lado a lado. Funcional, mas sem hierarquia: nenhum dos três blocos usa uma forma visual que reflita o formato do dado que carrega, e não há como comparar a semana atual com a anterior sem abrir a tela duas vezes de cabeça.

Esta etapa reformula a página inteira, mantendo os tokens de design já existentes do app (`src/index.css`: navy `#131826`, `Fraunces Variable` display, `IBM Plex Mono` utilitária, accent `#a9d3f2`) — não é uma nova identidade visual, é a mesma identidade aplicada com mais intenção a cada bloco. Validado iterativamente com Arthur via mockup em Artifact antes de virar código.

## Objetivo

1. **Cabeçalho vira manchete**: o intervalo da semana ("9 – 15 de agosto") em Fraunces grande é o título principal, não "Revisão semanal" genérico. Abaixo dele, uma régua pontilhada com dois "furos" — o mesmo motivo de "ticket perfurado" que já existe no hero do Dashboard (`.hero-fold`, `.perforation-dot`), reaproveitado aqui como um separador. Acima do título, um link "← Hoje" de volta ao Dashboard (hoje a página é becos sem saída — só dava pra voltar pelo botão do navegador).
2. **Cada bloco ganha uma forma que corresponde ao formato do próprio dado**, em vez dos três usarem o mesmo layout de texto solto:
   - **Tarefas**: uma "ficha de contagem" — número grande em Fraunces ("7") + "de 12 tarefas", seguido de uma marca por tarefa (bolinha cheia = concluída, vazada = pendente). Acima de 20 tarefas na semana, as marcas viram lotes de 5 (pílulas em vez de bolinhas) para não virar ruído visual — mesma lógica de contagem em grupos que talões de papel já usam. **Sem** comparação com a semana anterior (não agrega o suficiente pra esse bloco especificamente — ver "Cortando do escopo").
   - **Finanças**: um "ledger" — linhas com guia pontilhada entre rótulo e valor (Entradas, Gastos), uma barra fina mostrando a proporção entre os dois, uma régua, e "Lucro/perda" em destaque (única cor no bloco, junto com a barra — o resto é neutro, para não competir visualmente). "Investido" fica neutro por não fazer parte do balanço entrada/gasto.
   - **Hábitos**: uma matriz semana × hábito — colunas D S T Q Q S S (reaproveitando `WEEKDAY_LABELS` de `dateUtils.ts`), uma marca por dia por hábito (mesma iconografia visual do `HabitRing` já usado no Calendário: círculo cheio + check quando feito), coluna de placar `X/7` à direita.
3. **Comparação com a semana anterior**, como um selo discreto no canto superior direito de Finanças e Hábitos (ao lado da tag de escopo já existente, ex. "Saldo da semana"): seta + valor + "semana passada" por extenso (sem abreviar "vs." ou "sem."). Cor só na seta (verde sobe, vermelho desce); o texto fica neutro — o resto da página já é comedido em cor, esse selo não deve chamar mais atenção que os números principais.
4. **Título de cada bloco vira link**: passar o mouse revela uma seta ("→ calendário", "→ ver tudo") na cor de acento daquele bloco. A revisão deixa de ser só leitura passiva — dá pra ir direto pra tela que tem a ação (marcar tarefa, lançar transação).
5. **Estado vazio de Tarefas**: quando a semana não tem nenhuma tarefa (`total === 0`), o bloco mostra "Nenhuma tarefa nesta semana." em vez de "0 de 0 tarefas" (sem sentido). Hábitos já tinha esse tratamento ("Nenhum hábito criado ainda") — mantém.

## Cortando do escopo

- **Delta de Tarefas**: decisão explícita do Arthur durante a revisão do mockup — o selo de comparação fica só em Finanças e Hábitos.
- **Correlação entre os três blocos** continua fora de escopo (herdado do spec original).
- **Toggle de demonstração das marcas de Tarefas** (visto no mockup em Artifact, alternando 7/12 → 30 tarefas → 0 tarefas): existiu só para validar o comportamento de escala com Arthur antes de implementar. Não faz parte da UI final — o comportamento real (marca individual até 20 tarefas, lotes de 5 acima disso, estado vazio em 0) é sempre determinado pelos dados reais, sem controle manual.

## Modelo de dados e agregação

Nenhuma tabela nova. Mudanças em cima do que já existe (`src/features/weeklyReview/weeklyReviewStats.ts`, `src/pages/WeeklyReviewPage.tsx`):

- `calculateHabitStats` passa a retornar também `days: boolean[]` (7 posições, alinhado a `weekDates`) além de `done`/`total`, para a matriz poder desenhar cada célula sem recalcular por fora.
- A página busca a semana anterior além da atual, só para os dois blocos que mostram delta:
  - Hábitos: `getHabitLogsForRange` da semana anterior → `calculateHabitStats` de novo → soma de `done` de todos os hábitos, comparada com a soma da semana atual.
  - Finanças: `getTransactionsForRange` da semana anterior → `calculateMonthSummary` de novo → `income - expense` comparado com o da semana atual.
  - Tarefas **não** busca a semana anterior (sem delta, sem necessidade do dado).
- `getTasksForRange`, `getRecurringTasks`, `getRecurringLogsForRange`, `getAccounts` continuam chamados só para a semana visível — nenhuma mudança nesses.

## Notas visuais (para quem for implementar)

- Reaproveitar `Card` (`src/components/common/Card.tsx`) sem alterar seu componente — a tintura sutil de borda por bloco vista no mockup (azul/verde/roxo a 16%) foi cortada da implementação real: entrar em conflito de especificidade CSS com a borda padrão do `Card` não vale o ganho visual, que era secundário.
- Reaproveitar `.dash-glow` (já existe em `index.css`, usado no Dashboard) para o glow ambiente do topo da página, em vez de criar uma variante nova.
- Novo CSS vai em `src/index.css`, seguindo o padrão de comentário de seção já usado no arquivo (ex. `/* ---- Dashboard: ... ---- */`): régua perfurada, marca de contagem (bolinha/pílula com animação de "carimbo"), marca de dia da matriz de hábitos (reaproveita visualmente `.ring-control` mas é só leitura, sem `<input>`), guia pontilhada do ledger, selo de tendência, seta de "block title" que vira link.
- Cor de acento por bloco ao passar o mouse no título (`.block-title-link`): azul para Tarefas, verde para Finanças, roxo para Hábitos — usando as variáveis já existentes `--color-primary`, `--color-success`, `--color-special`.
