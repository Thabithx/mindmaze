-- ============================================================================
-- Mind Maze — add elective + A/L exam date to profiles (EXISTING DBs only)
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES:
--   1. Adds profiles.elective ('Chemistry' default), the Physical Science
--      3rd-subject choice, so it syncs across devices like stream does.
--   2. Adds profiles.al_exam_date (nullable 'YYYY-MM-DD' text), the
--      student's expected A/L exam date used for the Dashboard countdown.
--
-- HOW TO USE:
--   1. Open your Supabase project SQL Editor.
--   2. Paste this whole file and press Run (safe to re-run — every step
--      uses IF NOT EXISTS guards and will not touch existing data).
-- Fresh installs using schema.sql already include both columns and can skip this.
-- No RLS changes needed: the existing own-row INSERT/UPDATE policies already
-- cover the new columns (role remains locked by its own policy + triggers).
-- ============================================================================

alter table public.profiles
  add column if not exists elective text not null default 'Chemistry';

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

alter table public.profiles
  add column if not exists al_exam_date text;

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
