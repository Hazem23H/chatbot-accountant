-- Mahasib — multi-client workspaces
-- Run in the Supabase SQL Editor after 0001_init.sql.
-- Adds a `clients` table and tags conversations / invoice_validations with an
-- optional client_id. A null client_id means the "General" workspace.

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  fiscal_year  text,
  created_at   timestamptz not null default now()
);

create index if not exists clients_user_idx on public.clients (user_id, created_at desc);

alter table public.conversations
  add column if not exists client_id uuid references public.clients (id) on delete set null;
alter table public.invoice_validations
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists conversations_client_idx
  on public.conversations (user_id, client_id, updated_at desc);
create index if not exists invoice_validations_client_idx
  on public.invoice_validations (user_id, client_id, created_at desc);

-- RLS: a user owns their own clients.
alter table public.clients enable row level security;

drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;

create policy "clients_select_own" on public.clients
  for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients
  for delete using (auth.uid() = user_id);
