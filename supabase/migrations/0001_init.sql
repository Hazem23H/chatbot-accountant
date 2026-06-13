-- Saudi Accountant AI — initial schema
-- Run this in the Supabase SQL Editor (or via the Supabase CLI).
-- Covers: conversation history, saved invoice validations, usage/rate-limit
-- tracking, and user accounts (via Supabase Auth + Row Level Security).

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- CONVERSATIONS
-- ===========================================================================
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'New chat',
  language    text not null default 'ar' check (language in ('ar', 'en')),
  topic_id    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists conversations_user_idx
  on public.conversations (user_id, updated_at desc);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- MESSAGES
-- ===========================================================================
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null default '',
  attachment       jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- ===========================================================================
-- INVOICE VALIDATIONS  (saved results from the ZATCA validator)
-- ===========================================================================
create table if not exists public.invoice_validations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  file_name   text,
  language    text not null default 'ar' check (language in ('ar', 'en')),
  extracted   jsonb,        -- ExtractedInvoice
  flags       jsonb,        -- ValidationFlag[]
  summary     jsonb,        -- { total, errors, warnings, infos, passed }
  passed      boolean,
  created_at  timestamptz not null default now()
);

create index if not exists invoice_validations_user_idx
  on public.invoice_validations (user_id, created_at desc);

-- ===========================================================================
-- USAGE EVENTS  (rate limiting / abuse tracking — written server-side only)
-- ===========================================================================
create table if not exists public.usage_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  ip          text,
  route       text not null,        -- e.g. 'chat', 'analyze', 'validate'
  created_at  timestamptz not null default now()
);

create index if not exists usage_events_ip_idx   on public.usage_events (ip, created_at desc);
create index if not exists usage_events_user_idx on public.usage_events (user_id, created_at desc);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.invoice_validations enable row level security;
alter table public.usage_events        enable row level security;

-- conversations: a user only sees/owns their own
create policy "conversations_select_own" on public.conversations
  for select using (auth.uid() = user_id);
create policy "conversations_insert_own" on public.conversations
  for insert with check (auth.uid() = user_id);
create policy "conversations_update_own" on public.conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversations_delete_own" on public.conversations
  for delete using (auth.uid() = user_id);

-- messages: access is gated through the parent conversation's owner
create policy "messages_select_own" on public.messages
  for select using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  ));
create policy "messages_insert_own" on public.messages
  for insert with check (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  ));
create policy "messages_delete_own" on public.messages
  for delete using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  ));

-- invoice_validations: a user only sees/owns their own
create policy "validations_select_own" on public.invoice_validations
  for select using (auth.uid() = user_id);
create policy "validations_insert_own" on public.invoice_validations
  for insert with check (auth.uid() = user_id);
create policy "validations_delete_own" on public.invoice_validations
  for delete using (auth.uid() = user_id);

-- usage_events: no client access at all. Only the service-role key (which
-- bypasses RLS) writes/reads these from the server. No policies = locked down.
