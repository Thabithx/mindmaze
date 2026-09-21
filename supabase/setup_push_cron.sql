-- ============================================================================
-- Mind Maze — schedule the free send-push Edge Function every 15 minutes.
-- Run in Supabase Dashboard > SQL Editor AFTER deploying the function and
-- setting its secrets (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT).
-- Requires pg_cron + pg_net (enabled by default on hosted Supabase).
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> / use Vault in production.
-- ============================================================================

-- Enable extensions (safe to re-run)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every 15 minutes, POST to the Edge Function (service role bypasses RLS
-- so it can read all subscriptions / timetable rows due in this window).
--
-- SECURITY: never paste your real service_role key here — this file is
-- committed to git. Either substitute it at run time, or (recommended)
-- store it in Vault and reference it with
--   (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
-- A real key was previously committed in this file's history; rotate it in
-- Supabase Dashboard > Project Settings > API so the old one stops working.
select cron.schedule(
  'mindmaze-send-push-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Useful: list jobs / run history
-- select * from cron.job;
-- select * from cron.job_run_details order by start_time desc limit 20;

-- Manual test without waiting for cron (sends to one student's devices):
-- curl -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push' \
--   -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--   -H 'Content-Type: application/json' \
--   -d '{"testUserId":"<USER_UUID>"}'
