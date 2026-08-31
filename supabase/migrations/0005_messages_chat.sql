-- ============================================================================
-- Migration 0005: Meeting chat (`messages` table) — real-time sync
-- ADDITIVE. Deploy with: supabase db push
--
-- Enables the meeting-chat real-time flow in MeetingChatScreen:
--   * Insert  -> messages.room_id / sender_id / content
--   * Live UI -> supabase.channel('room:...').on('postgres_changes', INSERT)
--
-- For that INSERT channel to fire, the table MUST:
--   1) exist with the exact columns the screen writes,
--   2) have RLS policies that let authenticated members select + insert,
--   3) be a member of the `supabase_realtime` publication.
--
-- This migration is idempotent and safe whether the table was already created
-- in the dashboard or not.
-- ============================================================================

-- 1. Schema (idempotent; column backfills for a manually-created table).
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  room_id    text not null,
  sender_id  uuid,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists content    text;
alter table public.messages add column if not exists room_id    text;
alter table public.messages add column if not exists sender_id  uuid;
alter table public.messages add column if not exists created_at timestamptz not null default now();

create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at asc);

-- 2. Row Level Security — every authenticated member may read the shared room
--    and add a message (sender_id is the authenticated member's id).
alter table public.messages enable row level security;

drop policy if exists "messages_select_all" on public.messages;
create policy "messages_select_all" on public.messages for select
  to authenticated using (true);

drop policy if exists "messages_insert_all" on public.messages;
create policy "messages_insert_all" on public.messages for insert
  to authenticated
  with check (
    room_id is not null and content is not null and content <> ''
  );

-- 3. Realtime publication membership — REQUIRED so postgres_changes INSERT
--    events are streamed to subscribed clients (MeetingChatScreen).
--    Only added when not already present, so this is re-runnable.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;