-- ============================================================================
-- Migration 0009: User settings & last-login persistence
-- ADDITIVE. Deploy with: supabase db push
--
-- 1. USER_SETTINGS — per-member preferences keyed by user_id (uid):
--      notification prefs, security toggles, saved options.
--    Loaded on app boot so preferences survive reinstalls / device changes.
-- 2. PROFILES.lastLogin — written on every successful login so the admin
--    member directory can surface recently-active members.
-- ============================================================================

-- 1. USER_SETTINGS
create table if not exists public.user_settings (
  user_id    uuid primary key references auth.users on delete cascade,
  notifications_enabled boolean not null default true,
  email_notifications   boolean not null default true,
  push_notifications    boolean not null default true,
  theme                 text not null default 'system',
  language              text not null default 'en',
  security              jsonb not null default '{}'::jsonb,
  saved_options         jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists user_settings_updated_idx
  on public.user_settings (updated_at desc);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Upsert helper: patch one or more settings columns for the current user.
create or replace function public.upsert_user_settings(p_settings jsonb)
returns public.user_settings
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.user_settings;
begin
  insert into public.user_settings (user_id, notifications_enabled, email_notifications,
                                     push_notifications, theme, language, security,
                                     saved_options, updated_at)
  values (
    auth.uid(),
    coalesce((p_settings->>'notifications_enabled')::boolean,
             (select notifications_enabled from public.user_settings where user_id = auth.uid()),
             true),
    coalesce((p_settings->>'email_notifications')::boolean,
             (select email_notifications from public.user_settings where user_id = auth.uid()),
             true),
    coalesce((p_settings->>'push_notifications')::boolean,
             (select push_notifications from public.user_settings where user_id = auth.uid()),
             true),
    coalesce(p_settings->>'theme',
             (select theme from public.user_settings where user_id = auth.uid()),
             'system'),
    coalesce(p_settings->>'language',
             (select language from public.user_settings where user_id = auth.uid()),
             'en'),
    coalesce(p_settings->>'security', '{}'::jsonb),
    coalesce(p_settings->>'saved_options', '{}'::jsonb),
    now()
  )
  on conflict (user_id) do update set
    notifications_enabled = coalesce((p_settings->>'notifications_enabled')::boolean,
                                      public.user_settings.notifications_enabled),
    email_notifications   = coalesce((p_settings->>'email_notifications')::boolean,
                                      public.user_settings.email_notifications),
    push_notifications    = coalesce((p_settings->>'push_notifications')::boolean,
                                      public.user_settings.push_notifications),
    theme                 = coalesce(p_settings->>'theme', public.user_settings.theme),
    language              = coalesce(p_settings->>'language', public.user_settings.language),
    security              = coalesce(p_settings->>'security', public.user_settings.security),
    saved_options         = coalesce(p_settings->>'saved_options', public.user_settings.saved_options),
    updated_at            = now()
  returning * into v_row;
  return v_row;
end;
$$;

-- Fetch the current user's settings (creates a default row on first call).
create or replace function public.get_user_settings()
returns public.user_settings
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.user_settings;
begin
  select * into v_row from public.user_settings where user_id = auth.uid();
  if not found then
    insert into public.user_settings (user_id) values (auth.uid())
    on conflict (user_id) do nothing
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

grant execute on function public.upsert_user_settings(jsonb) to authenticated;
grant execute on function public.get_user_settings() to authenticated;

-- 2. PROFILES.lastLogin
alter table public.profiles add column if not exists last_login timestamptz;

create or replace function public.touch_last_login()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set last_login = now() where id = auth.uid();
end;
$$;

grant execute on function public.touch_last_login() to authenticated;