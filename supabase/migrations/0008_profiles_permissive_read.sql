-- ============================================================================
-- Migration 0008: Ensure `profiles` exists + permissive authenticated read
-- ============================================================================
-- Additive / idempotent. Deploy with: supabase db push
--
-- The `profiles` table is created by 0001_init_funding.sql (with balance,
-- flw_* fields and admin role check). `CREATE TABLE IF NOT EXISTS` below is a
-- safe no-op when that schema is present, but it guarantees the table exists
-- even on a fresh DB where only this script runs.

create table if not exists public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  full_name     text,
  email         text,
  role          text not null default 'member',
  created_at    timestamptz not null default now()
);

-- Enable RLS (idempotent).
alter table public.profiles enable row level security;

-- Allow authenticated users to view profiles.
drop policy if exists "Allow authenticated read" on public.profiles;
create policy "Allow authenticated read"
  on public.profiles
  for select
  to authenticated
  using (true);