# Controle Financeiro — Contas/Carteiras (design)

## Contexto

O Controle Financeiro (dashboard + categorias) já está implementado. Esta etapa generaliza o app para suportar múltiplas contas/carteiras, em vez de uma única conta fixa. A tabela `accounts` e a coluna `transactions.account_id` já existem desde a etapa do dashboard — nenhuma mudança de schema é necessária aqui. O trabalho é inteiramente de código de aplicação: hoje `getOrCreateDefaultAccount()` sempre busca/cria só a primeira conta, e `FinancePage`, `Balance`, `RecentTransactions` e `AddTransactionModal` assumem uma única conta.

## Objetivo

1. Estrutura de contas/carteiras que suporte múltiplas contas (sem limite de quantidade).
2. Cada movimentação vinculada a uma conta específica.
3. Despesa desconta da conta selecionada; receita soma na conta selecionada.
4. Saldo geral do dashboard = soma dos saldos de todas as contas.
5. Formulário "Nova movimentação" permite selecionar a conta.
6. A conta escolhida fica registrada na movimentação.
7. Persistência após reload (já garantida pelo banco).
8. Cada conta tem: nome (escolhido pela pessoa, não fixo), saldo inicial, identificação visual simples (iniciais, reaproveitando o padrão de avatar já usado no menu do app).

Fora de escopo nesta etapa: transferência entre contas, tela de gerenciamento de contas (criar/editar/excluir depois da criação inicial), cartão de crédito, metas, orçamento, contas recorrentes, investimentos, gráficos.

## Primeiro acesso (nomear a conta)

Como não há mais um nome fixo ("Nubank") no bootstrap, ao entrar em "Finanças" sem nenhuma conta cadastrada aparece um modal (mesmo padrão visual do `AddTransactionModal`) pedindo **nome da conta** e **saldo inicial**. O dashboard só é liberado depois que a conta é criada. Não há edição/exclusão de conta depois disso nesta etapa — isso fica para uma futura tela de gerenciamento.

## Camada de dados (`src/features/finance/financeApi.ts`)

Funções alteradas/novas:

- **`getAccounts(): Promise<Account[]>`** — substitui `getOrCreateDefaultAccount()`. Retorna a lista de contas do usuário (RLS já isola por usuário), sem criar nada automaticamente.
- **`createAccount(name: string, initialBalance: number): Promise<Account>`** — cria uma conta com nome e saldo inicial escolhidos. Usada pelo modal de primeiro acesso; reutilizável por uma futura tela de gerenciamento.
- **`getTransactions(): Promise<Transaction[]>`** — substitui `getAccountTransactions(accountId)`. Retorna todas as movimentações do usuário, de todas as contas.
- **`calculateBalance(account, transactions)`** — corrigida para filtrar as movimentações por `t.account_id === account.id` antes de somar (hoje não filtra, porque só recebia movimentações de uma conta já pré-filtrada; com a lista global isso passa a ser necessário).
- **`calculateTotalBalance(accounts: Account[], transactions: Transaction[]): number`** — nova função pura que soma `calculateBalance` de cada conta.

`calculateMonthSummary` não muda — como `transactions` passa a ser a lista global, o resumo do mês naturalmente soma todas as contas, consistente com o saldo total.

`updateAccountInitialBalance(id, value)` não muda de assinatura, só passa a ser chamada por conta (uma por linha na lista de contas do card de saldo), em vez de uma vez só para a conta única.

## Componentes

**`FinancePage.tsx`**: estado `account: Account | null` vira `accounts: Account[]`; `transactions` vira a lista global (`getTransactions()`). Se `accounts.length === 0` após carregar, renderiza o modal de nomear conta (bloqueante) em vez do dashboard. `handleCreateTransaction` e `handleUpdateInitialBalance` passam a receber/usar o `accountId` correspondente.

**`Balance.tsx`**: mostra `calculateTotalBalance(accounts, transactions)` em destaque (substitui o saldo de uma conta só). Abaixo, uma lista simples: uma linha por conta, com nome + uma bolinha de iniciais (identificação visual, mesmo padrão do avatar de iniciais já usado no `Sidebar`/`BottomNav` via `emailInitials`) + saldo daquela conta (`calculateBalance`). Clicar numa linha abre a mesma edição inline de saldo inicial que existe hoje, mas escopada àquela conta.

**`RecentTransactions.tsx`**: prop `account: Account` vira `accounts: Account[]`; a legenda de cada movimentação passa a resolver o nome da conta pelo `account_id` da própria movimentação (mesmo padrão já usado para resolver o nome da categoria), em vez de mostrar sempre a mesma conta fixa.

**`AddTransactionModal.tsx`**: ganha um `<select>` de conta (mesmo estilo do seletor de categoria), populado a partir de `accounts`, pré-selecionando a primeira. O `accountId` escolhido vai junto no objeto passado a `onSave`.

**`CreateAccountModal.tsx`** (novo arquivo, mesmo padrão visual do `AddTransactionModal`): campos nome (obrigatório) e saldo inicial (opcional — vazio equivale a `0`, reaproveitando `parseCurrencyInput`), botão "Criar conta". Sem cancelar (é bloqueante — precisa de pelo menos uma conta para usar a tela).

**`MonthSummary.tsx`** e **`AvailableToSpend.tsx`**: sem mudanças de código.

## Teste

Com a conta existente (não passa pelo modal de nomear, já que a etapa anterior já criou uma conta para a conta real de teste), adicionar uma movimentação de despesa e uma de receita, confirmando: a conta selecionada aparece corretamente na movimentação, o saldo da conta e o saldo total do dashboard refletem o desconto/soma corretamente, e a lista de contas no card de saldo mostra a conta com sua identificação visual.
