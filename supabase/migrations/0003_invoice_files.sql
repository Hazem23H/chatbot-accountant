-- Mahasib — persist the original invoice file for preview
-- Run in the Supabase SQL Editor after 0002_clients.sql.
-- Stores each uploaded invoice in a private `invoices` storage bucket so the
-- document preview survives a reload / reopen of a saved validation.

-- Where the file lives in storage: "<user_id>/<validation_id>.<ext>".
alter table public.invoice_validations
  add column if not exists file_path text;

-- Private bucket — access is gated entirely by the RLS policies below.
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- RLS: a user may only touch objects inside their own top-level folder, whose
-- name must equal their auth uid. storage.foldername(name)[1] is that folder.
drop policy if exists "invoices_select_own" on storage.objects;
drop policy if exists "invoices_insert_own" on storage.objects;
drop policy if exists "invoices_update_own" on storage.objects;
drop policy if exists "invoices_delete_own" on storage.objects;

create policy "invoices_select_own" on storage.objects
  for select using (
    bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "invoices_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "invoices_update_own" on storage.objects
  for update using (
    bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "invoices_delete_own" on storage.objects
  for delete using (
    bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text
  );
