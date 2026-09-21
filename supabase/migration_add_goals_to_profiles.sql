-- ============================================================================
-- Mind Maze — add goal columns to profiles (EXISTING DBs only)
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES:
--   1. Adds profiles.target_z_score (nullable text, e.g. '1.8000'), the
--      student's optional Z-score goal shown on the Dashboard.
--   2. Adds profiles.motivation_note (nullable text), the student's optional
--      personal note echoed back in the daily countdown notification.
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
  add column if not exists target_z_score text;

alter table public.profiles
  add column if not exists motivation_note text;
