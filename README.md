# Organizador Pessoal

App pessoal de organização: dashboard, notas com pastas e calendário com tarefas e hábitos diários.

## Setup

1. `npm install`
2. Copie `.env.local.example` para `.env.local` e preencha com a URL e a anon key do seu projeto Supabase (Project Settings > API).
3. `npm run dev` e abra a URL impressa no terminal (geralmente `http://localhost:5173`).

## Build

`npm run build` gera a versão de produção em `dist/` (type-checks via `tsc -b` antes do build).

## Schema

O schema do banco está em `supabase/migrations/0001_init.sql`. Todas as tabelas têm Row Level Security restringindo cada usuário aos próprios dados.

## Pendência conhecida

O projeto Supabase está com "Confirm email" ativado (Authentication > Sign In / Providers > Email), então cadastro novo exige clicar num link de confirmação por e-mail antes do primeiro login funcionar. Para uso pessoal sem essa fricção, desative esse toggle no dashboard do Supabase.
