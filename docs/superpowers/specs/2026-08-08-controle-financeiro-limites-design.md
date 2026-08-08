# Controle Financeiro — Limites Mensais (design)

## Contexto

O Controle Financeiro (dashboard, categorias, contas) já está implementado. Esta etapa substitui o card placeholder "Quanto posso gastar" (`AvailableToSpend.tsx`, hoje só um texto "em breve") por uma seção real: **Limites Mensais**, onde o usuário define um teto de gasto mensal por categoria de despesa e acompanha visualmente o quanto já gastou.

## Objetivo

1. Usuário escolhe uma categoria de despesa e define um limite mensal para ela.
2. A seção começa vazia — nenhum limite pré-cadastrado.
3. Cada limite definido vira uma barra de progresso mostrando o quanto já foi gasto naquela categoria **no mês atual** em relação ao limite.
4. Cor da barra: verde até 70% do limite, amarelo de 70% a 99%, vermelho a partir de 100% (a barra não ultrapassa visualmente 100%, só fica vermelha "cheia").
5. O limite é permanente (não travado a um mês específico) — todo mês o gasto é recalculado contra o mesmo valor de limite, do mesmo jeito que "Resumo do mês" já recalcula entradas/gastos a cada mês.
6. Usuário pode editar o valor de um limite já definido.
7. Usuário pode remover um limite (a categoria volta a ficar disponível para receber um novo limite).
8. O seletor de categoria ao adicionar um novo limite só mostra categorias de despesa que ainda não têm limite definido.

Fora de escopo: limites por mês específico (histórico), limites em categorias de receita, qualquer outra funcionalidade financeira além desta seção.

## Modelo de dados

Nova tabela `category_limits`, seguindo o padrão RLS já usado em todas as outras tabelas de finanças:

| campo | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | fk `auth.users`, RLS owner |
| category_id | uuid | fk `categories`, on delete cascade |
| monthly_limit | numeric | not null, check > 0 |
| created_at | timestamptz | default now() |

Constraint única `(user_id, category_id)` — no máximo um limite por categoria por usuário.

**Gasto do mês por categoria** = soma das transações do tipo `expense` daquela categoria, com `date` dentro do mês atual — mesma lógica de `calculateMonthSummary`, mas filtrada por categoria.

## Camada de dados (`src/features/finance/financeApi.ts`)

- **`getCategoryLimits(): Promise<CategoryLimit[]>`** — lista os limites do usuário.
- **`createCategoryLimit(categoryId: string, monthlyLimit: number): Promise<CategoryLimit>`**
- **`updateCategoryLimit(id: string, monthlyLimit: number): Promise<void>`**
- **`deleteCategoryLimit(id: string): Promise<void>`**
- **`calculateCategorySpending(categoryId: string, transactions: Transaction[], monthStart: string, monthEnd: string): number`** — função pura, soma as despesas da categoria no intervalo do mês.

## Componente

`src/features/finance/AvailableToSpend.tsx` é removido; `src/features/finance/MonthlyLimits.tsx` (novo) toma seu lugar no dashboard:

- **Lista de limites existentes**: uma linha por limite, com nome da categoria, barra de progresso colorida (verde/amarelo/vermelho conforme os limiares acima), texto "R$ gasto / R$ limite", botão de editar (abre edição inline do valor, mesmo padrão já usado na edição de saldo de conta) e botão de remover ("×", mesmo padrão usado em Pendências/Hábitos).
- **Estado vazio**: "Nenhum limite definido ainda" quando não há nenhum limite.
- **Adicionar limite**: seletor de categoria (populado só com categorias de despesa que ainda não têm limite) + campo de valor + botão "Definir limite". Se todas as categorias de despesa já tiverem limite, o controle de adicionar fica oculto (nada a adicionar).

## Integração com `FinancePage.tsx`

`FinancePage` passa a carregar `category_limits` junto com contas/categorias/movimentações (mais uma chamada no `Promise.all` do `load()`), guarda em estado, e troca `<AvailableToSpend />` por `<MonthlyLimits categoryLimits={...} categories={...} transactions={...} onCreate={...} onUpdate={...} onDelete={...} />`. Os handlers de criar/editar/remover seguem o mesmo padrão dos demais handlers da página (chamam a API, atualizam o estado local, mostram toast de erro em caso de falha).

## Teste

Definir um limite para "Alimentação" (ex: R$ 500), registrar uma despesa nessa categoria e confirmar que a barra reflete o percentual correto e a cor certa; testar a transição de cor registrando gastos suficientes para passar de verde para amarelo e para vermelho; editar o valor do limite; remover o limite e confirmar que a categoria volta a aparecer no seletor de "adicionar".
