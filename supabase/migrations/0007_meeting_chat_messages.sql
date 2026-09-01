-- ============================================================================
-- Migration 0007: Permanent meeting chat messages
-- IDEMPOTENT. Deploy with: supabase db push
--
-- Durable, multi-year message storage for the MeetingChat screen. Every text
-- message is written to this table on send, edited in place, and soft-deleted
-- (is_deleted = true) so it disappears for good while all other messages stay
-- intact forever. Real-time INSERT/UPDATE/DELETE channels keep every device in
-- sync; the row is never dropped unless the user hard-purges it.
--
-- Schema:
--   id          uuid        PK
--   text        text        message body
--   sender_id   uuid        author (auth.uid())
--   room_id     text        chat room this message belongs to
--   created_at  timestamptz insertion time (DB default now())
--   is_deleted  boolean     soft-delete flag (false by default)
-- ============================================================================

create table if not exists public.meeting_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  sender_id   uuid not null,
  room_id     text not null,
  created_at  timestamptz not null default now(),
  is_deleted  boolean not null default false
);

-- Backfill columns on a dashboard-created table so re-running is always safe.
alter table public.meeting_chat_messages add column if not exists text;
alter table public.meeting_chat_messages add column if not exists sender_id;
alter table public.meeting_chat_messages add column if not exists room_id;
alter table public.meeting_chat_messages add column if not exists created_at;
alter table public.meeting_chat_messages add column if not exists is_deleted;

-- Fast room-scoped history lookups (newest-last ordering).
create index if not exists mcm_room_created_idx
  on public.meeting_chat_messages (room_id, created_at asc);
create index if not exists mcm_sender_idx
  on public.meeting_chat_messages (sender_id);

alter table public.meeting_chat_messages enable row level security;

drop policy if exists "mcm_read_room" on public.meeting_chat_messages;
create policy "mcm_read_room" on public.meeting_chat_messages for select
  to authenticated using (true);

drop policy if exists "mcm_insert_own" on public.meeting_chat_messages;
create policy "mcm_insert_own" on public.meeting_chat_messages for insert
  to authenticated with check (sender_id = auth.uid());

drop policy if exists "mcm_update_own" on public.meeting_chat_messages;
create policy "mcm_update_own" on public.meeting_chat_messages for update
  to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

drop policy if exists "mcm_delete_own" on public.meeting_chat_messages;
create policy "mcm_delete_own" on public.meeting_chat_messages for delete
  to authenticated using (sender_id = auth.uid());

-- Real-time publication (add table if publication exists, else create).
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  alter publication supabase_realtime add table public.meeting_chat_messages;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- RPC API — security-definer functions the frontend calls. All scope writes to
-- auth.uid() so members can only touch their own messages.
-- ============================================================================

create or replace function public.save_meeting_message(
  p_room_id   text,
  p_text      text
)
returns public.meeting_chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.meeting_chat_messages;
begin
  insert into public.meeting_chat_messages (text, sender_id, room_id)
  values (p_text, auth.uid(), p_room_id)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.edit_meeting_message(
  p_id    uuid,
  p_text  text
)
returns public.meeting_chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.meeting_chat_messages;
begin
  update public.meeting_chat_messages
  set text = p_text
  where id = p_id and sender_id = auth.uid() and is_deleted = false
  returning * into v_row;
  if not found then
    raise exception 'Message not found or not editable';
  end if;
  return v_row;
end;
$$;

create or replace function public.soft_delete_meeting_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meeting_chat_messages
  set is_deleted = true
  where id = p_id and sender_id = auth.uid();
end;
$$;

create or replace function public.hard_delete_meeting_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.meeting_chat_messages
  where id = p_id and sender_id = auth.uid();
end;
$$;

create or replace function public.fetch_meeting_messages(p_room_id text)
returns setof public.meeting_chat_messages
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select *
  from public.meeting_chat_messages
  where room_id = p_room_id and is_deleted = false
  order by created_at asc;
end;
$$;

grant execute on function public.save_meeting_message(text, text)     to authenticated;
grant execute on function public.edit_meeting_message(uuid, text)    to authenticated;
grant execute on function public.soft_delete_meeting_message(uuid)   to authenticated;
grant execute on function public.hard_delete_meeting_message(uuid)   to authenticated;
grant execute on function public.fetch_meeting_messages(text)        to authenticated;
