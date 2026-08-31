-- ============================================================================
-- Migration 0006: Permanent account + chat persistence
-- ADDITIVE. Deploy with: supabase db push
--
-- Guarantees user accounts and chat history persist until explicitly deleted:
--   1. PROFILES            keyed by uid (PK) and now also indexable by email.
--   2. MEETING CHAT        `messages` mapped to room_id (already created in 0005);
--                          reinforced with an index + reading/writing RPCs.
--   3. CO-OP AI CHAT       new `ai_chat_sessions` + `ai_chat_messages` keyed by
--                          user_id and session_id, with save/fetch RPCs.
--   4. BACKEND ROUTES      RPC functions for saving messages and fetching full
--                          history (no direct-client writes required).
--
-- Idempotent and safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES — indexable by email (identity), keyed by uid (auth.users.id).
-- ---------------------------------------------------------------------------
-- auth.users.id is already the profile's primary key (uid). Add a real email
-- column so the member row is locatable by either uid or email.
alter table public.profiles add column if not exists email text;

-- Backfill email from the auth identity for existing rows.
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and (p.email is null or p.email = '');

-- Unique index so a lookup by email is fast and unambiguous.
create unique index if not exists profiles_email_idx
  on public.profiles (lower(email))
  where email is not null;

-- Ensure new sign-ups also get the email stored (extend the existing trigger body).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'member',
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. MEETING CHAT — `messages` already exists (0005). Add a room index if the
--    table was created outside migrations, then readable/writable routes.
-- ---------------------------------------------------------------------------
create index if not exists messages_room_idx
  on public.messages (room_id);
create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at asc);

-- Backend route: save one room message (sender = authenticated user).
create or replace function public.save_room_message(p_room_id text, p_content text)
returns public.messages
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.messages;
begin
  if p_content is null or trim(p_content) = '' then
    raise exception 'Message content cannot be empty';
  end if;
  insert into public.messages (room_id, sender_id, content)
  values (p_room_id, auth.uid(), trim(p_content))
  returning * into v_row;
  return v_row;
end;
$$;

-- Backend route: fetch full history for a room (newest first internally stable).
create or replace function public.fetch_room_messages(p_room_id text)
returns setof public.messages
language sql stable
security definer set search_path = public
as $$
  select * from public.messages
   where room_id = p_room_id
   order by created_at asc;
$$;

grant execute on function public.save_room_message(text, text) to authenticated;
grant execute on function public.fetch_room_messages(text) to authenticated;
-- ---------------------------------------------------------------------------
-- 3. CO-OP AI CHAT — session + message tables keyed by user_id / session_id.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- Indexes: fast per-user session list, and per-session message history.
create index if not exists ai_sessions_user_idx
  on public.ai_chat_sessions (user_id, updated_at desc);
create index if not exists ai_messages_session_idx
  on public.ai_chat_messages (session_id, created_at asc);
create index if not exists ai_messages_user_idx
  on public.ai_chat_messages (user_id, created_at asc);

-- RLS: a member may only read/write their own sessions & messages.
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists "ai_sessions_select_own" on public.ai_chat_sessions;
create policy "ai_sessions_select_own" on public.ai_chat_sessions for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "ai_sessions_insert_own" on public.ai_chat_sessions;
create policy "ai_sessions_insert_own" on public.ai_chat_sessions for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "ai_sessions_update_own" on public.ai_chat_sessions;
create policy "ai_sessions_update_own" on public.ai_chat_sessions for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_sessions_delete_own" on public.ai_chat_sessions;
create policy "ai_sessions_delete_own" on public.ai_chat_sessions for delete
  to authenticated using (auth.uid() = user_id);

drop policy if exists "ai_messages_select_own" on public.ai_chat_messages;
create policy "ai_messages_select_own" on public.ai_chat_messages for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "ai_messages_insert_own" on public.ai_chat_messages;
create policy "ai_messages_insert_own" on public.ai_chat_messages for insert
  to authenticated with check (auth.uid() = user_id);
-- ---------------------------------------------------------------------------
-- 4a. CO-OP AI BACKEND ROUTES — session lifecycle + history persistence.
-- ---------------------------------------------------------------------------
-- Create (or reuse) today's session for the current user.
create or replace function public.get_or_create_ai_session(p_title text default 'New chat')
returns public.ai_chat_sessions
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.ai_chat_sessions;
begin
  -- Reuse the user's most recent session so history survives re-login.
  select * into v_session
    from public.ai_chat_sessions
   where user_id = auth.uid()
   order by updated_at desc
   limit 1;
  if v_session.id is null then
    insert into public.ai_chat_sessions (user_id, title)
    values (auth.uid(), coalesce(nullif(p_title, ''), 'New chat'))
    returning * into v_session;
  end if;
  return v_session;
end;
$$;

-- Persist one chat turn (user or assistant). Updates session last-activity.
create or replace function public.save_ai_message(p_session_id uuid, p_role text, p_content text)
returns public.ai_chat_messages
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_msg  public.ai_chat_messages;
begin
  if not exists (
    select 1 from public.ai_chat_sessions
    where id = p_session_id and user_id = v_user
  ) then
    raise exception 'Session not found or not owned by the current user';
  end if;
  if p_role not in ('user', 'assistant') then
    raise exception 'Role must be user or assistant';
  end if;
  if p_content is null or trim(p_content) = '' then
    raise exception 'Message content cannot be empty';
  end if;

  insert into public.ai_chat_messages (session_id, user_id, role, content)
  values (p_session_id, v_user, p_role, trim(p_content))
  returning * into v_msg;

  update public.ai_chat_sessions
     set updated_at = now()
   where id = p_session_id;

  return v_msg;
end;
$$;

-- List all sessions for the current user (newest first).
create or replace function public.list_ai_sessions()
returns setof public.ai_chat_sessions
language sql stable
security definer set search_path = public
as $$
  select * from public.ai_chat_sessions
   where user_id = auth.uid()
   order by updated_at desc;
$$;

-- Fetch full message history for one owned session (used on re-login).
create or replace function public.fetch_ai_history(p_session_id uuid)
returns setof public.ai_chat_messages
language sql stable
security definer set search_path = public
as $$
  select m.*
    from public.ai_chat_messages m
    join public.ai_chat_sessions s on s.id = m.session_id
   where m.session_id = p_session_id
     and s.user_id = auth.uid()
   order by m.created_at asc;
$$;

-- Explicitly delete a session (and its messages via cascade) — user-requested.
create or replace function public.delete_ai_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.ai_chat_sessions
   where id = p_session_id and user_id = auth.uid();
end;
$$;

grant execute on function public.get_or_create_ai_session(text) to authenticated;
grant execute on function public.save_ai_message(uuid, text, text) to authenticated;
grant execute on function public.list_ai_sessions() to authenticated;
grant execute on function public.fetch_ai_history(uuid) to authenticated;
grant execute on function public.delete_ai_session(uuid) to authenticated;