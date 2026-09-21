-- ============================================================================
-- Mind Maze — add mobile number column to profiles (EXISTING DBs only)
-- ----------------------------------------------------------------------------
-- WHAT THIS DOES:
--   1. Adds profiles.mobile_number (nullable text), the student's optional
--      contact number. Stored contact info ONLY — never used for
--      authentication, OTP, or any verification flow.
--
-- HOW TO USE:
--   1. Open your Supabase project SQL Editor.
--   2. Paste this whole file and press Run (safe to re-run — every step
--      uses IF NOT EXISTS guards and will not touch existing data).
-- Fresh installs using schema.sql already include the column and can skip this.
-- No RLS changes needed: the existing own-row INSERT/UPDATE policies already
-- cover the new column (role remains locked by its own policy + triggers).
-- No format CHECK constraint on purpose: the app applies only light
-- client-side sanity (digits, reasonable length) and must never block
-- sign-up or settings saves over this field.
-- ============================================================================

alter table public.profiles
  add column if not exists mobile_number text;
