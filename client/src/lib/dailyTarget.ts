import { DailyTask } from '../types';
import { supabase } from './supabaseClient';
import { calculateMinutesBetween, getTodayDateString } from './storage';

/** Global daily study goal set by an admin (applies to every student). */
export interface DailyTarget {
  /** Hours of completed study blocks per day. */
  hours: number;
  /** Completed tasks per day. */
  tasks: number;
  /** WhatsApp channel URL for the daily quiz. */
  quizChannelUrl: string;
  /** True when loaded from the cloud (false = local fallback). */
  fromCloud: boolean;
}

export const DEFAULT_QUIZ_CHANNEL_URL =
  'https://whatsapp.com/channel/0029Vb8OnJGCRs1fpYosgU1z';

export const DEFAULT_DAILY_TARGET: DailyTarget = {
  hours: 2,
  tasks: 3,
  quizChannelUrl: DEFAULT_QUIZ_CHANNEL_URL,
  fromCloud: false,
};

const TARGET_STORE_KEY = 'mindmaze_daily_target_v1';
const QUIZ_SEEN_KEY = 'mindmaze_quiz_reminder_seen_v1';

function clampTarget(n: unknown, fallback: number): number {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(24, Math.round(v * 10) / 10));
}

/** Local mirror of the last-known global target (offline fallback). */
export function getStoredDailyTarget(): DailyTarget {
  try {
    const raw = localStorage.getItem(TARGET_STORE_KEY);
    if (!raw) return DEFAULT_DAILY_TARGET;
    const p = JSON.parse(raw) as Partial<DailyTarget>;
    return {
      hours: clampTarget(p.hours, DEFAULT_DAILY_TARGET.hours),
      tasks: clampTarget(p.tasks, DEFAULT_DAILY_TARGET.tasks),
      quizChannelUrl:
        typeof p.quizChannelUrl === 'string' && p.quizChannelUrl.startsWith('http')
          ? p.quizChannelUrl
          : DEFAULT_QUIZ_CHANNEL_URL,
      fromCloud: false,
    };
  } catch {
    return DEFAULT_DAILY_TARGET;
  }
}

export function saveStoredDailyTarget(t: DailyTarget): void {
  try {
    localStorage.setItem(
      TARGET_STORE_KEY,
      JSON.stringify({ hours: t.hours, tasks: t.tasks, quizChannelUrl: t.quizChannelUrl })
    );
  } catch {
    /* private mode — in-memory behaviour only */
  }
}

/**
 * Load the admin-set global target. Returns the local mirror when the cloud
 * is unconfigured, offline, or the migration hasn't been run yet.
 */
export async function fetchDailyTarget(): Promise<DailyTarget> {
  const fallback = getStoredDailyTarget();
  if (!supabase) return fallback;
  try {
    const { data, error } = await supabase.rpc('get_app_config');
    if (error) throw error;
    const rows = (data ?? []) as { key: string; value: string }[];
    if (rows.length === 0) return fallback;
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const next: DailyTarget = {
      hours: clampTarget(byKey.get('daily_target_hours'), fallback.hours),
      tasks: clampTarget(byKey.get('daily_target_tasks'), fallback.tasks),
      quizChannelUrl: byKey.get('quiz_channel_url') || fallback.quizChannelUrl,
      fromCloud: true,
    };
    saveStoredDailyTarget(next);
    return next;
  } catch {
    return fallback;
  }
}

/** Admin-only: persist the global daily target (throws for non-admins). */
export async function updateDailyTarget(hours: number, tasks: number): Promise<DailyTarget> {
  if (!supabase) throw new Error('Cloud sync is not configured on this device.');
  const cleanHours = clampTarget(hours, NaN);
  const cleanTasks = clampTarget(tasks, NaN);
  if (!Number.isFinite(cleanHours) || !Number.isFinite(cleanTasks)) {
    throw new Error('Target must be a number between 0 and 24.');
  }
  const h = await supabase.rpc('set_app_config', { p_key: 'daily_target_hours', p_value: String(cleanHours) });
  if (h.error) throw new Error(h.error.message || 'Could not save the daily target.');
  const t = await supabase.rpc('set_app_config', { p_key: 'daily_target_tasks', p_value: String(cleanTasks) });
  if (t.error) throw new Error(t.error.message || 'Could not save the daily target.');
  const next = await fetchDailyTarget();
  return next;
}

// ---------------------------------------------------------------------------
// Progress math (shared by the dashboard card + admin panel)
// ---------------------------------------------------------------------------

export function taskMinutesOf(t: DailyTask): number {
  if (typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0) {
    return t.estimatedMinutes;
  }
  if (t.startTime && t.endTime) {
    try {
      const m = calculateMinutesBetween(t.startTime, t.endTime);
      if (m > 0) return m;
    } catch {
      /* fall through */
    }
  }
  return 60;
}

export interface DayProgress {
  doneTasks: number;
  totalTasks: number;
  doneMinutes: number;
  doneHours: number;
  tasksPct: number;
  hoursPct: number;
  targetMet: boolean;
}

/** Today's completed tasks/minutes vs the global daily target. */
export function computeDayProgress(
  allTasks: DailyTask[],
  target: DailyTarget,
  dateStr: string = getTodayDateString()
): DayProgress {
  const day = allTasks.filter((t) => t.date === dateStr);
  const done = day.filter((t) => t.isCompleted);
  const doneMinutes = done.reduce((s, t) => s + taskMinutesOf(t), 0);
  const doneHours = Math.round((doneMinutes / 60) * 10) / 10;
  const tasksPct = target.tasks > 0 ? Math.min(100, Math.round((done.length / target.tasks) * 100)) : 100;
  const hoursPct = target.hours > 0 ? Math.min(100, Math.round((doneHours / target.hours) * 100)) : 100;
  return {
    doneTasks: done.length,
    totalTasks: day.length,
    doneMinutes,
    doneHours,
    tasksPct,
    hoursPct,
    targetMet:
      done.length >= target.tasks && doneHours >= target.hours && (target.tasks > 0 || target.hours > 0),
  };
}

// ---------------------------------------------------------------------------
// In-app quiz reminders: 12:00 & 17:00 local time (the closed-app push twin
// lives in supabase/functions/send-push — same slots, same channel link).
// ---------------------------------------------------------------------------

export type QuizSlot = 'noon' | 'evening';

export function currentQuizSlot(now: Date = new Date()): QuizSlot | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 12 * 60 && mins < 12 * 60 + 15) return 'noon';
  if (mins >= 17 * 60 && mins < 17 * 60 + 15) return 'evening';
  return null;
}

function readQuizSeen(): Record<string, string> {
  try {
    const raw = localStorage.getItem(QUIZ_SEEN_KEY);
    const p = raw ? JSON.parse(raw) : {};
    return p && typeof p === 'object' ? (p as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Once-per-slot-per-day check for the open-app quiz reminder. Returns the
 * due slot, or null when outside the windows or already shown today.
 */
export function checkDueQuizReminder(now: Date = new Date()): { slot: QuizSlot; dateStr: string } | null {
  const slot = currentQuizSlot(now);
  if (!slot) return null;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const seen = readQuizSeen();
  if (seen[dateStr] === slot || seen[dateStr] === 'both') return null;
  return { slot, dateStr };
}

export function markQuizReminderSeen(dateStr: string, slot: QuizSlot): void {
  try {
    const seen = readQuizSeen();
    const prev = seen[dateStr];
    seen[dateStr] = prev && prev !== slot ? 'both' : slot;
    // Keep the last 7 days only.
    const keys = Object.keys(seen).sort();
    while (keys.length > 7) delete seen[keys.shift()!];
    localStorage.setItem(QUIZ_SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* non-fatal */
  }
}

export function quizReminderCopy(slot: QuizSlot): { title: string; body: string } {
  return slot === 'noon'
    ? {
        title: "📢 Today's quiz is up!",
        body: "Check the WhatsApp channel now — today's quiz is waiting for you!",
      }
    : {
        title: '📢 Evening quiz reminder!',
        body: "Haven't tried today's quiz yet? Tap to open the WhatsApp channel!",
      };
}
