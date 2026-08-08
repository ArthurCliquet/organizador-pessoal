# Controle Financeiro — Categorias de movimentações (design)

## Contexto

A tela inicial do Controle Financeiro (dashboard: saldo, resumo do mês, últimas movimentações, botão de adicionar movimentação) já está implementada e em PR aberto (branch `worktree-organizador-pessoal`). O formulário "Nova movimentação" já tem um campo de categoria, populado por um bootstrap automático que cria 8 categorias padrão (`Salário`, `Outras receitas`, `Alimentação`, `Transporte`, `Moradia`, `Lazer`, `Saúde`, `Outros`) na primeira visita de cada usuário.

Esta spec cobre apenas a **lista de categorias padrão** — trocar o conjunto inicial pelo que Arthur realmente quer usar, sem construir uma tela de gerenciamento de categorias (isso fica para uma etapa futura).

## Objetivo

1. Categorias de **despesa**: Alimentação, Transporte, Lazer, Compras, Educação, Saúde, Casa, Assinaturas, Roupas, Outros.
2. Categorias de **receita**: Salário, Presente, Mesada, Investimentos, Outros.
3. O campo de categoria no formulário de movimentação deve mostrar só categorias de despesa quando "Saída" está selecionado, e só categorias de receita quando "Entrada" está selecionado.
4. As categorias devem continuar armazenadas de um jeito que permita criar/editar/excluir no futuro (sem construir essa UI agora).
5. Movimentações já existentes devem continuar funcionando normalmente.
6. Nenhuma outra funcionalidade financeira é alterada nesta etapa.

## O que já está pronto (não precisa mudar)

- **Filtro por tipo:** `AddTransactionModal.tsx` já faz `categories.filter(c => c.type === type)` — funciona com qualquer lista de categorias, sem alteração necessária.
- **Estrutura de dados:** a tabela `categories` (`id`, `user_id`, `name`, `type`, `created_at`), com RLS por usuário e a constraint `unique(user_id, name, type)` (adicionada na migration `0007`), já suporta múltiplas categorias com o mesmo nome em tipos diferentes (ex: "Outros" como despesa e como receita) e já está pronta para uma futura tela de CRUD.
- **Movimentações existentes:** referenciam categoria por `category_id` (FK `on delete set null`), então trocar a lista de categorias padrão não quebra nada já criado.

## O que muda

**`src/features/finance/financeApi.ts`** — a constante `DEFAULT_CATEGORIES` passa a ser:

```typescript
const DEFAULT_CATEGORIES: { name: string; type: Category['type'] }[] = [
  { name: 'Alimentação', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Compras', type: 'expense' },
  { name: 'Educação', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Casa', type: 'expense' },
  { name: 'Assinaturas', type: 'expense' },
  { name: 'Roupas', type: 'expense' },
  { name: 'Outros', type: 'expense' },
  { name: 'Salário', type: 'income' },
  { name: 'Presente', type: 'income' },
  { name: 'Mesada', type: 'income' },
  { name: 'Investimentos', type: 'income' },
  { name: 'Outros', type: 'income' },
];
```

Nenhuma outra mudança de código é necessária — `ensureDefaultCategories()` já só semeia a lista padrão quando o usuário tem zero categorias, e o formulário já filtra corretamente.

## Dado existente na conta real do Arthur

A conta real (`arthur@organizador.local`) já tem as 8 categorias antigas criadas (de um teste anterior de login), sem nenhuma movimentação associada a elas. Como o bootstrap só roda quando a lista de categorias está vazia, apenas trocar a constante no código não atualiza o que já existe para essa conta.

**Ação (confirmada com Arthur):** apagar as 8 categorias antigas da conta real via SQL, como parte da implementação desta etapa. Na próxima visita à tela "Finanças", o bootstrap detecta zero categorias e recria a lista nova automaticamente. Seguro porque não há movimentações referenciando essas categorias.

## Teste

Registrar uma movimentação de despesa (confirmar que aparecem só as 10 categorias de despesa) e uma de receita (confirmar que aparecem só as 5 categorias de receita).

## Fora de escopo

Tela de gerenciamento de categorias (criar/editar/excluir pela UI), qualquer outra funcionalidade financeira (orçamento, gráficos, contas recorrentes, metas, cartão de crédito, parcelas, investimentos).
