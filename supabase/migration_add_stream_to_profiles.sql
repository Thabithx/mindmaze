-- ============================================================================
-- Mind Maze — add study stream to profiles (EXISTING databases only)
-- ----------------------------------------------------------------------------
-- HOW TO USE:
--   1. Open your Supabase project SQL Editor.
--   2. Paste this whole file and press Run (safe to re-run).
-- Fresh installs using schema.sql already include the column and can skip this.
-- After running, existing students will see a "Select Your Stream" screen on
-- their next login; their choice is saved back to this column.
-- ============================================================================

alter table public.profiles
  add column if not exists stream text;
