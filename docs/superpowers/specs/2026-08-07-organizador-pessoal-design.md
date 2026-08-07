# Organizador Pessoal — Design

## Visão geral

App web de organização pessoal para uso individual (um único usuário real, mas com login por segurança e acesso multi-dispositivo). Três áreas principais — Dashboard, Notas e Calendário — atrás de autenticação por e-mail/senha.

## Arquitetura

- **Frontend**: React + Vite + TypeScript, React Router para navegação entre Dashboard / Notas / Calendário.
- **Backend**: Supabase — Auth (e-mail/senha) + Postgres para dados. Row Level Security restringe cada tabela a `user_id = auth.uid()`.
- **Estilo**: Tailwind CSS, tema **Dark Mode** — fundo `#16171d`, cards `#1e1f28`/`#2f3040` de borda, acento primário roxo `#7c5cff`, acento de sucesso/concluído verde `#4ade9a`. Totalmente responsivo: sidebar fixa no desktop, menu inferior/hambúrguer no mobile.
- **Execução**: local via `npm run dev` nesta fase. Sem deploy definido ainda (Vercel é a opção natural quando chegar a hora, por já casar com Supabase).

## Modelo de dados (Postgres/Supabase)

- **folders** — `id, user_id, name, created_at`
- **notes** — `id, user_id, folder_id (nullable), title, content, updated_at`
  - Pastas de nível único (sem subpastas). Nota pode não ter pasta ("solta").
  - `content` guarda texto formatado (rich text simples: negrito, itálico, listas, títulos).
- **habits** — `id, user_id, name, created_at`
  - Lista de hábitos diários fixa por usuário, mas editável (criar/editar/excluir hábito).
- **habit_logs** — `id, habit_id, date, done`
  - Um registro por hábito por dia. O "reset diário" é implícito: um dia novo simplesmente ainda não tem log, então nasce desmarcado — sem job de reset.
- **tasks** — `id, user_id, date, time (nullable), title, done`
  - Tarefas de dia específico, com horário opcional. Quando têm horário, a lista do dia é ordenada por ele.

Todas as tabelas com RLS habilitado, policies restringindo leitura/escrita ao dono (`auth.uid()`).

## Telas e navegação

Layout base: sidebar fixa (desktop) / bottom nav (mobile) com 3 ícones — Dashboard, Notas, Calendário — mais header com nome do usuário e logout.

### Login / Cadastro
Tela simples com e-mail/senha via Supabase Auth, toggle entre "Entrar" e "Criar conta". Mensagens de erro claras para credenciais inválidas.

### Dashboard
- Card "Hoje": tarefas do dia (ordenadas por horário quando houver) + checklist de hábitos diários, ambos marcáveis direto ali.
- Mini agenda dos próximos 2-3 dias, compacta, clicável para abrir o dia no Calendário.
- Notas recentes (últimas editadas), clicáveis para abrir direto no editor.

### Notas
- Sidebar de pastas à esquerda (+ opção "sem pasta"), lista de notas da pasta selecionada no meio, editor rich-text simples à direita (tela cheia no mobile).
- Busca no topo filtra notas por título/conteúdo.
- CRUD completo de pastas e notas (criar, editar, excluir).

### Calendário
- View mensal em grade, com indicador visual nos dias que têm tarefas.
- Clicar num dia abre painel/modal com duas listas separadas:
  1. **Tarefas do dia** — horário opcional, criar/editar/excluir/marcar como feita.
  2. **Hábitos diários** — mesma lista fixa de hábitos, check independente por dia.

## Fluxo de dados

Cliente React fala direto com Supabase via `supabase-js`, sem backend intermediário. Sessão de auth gerenciada pelo SDK (token e refresh automáticos). Cada tela busca somente os dados que precisa — ex: Dashboard busca tarefas de hoje, hábitos + logs de hoje, e as 5 notas mais recentes.

## Tratamento de erros

Simples e direto: falha de query mostra toast de erro amigável com opção de tentar de novo; login com credenciais inválidas mostra mensagem clara no formulário; estados de carregamento usam spinners básicos, sem skeleton screens elaborados.

## Testes

Sem suíte automatizada nesta primeira versão, dado o escopo pessoal do projeto. Validação manual dos fluxos principais antes de considerar pronto: criar/editar/excluir em cada área (pastas, notas, tarefas, hábitos), login/logout, e o comportamento de reset diário dos hábitos ao virar o dia.

## Escopo desta versão

**Incluído**: Dashboard, Notas (pastas + CRUD + busca), Calendário (tarefas com horário opcional + hábitos diários), login/cadastro por e-mail/senha, edição/exclusão de tarefas e hábitos, dark mode responsivo.

**Fora de escopo (pode virar versão futura)**: subpastas aninhadas, tarefas recorrentes semanais/mensais, notificações/lembretes, múltiplos usuários reais, deploy em produção, testes automatizados.
