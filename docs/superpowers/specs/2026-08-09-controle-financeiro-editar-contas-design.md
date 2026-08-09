# Controle Financeiro — Editar Contas (design)

## Contexto

O Controle Financeiro tem múltiplas contas/carteiras desde a etapa de "contas" e, mais recentemente, contas de investimento — mas nunca existiu um jeito de renomear ou excluir uma conta pela interface; isso ficou explicitamente fora de escopo em duas etapas anteriores ("tela de gerenciamento de contas"). Esta etapa fecha essa lacuna: um botão "Editar contas" que abre um modal com a lista de todas as contas, cada uma com renomear inline e excluir.

`accounts.name` já tem uma constraint `unique (user_id, name)` (migração `0006_finance_unique_defaults.sql`) — o mesmo erro de nome duplicado que hoje aparece ao criar conta precisa ser tratado ao renomear. `transactions.account_id` e `transactions.to_account_id` têm `on delete cascade` — apagar uma conta apagaria em cascata qualquer transação ligada a ela. Para não perder dados sem querer, exclusão só é permitida em conta "vazia" (definição abaixo); a cascata do banco continua existindo como rede de segurança, mas nunca deve ser exercitada pela interface.

## Objetivo

1. Botão "Editar contas" no topo da página Finanças, ao lado de "+ Nova conta" e "Transferir".
2. Modal listando todas as contas (normais e de investimento juntas).
3. Renomear uma conta inline (clicar no nome, editar, salvar), com o mesmo tratamento de nome duplicado já usado na criação.
4. Excluir uma conta, só quando ela está **vazia**: nenhuma transação a referencia (nem como `account_id` nem como `to_account_id`) **e** seu saldo (`calculateBalance`) é zero — isso cobre tanto uma conta normal com saldo inicial diferente de zero quanto uma conta de investimento com "valor atual" editado manualmente sem nunca ter recebido transferência. Quando a conta não está vazia, o botão de excluir fica desabilitado com uma dica explicando por quê.
5. Excluir pede confirmação inline ("tem certeza?" com confirmar/cancelar) antes de excluir de verdade.
6. É permitido excluir a última conta restante (mesmo vazia) — isso devolve o usuário para a tela de "nomeie sua conta" do primeiro acesso, e é um comportamento aceito, não bloqueado.

Fora de escopo: editar saldo inicial ou valor atual por aqui (isso já existe no card de saldo); mover/transferir transações de uma conta pra outra antes de excluir; exclusão em lote; qualquer alteração no comportamento de cascata do banco.

## Camada de dados (`financeApi.ts`)

- **`updateAccountName(id: string, name: string): Promise<void>`** (nova) — `update accounts set name = ... where id = ...`, mesmo padrão de `updateAccountInitialBalance`.
- **`deleteAccount(id: string): Promise<void>`** (nova) — `delete from accounts where id = ...`.
- **`isAccountEmpty(account: Account, transactions: Transaction[]): boolean`** (nova, função pura) — `!transactions.some(t => t.account_id === account.id || t.to_account_id === account.id) && calculateBalance(account, transactions) === 0`. Usada só para decidir se o botão de excluir fica habilitado; não é chamada antes de `deleteAccount` como validação de segurança adicional (a interface já garante isso desabilitando o botão).

## Componentes

**`ManageAccountsModal.tsx`** (novo, mesmo padrão visual dos outros modais — overlay `fixed inset-0 bg-black/60 ... onClick={onCancel}`, card com `stopPropagation`):

- Props: `{ accounts: Account[]; transactions: Transaction[]; onRename: (accountId: string, name: string) => void; onDelete: (accountId: string) => void; onCancel: () => void }`.
- Lista uma linha por conta. Nome é um botão clicável que vira um campo de texto inline (mesmo padrão de `Balance.tsx`'s `renderEditor`: input + Salvar + Cancelar, `Enter`/`Escape`, erro inline se o nome for vazio ou duplicado — duplicado detectado pelo mesmo `err.code === '23505'` já usado em `FinancePage.handleCreateAccount`).
- Ao lado do nome, um botão de excluir (✕, mesmo estilo do usado em `MonthlyLimits.tsx`). Desabilitado (`disabled`, opacidade reduzida, `title="Só é possível excluir contas sem movimentações e com saldo zero"`) quando `!isAccountEmpty(account, transactions)`. Quando habilitado e clicado, a linha troca pra um estado de confirmação inline ("Excluir esta conta?" com botões "Confirmar"/"Cancelar") em vez de excluir na hora.
- Sem paginação/scroll especial além do que o número de contas naturalmente pedir (mesmo tratamento de overflow que outras listas do módulo, se a lista crescer).

**`FinancePage.tsx`**: novo botão "Editar contas" no cabeçalho (mesmo estilo dos botões secundários "+ Nova conta"/"Transferir"), novo estado `manageAccountsOpen`. Dois novos handlers:

- `handleRenameAccount(accountId, name)`: chama `updateAccountName`, atualiza a conta no estado local; em erro de nome duplicado (`23505`), mostra "Você já tem uma conta com esse nome." (mesma mensagem já usada na criação).
- `handleDeleteAccount(accountId)`: chama `deleteAccount`, remove a conta do estado local (`setAccounts((prev) => prev.filter(...))`). Como a exclusão só é permitida em conta vazia, não é necessário atualizar `transactions` — nenhuma transação referencia essa conta.

## Teste

Com duas contas normais (uma com saldo, uma vazia) e uma conta de investimento (fundada só por edição manual de valor, sem transferência): abrir "Editar contas", confirmar que a conta vazia tem o botão de excluir habilitado e as outras duas desabilitadas (com a dica ao passar o mouse/focar). Renomear a conta vazia, confirmar que o novo nome aparece em todo canto (saldo, seletor de movimentação, últimas movimentações). Tentar renomear pra um nome que já existe, confirmar a mensagem de erro. Excluir a conta vazia (com confirmação inline), confirmar que ela some de todos os cards do dashboard. Criar uma transferência para uma conta antes vazia e confirmar que o botão de excluir dela passa a ficar desabilitado.
