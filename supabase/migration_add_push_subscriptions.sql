-- ============================================================================
-- Mind Maze — Web Push subscriptions (free, no paid service needed)
-- Run once in Supabase Dashboard > SQL Editor.
-- ============================================================================

-- 1. One row per browser/device per student. endpoint is globally unique
--    per subscription, so (user_id, endpoint) is the dedupe key: the client
--    upserts on that conflict pair and never creates duplicates.
create extension if not exists pgcrypto;
create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Idempotent upgrades for databases created from the earlier version of this
-- migration (which used primary key (user_id, endpoint) and no id column).
alter table public.push_subscriptions
  add column if not exists id uuid not null default gen_random_uuid();
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'push_subscriptions_pkey'
      and n.nspname = 'public'
      and t.relname = 'push_subscriptions'
  ) then
    alter table public.push_subscriptions add primary key (id);
  end if;
exception when duplicate_object then
  -- Primary key already exists (e.g. the old composite key): keep it; the
  -- unique constraint below is what the client upsert needs.
  null;
when duplicate_table then
  -- Backing index already exists from a partial run: same outcome, skip.
  null;
end $$;
do $$
begin
  -- Only add when truly missing: a previous partial run leaves the backing
  -- index behind, in which case Postgres raises 42P07 (duplicate_table),
  -- NOT 42710 (duplicate_object) — so check first AND catch both.
  if not exists (
    select 1 from pg_constraint where conname = 'push_subscriptions_user_endpoint_unique'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint);
  end if;
exception when duplicate_object then
  null;
when duplicate_table then
  null;
end $$;

alter table public.push_subscriptions enable row level security;

-- A student can only insert / read / delete their own subscription rows.
drop policy if exists "push_owner_all" on public.push_subscriptions;
create policy "push_owner_all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Server-side sent log. Replaces the localStorage dedupe keys
--    (mindmaze_last_nudge_v2 / countdown / alertedSlotIds) which are
--    invisible when the app is closed. Service-role only: no client policy.
create table if not exists public.push_sent_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, dedupe_key)
);

alter table public.push_sent_log enable row level security;
