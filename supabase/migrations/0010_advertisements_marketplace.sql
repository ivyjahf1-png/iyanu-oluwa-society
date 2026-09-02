-- ============================================================================
-- Migration 0010: Advertisements & marketplace posts (admin -> member pipeline)
-- ADDITIVE. Deploy with: supabase db push
--
-- 1. ADVERTISEMENTS - admin-created ad banners that fan out to member
--     screens in real-time (banner carousels, promo popups).
-- 2. MARKETPLACE_POSTS - admin-uploaded marketplace inventory written
--     straight to Supabase so member feeds render instantly.
-- Both tables have RLS + realtime publication membership.
-- ============================================================================

-- 1. ADVERTISEMENTS
create table if not exists public.advertisements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  image_url   text,
  category    text not null default 'general',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.advertisements add column if not exists title;
alter table public.advertisements add column if not exists body;
alter table public.advertisements add column if not exists image_url;
alter table public.advertisements add column if not exists category;
alter table public.advertisements add column if not exists is_active;
alter table public.advertisements add column if not exists created_at;
create index if not exists ads_created_idx on public.advertisements (created_at desc);
create index if not exists ads_active_idx on public.advertisements (is_active, created_at desc);
alter table public.advertisements enable row level security;
drop policy if exists "ads_select_active" on public.advertisements;
create policy "ads_select_active" on public.advertisements for select to authenticated using (true);
drop policy if exists "ads_insert_admin" on public.advertisements;
create policy "ads_insert_admin" on public.advertisements for insert to authenticated with check (true);
drop policy if exists "ads_update_admin" on public.advertisements;
create policy "ads_update_admin" on public.advertisements for update to authenticated using (true) with check (true);
drop policy if exists "ads_delete_admin" on public.advertisements;
create policy "ads_delete_admin" on public.advertisements for delete to authenticated using (true);
-- 2. MARKETPLACE_POSTS
create table if not exists public.marketplace_posts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '''',
  price       text,
  location    text not null default '''',
  category    text not null default ''general'',
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.marketplace_posts add column if not exists title;
alter table public.marketplace_posts add column if not exists description;
alter table public.marketplace_posts add column if not exists price;
alter table public.marketplace_posts add column if not exists location;
alter table public.marketplace_posts add column if not exists category;
alter table public.marketplace_posts add column if not exists image_url;
alter table public.marketplace_posts add column if not exists is_active;
alter table public.marketplace_posts add column if not exists created_at;
create index if not exists mkt_created_idx on public.marketplace_posts (created_at desc);
create index if not exists mkt_active_idx on public.marketplace_posts (is_active, created_at desc);
alter table public.marketplace_posts enable row level security;
drop policy if exists "mkt_select_active" on public.marketplace_posts;
create policy "mkt_select_active" on public.marketplace_posts for select to authenticated using (true);
drop policy if exists "mkt_insert_admin" on public.marketplace_posts;
create policy "mkt_insert_admin" on public.marketplace_posts for insert to authenticated with check (true);
drop policy if exists "mkt_update_admin" on public.marketplace_posts;
create policy "mkt_update_admin" on public.marketplace_posts for update to authenticated using (true) with check (true);
drop policy if exists "mkt_delete_admin" on public.marketplace_posts;
create policy "mkt_delete_admin" on public.marketplace_posts for delete to authenticated using (true);

-- 3. Realtime publication membership
do $$ begin
  if not exists (select 1 from pg_publication where pubname = ''supabase_realtime'') then
    create publication supabase_realtime;
  end if;
  alter publication supabase_realtime add table public.advertisements;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.marketplace_posts;
exception when duplicate_object then null; end $$;

-- 4. RPCs
create or replace function public.save_advertisement(p_title text, p_body text, p_image_url text, p_category text)
returns public.advertisements
language plpgsql security definer set search_path = public
as $$
declare v_row public.advertisements;
begin
  insert into public.advertisements (title, body, image_url, category)
  values (p_title, coalesce(p_body, ''''), p_image_url, coalesce(p_category, ''general''))
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.save_marketplace_post(p_title text, p_description text, p_price text, p_location text, p_category text, p_image_url text)
returns public.marketplace_posts
language plpgsql security definer set search_path = public
as $$
declare v_row public.marketplace_posts;
begin
  insert into public.marketplace_posts (title, description, price, location, category, image_url)
  values (p_title, coalesce(p_description, ''''), p_price, coalesce(p_location, ''''), coalesce(p_category, ''general''), p_image_url)
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.save_advertisement(text, text, text, text) to authenticated;
grant execute on function public.save_marketplace_post(text, text, text, text, text, text) to authenticated;