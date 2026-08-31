-- ============================================================================
-- Migration 0004: Rich announcements (admin broadcast notices)
-- ADDITIVE. Deploy with: supabase db push
--
-- Aligns the `announcements` table with the banner model so admin notices can be:
--   * toggled live (is_active) and filtered by isActive == true on the dashboard
--   * carry an image (image_url)
--   * carry an authoritative timestamp (created_at)
-- Idempotent: safe whether the table was created in the dashboard or not.
-- ============================================================================

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  message    text,
  author     text,
  image_url  text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Backfill the new columns on any pre-existing table created outside migrations.
alter table public.announcements add column if not exists image_url  text;
alter table public.announcements add column if not exists is_active  boolean not null default true;
alter table public.announcements add column if not exists created_at timestamptz not null default now();

create index if not exists announcements_active_idx
  on public.announcements (is_active, created_at desc);

-- Announcements are a public broadcast mechanism. Readable by every
-- authenticated member so the dashboard + notification feed stay live; writes
-- are accepted from the admin compose screen (gate enforced at the UI layer,
-- mirroring the existing promotional_banners behaviour).
alter table public.announcements enable row level security;

drop policy if exists "announcements_read_all" on public.announcements;
create policy "announcements_read_all" on public.announcements for select
  to authenticated using (true);

drop policy if exists "announcements_write_all" on public.announcements;
create policy "announcements_write_all" on public.announcements for all
  to authenticated using (true) with check (true);
