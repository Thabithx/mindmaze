import { supabase } from './supabaseClient';

export type LeaderboardPeriod = 'weekly' | 'monthly';

/** One ranked row: hours completed first, then tasks, then streak. */
export interface LeaderboardEntry {
  userId: string;
  username: string;
  stream: string | null;
  completedHours: number;
  completedTasks: number;
  currentStreak: number;
}

/** Per-student aggregates for the admin progress view (full drill-down). */
export interface AdminProgressEntry {
  userId: string;
  username: string | null;
  stream: string | null;
  role: string;
  createdAt: string | null;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalTasks: number;
  completedTasks: number;
  completedMinutes: number;
  topicsCompleted: number;
  weekTasksDone: number;
  weekMinutes: number;
  monthTasksDone: number;
  monthMinutes: number;
}

/**
 * Weekly (Mon–Sun, Asia/Colombo) or monthly leaderboard, ranked by completed
 * study hours. Returns { entries, needsSetup } — needsSetup is true when the
 * migration hasn't been run yet (RPC missing), so the UI can say so instead
 * of showing a false empty board.
 */
export async function fetchLeaderboard(
  period: LeaderboardPeriod,
  limit = 50
): Promise<{ entries: LeaderboardEntry[]; needsSetup: boolean }> {
  if (!supabase) return { entries: [], needsSetup: true };
  try {
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_period: period,
      p_limit: limit,
    });
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    return {
      entries: rows.map((r) => ({
        userId: String(r.user_id ?? ''),
        username: String(r.username ?? '—'),
        stream: (r.stream as string | null) ?? null,
        completedHours: Number(r.completed_hours ?? 0) || 0,
        completedTasks: Number(r.completed_tasks ?? 0) || 0,
        currentStreak: Number(r.current_streak ?? 0) || 0,
      })),
      needsSetup: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err ?? '');
    const missing =
      /could not find the function|function .* does not exist|PGRST202/i.test(msg) ||
      /relation .* does not exist|42P01/i.test(msg);
    if (!missing) console.warn('Leaderboard fetch failed:', err);
    return { entries: [], needsSetup: true };
  }
}

/**
 * Every student's all-time + weekly + monthly aggregates (admins only —
 * the RPC returns zero rows for anyone else). Same needsSetup contract.
 */
export async function fetchAdminProgress(): Promise<{
  entries: AdminProgressEntry[];
  needsSetup: boolean;
}> {
  if (!supabase) return { entries: [], needsSetup: true };
  try {
    const { data, error } = await supabase.rpc('get_admin_student_progress');
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
    return {
      entries: rows.map((r) => ({
        userId: String(r.user_id ?? ''),
        username: (r.username as string | null) ?? null,
        stream: (r.stream as string | null) ?? null,
        role: String(r.role ?? 'student'),
        createdAt: (r.created_at as string | null) ?? null,
        currentStreak: num(r.current_streak),
        longestStreak: num(r.longest_streak),
        lastCompletedDate: (r.last_completed_date as string | null) ?? null,
        totalTasks: num(r.total_tasks),
        completedTasks: num(r.completed_tasks),
        completedMinutes: num(r.completed_minutes),
        topicsCompleted: num(r.topics_completed),
        weekTasksDone: num(r.week_tasks_done),
        weekMinutes: num(r.week_minutes),
        monthTasksDone: num(r.month_tasks_done),
        monthMinutes: num(r.month_minutes),
      })),
      needsSetup: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err ?? '');
    const missing =
      /could not find the function|function .* does not exist|PGRST202/i.test(msg) ||
      /relation .* does not exist|42P01/i.test(msg);
    if (!missing) console.warn('Admin progress fetch failed:', err);
    return { entries: [], needsSetup: true };
  }
}

/** CSV export for the admin drill-down table. */
export function adminProgressToCsv(entries: AdminProgressEntry[]): string {
  const head = [
    'username', 'stream', 'role', 'joined', 'current_streak', 'best_streak',
    'last_completed', 'tasks_done', 'tasks_total', 'hours_done',
    'topics_done', 'week_tasks', 'week_hours', 'month_tasks', 'month_hours',
  ];
  const esc = (v: string | number | null): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = entries.map((e) =>
    [
      e.username ?? '', e.stream ?? '', e.role, e.createdAt ? e.createdAt.slice(0, 10) : '',
      e.currentStreak, e.longestStreak, e.lastCompletedDate ?? '',
      e.completedTasks, e.totalTasks, Math.round((e.completedMinutes / 60) * 10) / 10,
      e.topicsCompleted, e.weekTasksDone, Math.round((e.weekMinutes / 60) * 10) / 10,
      e.monthTasksDone, Math.round((e.monthMinutes / 60) * 10) / 10,
    ]
      .map(esc)
      .join(',')
  );
  return [head.join(','), ...lines].join('\n');
}
