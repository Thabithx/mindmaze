-- ============================================================================
-- Mind Maze — Supabase database schema
-- ----------------------------------------------------------------------------
-- HOW TO USE:
--   1. Open your Supabase project: https://oqtwygdzpzrkfrxhjyxl.supabase.co
--   2. Go to the SQL Editor, paste this whole file, and press Run.
--   3. (Recommended) In Authentication > Sign In / Sign Ups, turn OFF
--      "Confirm email" if you want students logged in immediately after
--      sign-up. If left ON, the app still works: it asks the student to
--      verify their email, then creates their profile on first login.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles — one row per student, linked to Supabase Auth
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  stream text,
  role text not null default 'student' check (role in ('student', 'admin')),
  elective text not null default 'Chemistry',
  al_exam_date text,
  target_z_score text,
  motivation_note text,
  -- Optional contact number. Stored contact info ONLY — never used for
  -- authentication, OTP, or verification. Nullable, no format constraint.
  mobile_number text,
  -- Last browser notification permission reported by the student's device
  -- ('granted' | 'denied' | 'default' | 'unsupported', NULL = never
  -- reported). Telemetry for the Admin Panel health view only.
  push_permission text,
  revision_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint username_length check (char_length(username) between 3 and 30),
  constraint username_format check (username ~ '^[A-Za-z0-9_]+$')
);

alter table public.profiles enable row level security;

-- Upgrade for databases created before the stream / role / elective columns
-- existed (create table if not exists won't add them to an existing table).
alter table public.profiles
  add column if not exists stream text;

alter table public.profiles
  add column if not exists role text not null default 'student';

alter table public.profiles
  add column if not exists elective text not null default 'Chemistry';

alter table public.profiles
  add column if not exists al_exam_date text;

alter table public.profiles
  add column if not exists target_z_score text;

alter table public.profiles
  add column if not exists motivation_note text;

alter table public.profiles
  add column if not exists mobile_number text;

alter table public.profiles
  add column if not exists push_permission text;

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

-- Allowed values for elective (idempotent: only added when missing).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_elective_check'
  ) then
    alter table public.profiles
      add constraint profiles_elective_check check (elective in ('Chemistry', 'ICT'));
  end if;
end $$;

-- Exam date must be a real calendar date in YYYY-MM-DD form when present
-- (idempotent: only added when missing).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_exam_date_format'
  ) then
    alter table public.profiles
      add constraint profiles_exam_date_format check (
        al_exam_date is null or al_exam_date ~ '^\d{4}-\d{2}-\d{2}$'
      );
  end if;
end $$;

-- Upgrade for databases created before the revision-support columns
-- existed (create table if not exists won't add them to an existing table).
alter table public.timetable_entries
  add column if not exists block_type text not null default 'study';

alter table public.daily_tasks
  add column if not exists block_type text not null default 'study';

alter table public.profiles
  add column if not exists revision_count int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'timetable_entries_block_type_check'
  ) then
    alter table public.timetable_entries
      add constraint timetable_entries_block_type_check
      check (block_type in ('study', 'revision'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'daily_tasks_block_type_check'
  ) then
    alter table public.daily_tasks
      add constraint daily_tasks_block_type_check
      check (block_type in ('study', 'revision'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_revision_count_check'
  ) then
    alter table public.profiles
      add constraint profiles_revision_count_check
      check (revision_count >= 0);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- profiles access control — role is NEVER user-editable.
-- ----------------------------------------------------------------------------
-- The old single "for all" policy is replaced by granular policies so that
-- UPDATE requests can never escalate privilege, even if crafted by hand in
-- dev tools / direct API calls. The BEFORE UPDATE trigger below is the hard
-- enforcement (it raises on any role change coming from an authenticated
-- user); the policies are defense-in-depth.
drop policy if exists "profiles_owner_all" on public.profiles;

-- Read: a student can read only their own profile row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Create: a student can insert only their own row, and only as 'student'.
-- Any client-supplied role value other than 'student' fails the policy
-- (and the insert trigger force-overwrites it to 'student' anyway).
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id and role = 'student');

-- Update: a student can update only their own row. Role changes are blocked
-- by the enforce_profiles_role_immutable trigger (raises an exception), so
-- username / stream updates succeed while role tampering fails the request.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Delete: a student can delete only their own profile row.
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Admin read-all: users with role='admin' can list every profile row (used
-- by the in-app Admin Panel user list). SECURITY DEFINER so the lookup
-- itself bypasses RLS (avoids infinite policy recursion); the table owner
-- is exempt from RLS. No admin UPDATE policy is created on purpose — role
-- changes stay dashboard-only (service role bypasses RLS anyway).
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

-- Force role='student' on any row inserted by an authenticated user.
-- Dashboard / service-role inserts (no auth.uid) keep their given value so
-- you can still create admin rows directly in the Supabase dashboard.
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

-- Block role changes coming from authenticated users (dev-tools / API
-- tampering included). Requests without auth.uid (Supabase dashboard /
-- service role, i.e. you) are allowed so you can promote users directly.
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

-- Helper for the sign-up "is this username taken?" check.
-- SECURITY DEFINER so it works before login without exposing the table.
create or replace function public.is_username_available(uname text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username ilike uname
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. timetable_entries — weekly timetable slots
-- ----------------------------------------------------------------------------
create table if not exists public.timetable_entries (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week text not null,
  subject text not null default '',
  topic text not null default '',
  topic_id text,
  subtopic text,
  target_progress int,
  block_type text not null default 'study',
  is_completed boolean not null default false,
  start_time text not null default '16:00',
  end_time text not null default '18:00',
  color text not null default 'cyan',
  reminder_enabled boolean not null default true,
  reminder_offset_minutes int not null default 15,
  notes text,
  from_task_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.timetable_entries enable row level security;

drop policy if exists "timetable_owner_all" on public.timetable_entries;
create policy "timetable_owner_all" on public.timetable_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. topics — per-student syllabus progress (static units + custom topics)
-- ----------------------------------------------------------------------------
create table if not exists public.topics (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id text not null,
  subject text not null default '',
  unit_number int not null default 0,
  unit_title text not null default '',
  topic_title text not null default '',
  subtopics jsonb not null default '[]'::jsonb,
  completed_subtopics jsonb not null default '[]'::jsonb,
  subtopic_progress jsonb not null default '{}'::jsonb,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  notes text,
  is_custom boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.topics enable row level security;

drop policy if exists "topics_owner_all" on public.topics;
create policy "topics_owner_all" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. daily_tasks — full task rows for the Daily Study Planner
-- ----------------------------------------------------------------------------
create table if not exists public.daily_tasks (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  date text not null,
  title text not null default '',
  subject text not null default '',
  topic_id text,
  topic_title text,
  subtopic text,
  target_progress int,
  block_type text not null default 'study',
  is_completed boolean not null default false,
  completed_at text,
  time_slot text,
  start_time text,
  end_time text,
  estimated_minutes int,
  priority text not null default 'Medium'
    check (priority in ('High', 'Medium', 'Low')),
  from_timetable_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.daily_tasks enable row level security;

drop policy if exists "daily_tasks_owner_all" on public.daily_tasks;
create policy "daily_tasks_owner_all" on public.daily_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists daily_tasks_user_date_idx
  on public.daily_tasks (user_id, date);

-- ----------------------------------------------------------------------------
-- 5. daily_progress — one summary row per day (completed task count)
-- ----------------------------------------------------------------------------
create table if not exists public.daily_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  date text not null,
  completed_count int not null default 0,
  total_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_progress enable row level security;

drop policy if exists "daily_progress_owner_all" on public.daily_progress;
create policy "daily_progress_owner_all" on public.daily_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. streaks — study streak counters (one row per student)
-- ----------------------------------------------------------------------------
create table if not exists public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_completed_date text,
  completed_dates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.streaks enable row level security;

drop policy if exists "streaks_owner_all" on public.streaks;
create policy "streaks_owner_all" on public.streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
