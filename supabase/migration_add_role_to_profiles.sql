-- ============================================================================
-- Mind Maze — lock down profiles.role (EXISTING databases only)
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES:
--   1. Adds profiles.role ('student' default) if missing.
--   2. Replaces the permissive "profiles_owner_all" policy with granular
--      SELECT / INSERT / UPDATE / DELETE policies. INSERT only succeeds as
--      role='student'; UPDATE can never change role for authenticated users.
--   3. Adds triggers so that even hand-crafted API requests (dev tools)
--      cannot set or change role — only the Supabase dashboard / service
--      role (you) can.
--
-- HOW TO USE:
--   1. Open your Supabase project SQL Editor.
--   2. Paste this whole file and press Run (safe to re-run).
-- Fresh installs using schema.sql already include all of this and can skip it.
-- ============================================================================

alter table public.profiles
  add column if not exists role text not null default 'student';

-- Allowed values for role (idempotent: only added when missing).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('student', 'admin'));
  end if;
end $$;

-- Backfill: any pre-existing rows without a role become 'student'.
update public.profiles set role = 'student' where role is null;

-- ----------------------------------------------------------------------------
-- Replace the old permissive policy with granular, role-safe policies.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_owner_all" on public.profiles;

-- Read: a student can read only their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Create: a student can insert only their own row, and only as 'student'.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id and role = 'student');

-- Update: own row only. Role changes are blocked by the trigger below.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Delete: own row only.
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Admin read-all: users with role='admin' can list every profile row (used
-- by the in-app Admin Panel user list). SECURITY DEFINER so the lookup
-- itself bypasses RLS (avoids infinite policy recursion). No admin UPDATE
-- policy is created on purpose — role changes stay dashboard-only.
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

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all" on public.profiles
  for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Triggers: hard enforcement that survives direct API tampering.
-- Dashboard / service-role requests (no auth.uid) bypass these checks.
-- ----------------------------------------------------------------------------

-- Force role='student' on any row inserted by an authenticated user.
create or replace function public.force_profiles_role_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.role := 'student';
  elsif new.role is null then
    new.role := 'student';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_force_role_student on public.profiles;
create trigger trg_profiles_force_role_student
  before insert on public.profiles
  for each row execute function public.force_profiles_role_student();

-- Block role changes coming from authenticated users.
create or replace function public.enforce_profiles_role_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'profiles.role is managed by administrators and cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_immutable on public.profiles;
create trigger trg_profiles_role_immutable
  before update on public.profiles
  for each row execute function public.enforce_profiles_role_immutable();
