-- ============================================================================
-- Mind Maze — Revision support migration
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor (once). It is idempotent — safe to
-- re-run. After running, revision blocks sync with block_type and the
-- revision habit counter persists in profiles.revision_count.
-- ============================================================================

-- 1. block_type on timetable_entries ('study' default, 'revision' for
--    already-completed topics only — enforced in the app UI).
alter table public.timetable_entries
  add column if not exists block_type text not null default 'study';

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

-- 2. block_type on daily_tasks (same values, same app-side enforcement).
alter table public.daily_tasks
  add column if not exists block_type text not null default 'study';

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

-- 3. revision_count on profiles — additive habit stat, separate from
--    first-time topic completions. Never affects syllabus percentages.
alter table public.profiles
  add column if not exists revision_count int not null default 0;

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
