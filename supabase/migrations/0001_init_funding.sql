-- ============================================================================
-- Iyanu Oluwa Society — Hybrid Funding System
-- Migration 0001: profiles, app_settings, deposits + RLS + storage bucket
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES — linked to Supabase Auth
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  role               text not null default 'member' check (role in ('member', 'admin')),
  balance            numeric(14, 2) not null default 0,
  flw_account_number text,
  flw_bank_name      text,
  flw_ref            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: users read/update only their own profile; admins read all.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all"
  on public.profiles for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. HELPER — admin check
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. APP_SETTINGS — key/value store (gateway keys, coop bank details)
--    Readable by authenticated members, writable by admin only.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('flutterwave_public_key', ''),
  ('flutterwave_secret_key', ''),
  ('flutterwave_secret_hash', ''),
  ('pass_fees_to_user', 'false'),
  ('coop_bank_name', 'Zenith Bank'),
  ('coop_account_number', '1234567890'),
  ('coop_account_name', 'Iyanu Oluwa Society')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_authenticated" on public.app_settings;
create policy "app_settings_read_authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. DEPOSITS — dual-method funding records
-- ---------------------------------------------------------------------------
create table if not exists public.deposits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  amount       numeric(14, 2) not null check (amount > 0),
  method       text not null check (method in ('flutterwave', 'manual')),
  status       text not null default 'pending' check (status in ('pending', 'successful', 'failed')),
  reference_id text,
  receipt_url  text,
  created_at   timestamptz not null default now()
);

create index if not exists deposits_user_id_idx on public.deposits (user_id);
create index if not exists deposits_status_idx on public.deposits (status);

alter table public.deposits enable row level security;

drop policy if exists "deposits_select_own" on public.deposits;
create policy "deposits_select_own"
  on public.deposits for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "deposits_insert_own" on public.deposits;
create policy "deposits_insert_own"
  on public.deposits for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "deposits_admin_update" on public.deposits;
create policy "deposits_admin_update"
  on public.deposits for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. ATOMIC APPROVAL — updates deposit AND increments balance in one txn
-- ---------------------------------------------------------------------------
create or replace function public.approve_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_amount  numeric(14, 2);
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  select user_id, amount into v_user_id, v_amount
  from public.deposits
  where id = p_deposit_id and status = 'pending';

  if v_user_id is null then
    raise exception 'Deposit not found or already processed';
  end if;

  update public.deposits set status = 'successful' where id = p_deposit_id;

  update public.profiles
     set balance = balance + v_amount,
         updated_at = now()
   where id = v_user_id;
end;
$$;

create or replace function public.reject_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  update public.deposits
     set status = 'failed'
   where id = p_deposit_id and status = 'pending';
end;
$$;

grant execute on function public.approve_deposit(uuid) to authenticated;
grant execute on function public.reject_deposit(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. STORAGE — receipts bucket for manual transfer screenshots
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Authenticated users may upload their own receipts.
drop policy if exists "receipts_authenticated_upload" on storage.objects;
create policy "receipts_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipts');

-- Users can read receipts; admins can review all uploads.
drop policy if exists "receipts_read" on storage.objects;
create policy "receipts_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'receipts');