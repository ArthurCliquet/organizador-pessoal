# Controle Financeiro — Tela inicial (design)

## Contexto

O app "Organizador Pessoal" (Dashboard, Notas, Calendário) ganha uma quarta seção: **Finanças**. Esta spec cobre apenas a **primeira etapa**: a tela inicial (dashboard financeiro) e a estrutura de dados mínima necessária para ela funcionar com dados reais. Funcionalidades futuras (contas recorrentes, metas, orçamento completo, gráficos avançados, parcelas, investimentos, cartão de crédito, gestão de categorias) ficam fora de escopo — a estrutura só precisa deixar espaço para elas.

Código-fonte do app vive no worktree `main` (`.claude/worktrees/organizador-pessoal`), não em `master`. Esta spec é escrita em `master`, seguindo o padrão já usado para os docs de planejamento do projeto.

## Objetivo da tela inicial

Um dashboard financeiro simples com:

1. Saldo atual (calculado a partir de contas + movimentações)
2. Resumo do mês (entradas vs. gastos)
3. Espaço reservado para "quanto posso gastar" (placeholder, sem regra de orçamento ainda)
4. Botão "+ Adicionar movimentação" — **funcional** já nesta etapa (formulário mínimo)
5. Lista das últimas movimentações (descrição, valor, data, tipo, categoria, conta)

Fora de escopo nesta etapa: cartão de crédito, contas recorrentes, metas, orçamento completo, gráficos, parcelas, investimentos, tela de gestão de categorias.

## Abordagem escolhida: bootstrap automático

Ao entrar em "Finanças" pela primeira vez, o app cria automaticamente (se ainda não existirem):
- uma conta padrão "Nubank" com `initial_balance = 0`
- um conjunto padrão de categorias (Salário, Outras receitas / Alimentação, Transporte, Moradia, Lazer, Saúde, Outros)

Sem tela de configuração inicial — o usuário chega direto no dashboard e ajusta o saldo clicando nele. Consistente com o resto do app (hábitos e pendências também não têm setup prévio).

O saldo real da conta é ajustado pelo próprio usuário, pela UI, editando o campo `initial_balance` da conta (não é hardcoded via migration/seed).

## Modelo de dados

Três tabelas novas, seguindo o padrão existente (RLS por `user_id`, sem abstrações extras — ver `supabase/migrations/0001_init.sql` como referência de estilo).

### `accounts`
| campo | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | fk `auth.users`, RLS owner |
| name | text | ex: "Nubank" |
| initial_balance | numeric | not null default 0, editável pela UI |
| created_at | timestamptz | default now() |

### `categories`
| campo | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | fk `auth.users`, RLS owner |
| name | text | ex: "Alimentação" |
| type | text | `'income'` \| `'expense'` |
| created_at | timestamptz | default now() |

### `transactions`
| campo | tipo | notas |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | fk `auth.users`, RLS owner |
| account_id | uuid | fk `accounts`, on delete cascade |
| category_id | uuid, nullable | fk `categories`, on delete set null |
| type | text | `'income'` \| `'expense'` |
| amount | numeric | sempre positivo; sinal vem de `type` |
| description | text | |
| date | date | |
| created_at | timestamptz | default now() |

**Saldo atual** = `account.initial_balance` + soma(`income`) − soma(`expense`) das transações daquela conta. Calculado em memória (client-side ou query agregada), não guardado como campo redundante.

**Resumo do mês** = soma de `income` e soma de `expense` das transações do mês corrente (`date` dentro do mês atual).

RLS: mesma policy `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)` usada em `tasks`/`habits`, adaptada para cada tabela.

## Estrutura de arquivos

```
supabase/migrations/0005_finance.sql   # accounts, categories, transactions + RLS + índices

src/types/index.ts                     # + Account, Category, Transaction (editado)

src/features/finance/
  financeApi.ts            # getOrCreateDefaultAccount, ensureDefaultCategories,
                            # getAccounts, getCategories, getRecentTransactions,
                            # getMonthSummary(accountId, yearMonth), createTransaction,
                            # updateAccountInitialBalance
  Balance.tsx               # "Saldo atual" — clique abre edição do saldo inicial
  MonthSummary.tsx          # "Resumo do mês" — entradas vs. gastos
  AvailableToSpend.tsx      # "Quanto posso gastar" — placeholder estático, Card isolado
                            # para receber a lógica de orçamento numa etapa futura
  RecentTransactions.tsx    # lista das últimas movimentações
  AddTransactionModal.tsx   # form mínimo: descrição, valor, data, tipo, categoria
                            # (conta fixa = única conta existente, sem seletor por ora)

src/pages/FinancePage.tsx        # monta os blocos em Cards, dispara o bootstrap ao montar

src/components/layout/Sidebar.tsx    # editado: + link "Finanças" → /financas
src/components/layout/BottomNav.tsx  # editado: + link "Finanças" → /financas
src/App.tsx                          # editado: + rota /financas
```

Componentes e padrões reaproveitados sem alteração: `Card`, `ConfirmDialog`, `Spinner`, `ToastContext`, tipografia (Fraunces para valores/números grandes, IBM Plex Mono para datas/valores monetários — mesma convenção do resto do app).

## Layout da página

```
[ Saldo atual ]              [ Quanto posso gastar ]
[ Resumo do mês ]            [ + Adicionar movimentação ]
[ Últimas movimentações ]
```

Mesma composição em grid de `Card`s usada em `DashboardPage.tsx`, sem componente de layout novo.

## Fluxos

**Ao montar `FinancePage`:** chama `ensureDefaultAccount()` e `ensureDefaultCategories()` (idempotentes), depois carrega conta, categorias e transações recentes em paralelo. `Spinner` durante o carregamento; erros via `useToast` (mesmo padrão de `PendingTasks`/`RecentNotes`).

**Editar saldo inicial:** clique no valor do "Saldo atual" abre um modal (reaproveitando o padrão visual do `ConfirmDialog`) com um campo numérico para `initial_balance`.

**Adicionar movimentação:** modal com descrição, valor, data (padrão: hoje), tipo (entrada/saída), categoria (select filtrado pelo tipo escolhido). Conta é sempre a única existente — sem seletor visível nesta etapa.

## Fora de escopo (etapas futuras)

Cartão de crédito, contas recorrentes, metas financeiras, orçamento completo (a lógica de "quanto posso gastar"), gráficos avançados, parcelas, investimentos, tela de gestão de categorias, suporte a múltiplas contas na UI (a estrutura já suporta, mas sem seletor/gestão agora).
