# Controle Financeiro — Investimentos (design)

## Contexto

Hoje o Controle Financeiro só tem dois tipos de movimentação, `income` e `expense`, presas a uma conta, e o "Resumo do mês" soma essas duas colunas. Não existe jeito de registrar "tirei dinheiro da conta corrente e apliquei em ações" sem que isso seja contado errado como gasto (ou ignorado). Também não existe, hoje, nenhum jeito de criar uma *segunda* conta pela interface — o `CreateAccountModal` só é usado no fluxo bloqueante de primeiro acesso (`FinancePage`, quando `accounts.length === 0`); isso é um pré-requisito que esta etapa também resolve, já que investimento vai morar numa conta separada.

Esta etapa adiciona: contas marcadas como "de investimento", transferência entre contas (mecanismo genérico, reaproveitável para qualquer conta, não só investimento), edição do valor atual de uma conta de investimento com ganho/perda calculado, e reflexo disso no saldo do dashboard e no resumo do mês.

## Objetivo

1. Criar uma conta marcando-a como "conta de investimento" — ela não recebe saldo inicial digitado, só passa a ter dinheiro via transferência.
2. Transferir um valor de qualquer conta para qualquer outra conta do usuário (não é exclusivo de investimento, mas é o mecanismo usado para investir).
3. Contas de investimento ficam de fora do seletor de conta em "Nova movimentação" — só mudam de saldo por transferência.
4. Editar o "valor atual" de uma conta de investimento (ex: valorização/desvalorização de ações), com ganho/perda calculado e exibido (valor e percentual, comparado ao total transferido pra lá).
5. "Saldo atual" do dashboard passa a mostrar separadamente saldo disponível (contas normais) e total investido (contas de investimento).
6. "Resumo do mês" ganha uma terceira coluna, "Investido", com a soma das transferências para contas de investimento feitas no mês (não inclui ganho/perda por valorização, que não é fluxo do mês).
7. "Últimas movimentações" mostra transferências com um estilo visual próprio, diferente de gasto/entrada.
8. Passa a existir um jeito de criar uma segunda conta (normal ou de investimento) pela interface, fora do fluxo de primeiro acesso.

Fora de escopo nesta etapa: tela de gerenciamento de contas (renomear/excluir), integração com cotação real de mercado, histórico de cada atualização de valor como uma lista de eventos (só o valor atual + ganho/perda agregado), cartão de crédito, metas, contas recorrentes, gráficos.

## Modelo de dados

**`accounts`** ganha duas colunas:
- `is_investment boolean not null default false`
- `value_adjustment numeric not null default 0` — diferença entre o valor atual (definido manualmente pela pessoa) e o total transferido para a conta. Só é diferente de zero em contas de investimento.

**`transactions`** ganha um terceiro valor para `type`: `'transfer'`, e uma coluna nova `to_account_id uuid null references accounts(id)`. Para `type = 'transfer'`: `account_id` é a conta de origem, `to_account_id` é a conta de destino, `category_id` fica `null`. Para `income`/`expense`, `to_account_id` continua `null`.

## Cálculo de saldo (`financeApi.ts`)

- **`calculateBalance(account, transactions)`**: passa a somar também as transferências — subtrai quando `account_id === account.id` e `type === 'transfer'`, soma quando `to_account_id === account.id`. Para contas com `is_investment`, soma ainda `account.value_adjustment` no final (o "valor atual" declarado por cima do total aportado).
- **`calculateContributedTotal(account, transactions)`** (nova, só relevante para contas de investimento): igual a `calculateBalance`, mas sem somar `value_adjustment` — é o total efetivamente transferido para lá, usado para calcular o ganho/perda.
- **`calculateTotalBalance(accounts, transactions)`**: passa a somar só as contas com `is_investment === false` (é o "saldo disponível").
- **`calculateTotalInvested(accounts, transactions)`** (nova): soma `calculateBalance` das contas com `is_investment === true`.
- **`calculateMonthSummary(transactions, monthStart, monthEnd, accounts)`**: assinatura ganha `accounts` (para saber quais contas são de investimento); retorno ganha `invested`, somando o `amount` das transações `type === 'transfer'` no mês cujo `to_account_id` aponta para uma conta com `is_investment === true`. `income`/`expense` continuam ignorando transferências (não mudam).

## Camada de dados — funções novas/alteradas

- **`createAccount(name, initialBalance, isInvestment = false)`**: quando `isInvestment` é `true`, `initial_balance` é sempre gravado como `0` (o campo de saldo inicial não é exibido para esse caso no formulário).
- **`createTransfer(input: { fromAccountId, toAccountId, amount, description, date }): Promise<Transaction>`**: insere uma linha em `transactions` com `type: 'transfer'`, `account_id: fromAccountId`, `to_account_id: toAccountId`, `category_id: null`.
- **`updateInvestmentValue(accountId, currentValue, contributedTotal)`**: grava `value_adjustment = currentValue - contributedTotal` na conta. `contributedTotal` é calculado no componente via `calculateContributedTotal` antes de chamar essa função.

## Componentes

**`CreateAccountModal.tsx`**: ganha um checkbox "É uma conta de investimento". Quando marcado, o campo "Saldo inicial" some (implicitamente `0`). Passa a aceitar um `onCancel` opcional — continua sem cancelar no fluxo de primeiro acesso (bloqueante), mas quando aberta pelo novo botão "+ Nova conta" (fora do bootstrap) mostra um botão "Cancelar".

**`FinancePage.tsx`**: cabeçalho ganha os botões "+ Nova conta" (abre `CreateAccountModal` em modo não bloqueante) e "Transferir" (abre `TransferModal`, só habilitado com 2+ contas). `handleCreateTransfer` chama `createTransfer` e recarrega as transações. `handleUpdateInvestmentValue` chama `updateInvestmentValue` e atualiza a conta localmente. `calculateMonthSummary` passa a receber `accounts` também.

**`TransferModal.tsx`** (novo, mesmo padrão visual do `AddTransactionModal`): campos conta de origem, conta de destino (a lista de destino exclui a conta já selecionada como origem), valor, data, descrição opcional. Botões Salvar/Cancelar.

**`Balance.tsx`**: divide a lista de contas em duas seções. "Saldo disponível" mostra `calculateTotalBalance` (só contas normais) e a lista dessas contas, com a mesma edição inline de saldo inicial que já existe. Abaixo, "Investido" mostra `calculateTotalInvested` e a lista das contas de investimento; cada linha exibe, junto do saldo, o ganho/perda calculado (`calculateBalance − calculateContributedTotal`) como valor e percentual, em verde se positivo e vermelho se negativo — sempre visível, não só depois de editar. Clicar numa conta de investimento abre a edição inline do **valor atual** (em vez de saldo inicial), reaproveitando a mesma interação já usada para saldo inicial.

**`AddTransactionModal.tsx`**: o `<select>` de conta passa a filtrar `accounts.filter(a => !a.is_investment)` — contas de investimento não aparecem ali.

**`MonthSummary.tsx`**: grid passa de 2 para 3 colunas (Entradas / Gastos / Investido), usando o novo campo `invested` de `calculateMonthSummary`. A cor do valor "Investido" usa a cor primária (azul-bebê), não verde/vermelho — não é ganho nem gasto, é dinheiro que só mudou de lugar.

**`RecentTransactions.tsx`**: quando `t.type === 'transfer'`, a linha mostra "`<conta origem>` → `<conta destino>`" no lugar da categoria/conta atual, sem sinal de `+`/`-`, em cor neutra (primária) em vez de verde/vermelho.

## Teste

Com uma conta normal já existente ("Conta corrente", saldo R$100): criar uma conta nova marcada como investimento ("Ações XP"), confirmar que ela não aparece no seletor de "Nova movimentação". Transferir R$50 de "Conta corrente" para "Ações XP": conferir que saldo disponível cai para R$50, "Investido" mostra R$50, o resumo do mês mostra "Investido: R$50,00", e a transferência aparece em "Últimas movimentações" com o visual de seta/cor neutra. Editar o valor atual de "Ações XP" para R$55: conferir que aparece "+R$5,00 (+10%)" em verde, o total "Investido" no card de saldo passa a R$55, e o saldo disponível não muda. Confirmar que lançar um gasto/entrada normal continua funcionando sem alterações de comportamento.
