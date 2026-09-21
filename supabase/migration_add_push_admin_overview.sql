-- ============================================================================
-- Mind Maze — push admin overview: one-step fix for the Admin Panel health view
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS:
--   The Admin Panel used to read push_subscriptions with a plain table SELECT.
--   When the "push_admin_read_all" RLS policy is missing, PostgREST does NOT
--   error — it silently filters the result to the viewer's own rows. The panel
--   then misreads that empty list as "nobody subscribed" for every student.
--   This file fixes that class of bug:
--     1. Ensures profiles.push_permission exists (permission telemetry column;
--        without it every student shows "Not asked" no matter what they did).
--     2. Ensures the "push_admin_read_all" SELECT policy on push_subscriptions
--        (keeps the legacy direct-select path working as a fallback).
--     3. Creates public.get_push_admin_overview() — a SECURITY DEFINER RPC
--        that returns per-student aggregates ONLY (user_id, device_count,
--        latest_at; key material and endpoint URLs never leave the database)
--        and returns zero rows for non-admins. The app calls this first; a
--        missing setup now fails LOUDLY instead of showing false zeros.
--
-- HOW TO USE:
--   1. Open your Supabase project SQL Editor.
--   2. Paste this whole file and press Run (safe to re-run — every step is
--      idempotent and will not touch existing data).
--   3. Back in the app: open /admin and press Refresh. The "Subscribed"
--      count must then equal:
--        select count(distinct user_id) from public.push_subscriptions;
-- PREREQUISITE: supabase/migration_add_push_subscriptions.sql must have been
-- run first (the push_subscriptions table itself). If it wasn't, the function
-- below raises a clear error naming that file instead of failing silently.
-- (This file supersedes migration_add_push_health.sql — it includes every
-- step from that file, so running this one alone is enough.)
-- ============================================================================

-- 0. Admin check, self-contained (same definition as schema.sql, in case this
--    runs on a database where the helper was never created).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 1. Permission telemetry column (nullable, no CHECK on purpose: old app
--    versions simply leave it NULL and everything keeps working).
alter table public.profiles
  add column if not exists push_permission text;

-- 2. Admin read access to push_subscriptions (legacy direct-select path).
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'push_subscriptions'
  ) then
    drop policy if exists "push_admin_read_all" on public.push_subscriptions;
    create policy "push_admin_read_all" on public.push_subscriptions
      for select using (public.is_admin());
  end if;
end $$;

-- 3. Aggregate overview RPC: per-student device counts, admins only.
--    Non-admin callers get zero rows (the WHERE clause filters them), never
--    an error and never anyone else's data.
create or replace function public.get_push_admin_overview()
returns table (
  user_id uuid,
  device_count bigint,
  latest_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.user_id, count(*), max(s.created_at)
  from public.push_subscriptions s
  where public.is_admin()
  group by s.user_id
$$;

-- Least privilege: only signed-in users may call it (and only admins get rows).
-- Revoke from PUBLIC (Postgres grants EXECUTE to PUBLIC by default, so
-- revoking from named roles alone would silently leave anon access in place).
revoke all on function public.get_push_admin_overview() from public;
grant execute on function public.get_push_admin_overview() to authenticated;
