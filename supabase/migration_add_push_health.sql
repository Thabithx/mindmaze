-- ============================================================================
-- Mind Maze — push notification health: permission telemetry + admin view
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES:
--   1. Adds profiles.push_permission (nullable text: 'granted' | 'denied' |
--      'default' | 'unsupported'). Each student's device silently reports its
--      live browser permission here so the Admin Panel can show who granted,
--      who blocked, and who was never asked. NULL = never reported yet.
--      Telemetry only — it never gates sending; the send-push function still
--      delivers to every valid push_subscriptions row.
--   2. Adds a "push_admin_read_all" SELECT policy on push_subscriptions so
--      admins (profiles.role = 'admin') can read subscription rows for the
--      Admin Panel health overview. Students still see only their own rows
--      via the existing push_owner_all policy.
--
-- HOW TO USE:
--   1. Open your Supabase project SQL Editor.
--   2. Paste this whole file and press Run (safe to re-run — every step
--      uses IF NOT EXISTS guards / exception handlers and will not touch
--      existing data).
-- Fresh installs using schema.sql already include profiles.push_permission
-- (run supabase/migration_add_push_subscriptions.sql first if the
-- push_subscriptions table itself does not exist yet).
-- ============================================================================

-- 1. Permission telemetry column (nullable, no CHECK on purpose: old app
--    versions simply leave it NULL and everything keeps working).
alter table public.profiles
  add column if not exists push_permission text;

-- 2. Admin read access to push_subscriptions (self-contained: re-declares
--    is_admin idempotently in case this runs before schema.sql policies).
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
