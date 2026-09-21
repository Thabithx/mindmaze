-- ============================================================================
-- Mind Maze — daily target (admin-set) + student progress + leaderboard
-- ----------------------------------------------------------------------------
-- WHAT THIS ADDS:
--   1. public.app_config — global key/value settings. The admin sets the
--      daily study goal here (daily_target_hours, daily_target_tasks,
--      quiz_channel_url) and every student's app reads it. Falls back to
--      the student's own Settings when this table/RPC is missing.
--   2. public.get_admin_student_progress() — SECURITY DEFINER RPC, admins
--      only. One row per student with streak + task + minutes + topic
--      aggregates for all-time, this week (Mon–Sun, Asia/Colombo) and this
--      calendar month. Powers the Admin Panel "progress + top performers"
--      view with full drill-down. Regular students get zero rows.
--   3. public.get_leaderboard(p_period, p_limit) — SECURITY DEFINER RPC,
--      any signed-in student may call. Ranks by completed study HOURS
--      (then tasks, then streak) for 'weekly' or 'monthly'. Returns
--      usernames only — no emails, no task titles, no PII.
--   4. public.get_app_config() — any signed-in student may call. Returns
--      the three known keys so the app never needs direct table access.
--
-- HOW TO USE:
--   1. Open your Supabase project SQL Editor.
--   2. Paste this whole file and press Run (safe to re-run — idempotent).
--   3. Back in the app: open /admin — the Daily Target card, student
--      progress table and Top Performers list will load. Promote yourself
--      with: update public.profiles set role='admin' where username='<you>';
--
-- TIMEZONE NOTE: all students are in Sri Lanka. Week/month boundaries use
-- Asia/Colombo wall-clock dates, matching the send-push Edge Function.
-- ============================================================================

-- 0. Admin check, self-contained (same definition as schema.sql, in case the
--    helper was never created on this database).
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

-- ----------------------------------------------------------------------------
-- 1. app_config — global settings (one row per key)
-- ----------------------------------------------------------------------------
create table if not exists public.app_config (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.app_config enable row level security;

-- Every signed-in student can read the global target (drives their dashboard).
drop policy if exists "app_config_read_all" on public.app_config;
create policy "app_config_read_all" on public.app_config
  for select using (auth.role() = 'authenticated');

-- Only admins can create / change / remove keys.
drop policy if exists "app_config_admin_write" on public.app_config;
create policy "app_config_admin_write" on public.app_config
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the three known keys (never overwrite an admin's existing values).
insert into public.app_config (key, value) values
  ('daily_target_hours', '2'),
  ('daily_target_tasks', '3'),
  ('quiz_channel_url', 'https://whatsapp.com/channel/0029Vb8OnJGCRs1fpYosgU1z')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Shared helpers (Sri Lanka wall-clock date + task-minutes estimate)
-- ----------------------------------------------------------------------------
-- Today in Asia/Colombo as YYYY-MM-DD text (daily_tasks.date is stored in
-- the student's local calendar date, i.e. SL time).
create or replace function public.sl_today()
returns date
language sql
stable
set search_path = public
as $$
  select ((now() at time zone 'UTC') at time zone 'Asia/Colombo')::date;
$$;

-- Best-effort minutes for one daily_tasks row: prefer estimated_minutes,
-- else derive from start_time/end_time ("HH:MM"), else 60.
create or replace function public.task_minutes(estimated int, start_t text, end_t text)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when estimated is not null and estimated > 0 then estimated
    when start_t ~ '^\d{1,2}:\d{2}' and end_t ~ '^\d{1,2}:\d{2}' then
      greatest(0,
        (split_part(end_t, ':', 1)::int * 60 + split_part(end_t, ':', 2)::int) -
        (split_part(start_t, ':', 1)::int * 60 + split_part(start_t, ':', 2)::int))
    else 60
  end;
$$;

-- ----------------------------------------------------------------------------
-- 2. get_app_config() — global daily target for every signed-in student
-- ----------------------------------------------------------------------------
create or replace function public.get_app_config()
returns table (key text, value text)
language sql
security definer
set search_path = public
as $$
  select c.key, c.value from public.app_config c
  where auth.role() = 'authenticated'
    and c.key in ('daily_target_hours', 'daily_target_tasks', 'quiz_channel_url');
$$;

revoke all on function public.get_app_config() from public;
grant execute on function public.get_app_config() to authenticated;

-- Admin-only write helper (keeps updated_at/updated_by honest). Returns the
-- stored value. Non-admins get an exception (never a silent no-op).
create or replace function public.set_app_config(p_key text, p_value text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change the daily target.';
  end if;
  if p_key not in ('daily_target_hours', 'daily_target_tasks', 'quiz_channel_url') then
    raise exception 'Unknown config key: %', p_key;
  end if;
  if p_key in ('daily_target_hours', 'daily_target_tasks') then
    if p_value !~ '^\d+(\.\d+)?$' or p_value::numeric < 0 or p_value::numeric > 24 then
      raise exception 'Target must be a number between 0 and 24.';
    end if;
  end if;
  insert into public.app_config (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  select value into v from public.app_config where key = p_key;
  return v;
end;
$$;

revoke all on function public.set_app_config(text, text) from public;
grant execute on function public.set_app_config(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. get_admin_student_progress() — full drill-down, admins only
-- ----------------------------------------------------------------------------
create or replace function public.get_admin_student_progress()
returns table (
  user_id uuid,
  username text,
  stream text,
  role text,
  created_at timestamptz,
  current_streak int,
  longest_streak int,
  last_completed_date text,
  total_tasks bigint,
  completed_tasks bigint,
  completed_minutes bigint,
  topics_completed bigint,
  week_tasks_done bigint,
  week_minutes bigint,
  month_tasks_done bigint,
  month_minutes bigint
)
language sql
security definer
set search_path = public
as $$
  with sl as (
    select
      public.sl_today() as today,
      date_trunc('week', public.sl_today()::timestamptz)::date as week_start,
      date_trunc('month', public.sl_today()::timestamptz)::date as month_start
  )
  select
    p.id,
    p.username,
    p.stream,
    p.role,
    p.created_at,
    coalesce(s.current_streak, 0),
    coalesce(s.longest_streak, 0),
    s.last_completed_date,
    coalesce(t.total_tasks, 0),
    coalesce(t.completed_tasks, 0),
    coalesce(t.completed_minutes, 0),
    coalesce(tp.topics_completed, 0),
    coalesce(w.week_tasks_done, 0),
    coalesce(w.week_minutes, 0),
    coalesce(m.month_tasks_done, 0),
    coalesce(m.month_minutes, 0)
  from public.profiles p
  cross join sl
  left join public.streaks s on s.user_id = p.id
  left join (
    select
      user_id,
      count(*) as total_tasks,
      count(*) filter (where is_completed) as completed_tasks,
      coalesce(sum(public.task_minutes(estimated_minutes, start_time, end_time)) filter (where is_completed), 0) as completed_minutes
    from public.daily_tasks
    group by user_id
  ) t on t.user_id = p.id
  left join (
    select user_id, count(*) filter (where status = 'completed') as topics_completed
    from public.topics
    group by user_id
  ) tp on tp.user_id = p.id
  left join (
    select
      d.user_id,
      count(*) filter (where d.is_completed) as week_tasks_done,
      coalesce(sum(public.task_minutes(d.estimated_minutes, d.start_time, d.end_time)) filter (where d.is_completed), 0) as week_minutes
    from public.daily_tasks d, sl
    where d.date >= sl.week_start::text and d.date <= sl.today::text
    group by d.user_id
  ) w on w.user_id = p.id
  left join (
    select
      d.user_id,
      count(*) filter (where d.is_completed) as month_tasks_done,
      coalesce(sum(public.task_minutes(d.estimated_minutes, d.start_time, d.end_time)) filter (where d.is_completed), 0) as month_minutes
    from public.daily_tasks d, sl
    where d.date >= sl.month_start::text and d.date <= sl.today::text
    group by d.user_id
  ) m on m.user_id = p.id
  where public.is_admin()
  order by coalesce(m.month_minutes, 0) desc, coalesce(t.completed_tasks, 0) desc;
$$;

revoke all on function public.get_admin_student_progress() from public;
grant execute on function public.get_admin_student_progress() to authenticated;

-- ----------------------------------------------------------------------------
-- 4. get_leaderboard(p_period, p_limit) — weekly/monthly, all students
-- ----------------------------------------------------------------------------
-- Ranks by completed HOURS (then tasks, then streak). Usernames only.
create or replace function public.get_leaderboard(p_period text, p_limit int default 50)
returns table (
  user_id uuid,
  username text,
  stream text,
  completed_hours numeric,
  completed_tasks bigint,
  current_streak int
)
language sql
security definer
set search_path = public
as $$
  with sl as (
    select
      public.sl_today() as today,
      date_trunc('week', public.sl_today()::timestamptz)::date as week_start,
      date_trunc('month', public.sl_today()::timestamptz)::date as month_start
  ), agg as (
    select
      d.user_id as uid,
      sum(public.task_minutes(d.estimated_minutes, d.start_time, d.end_time)) filter (where d.is_completed) as minutes,
      count(*) filter (where d.is_completed) as tasks
    from public.daily_tasks d, sl
    where auth.role() = 'authenticated'
      and (
        (p_period = 'weekly' and d.date >= sl.week_start::text and d.date <= sl.today::text)
        or
        (p_period <> 'weekly' and d.date >= sl.month_start::text and d.date <= sl.today::text)
      )
    group by d.user_id
  )
  select
    p.id,
    p.username,
    p.stream,
    round(coalesce(a.minutes, 0)::numeric / 60, 1),
    coalesce(a.tasks, 0),
    coalesce(s.current_streak, 0)
  from public.profiles p
  left join agg a on a.uid = p.id
  left join public.streaks s on s.user_id = p.id
  where auth.role() = 'authenticated'
    and p.role = 'student'
    and coalesce(a.tasks, 0) > 0
  order by coalesce(a.minutes, 0) desc, coalesce(a.tasks, 0) desc, coalesce(s.current_streak, 0) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke all on function public.get_leaderboard(text, int) from public;
grant execute on function public.get_leaderboard(text, int) to authenticated;
