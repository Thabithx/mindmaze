/**
 * Mind Maze - Study Streak & Periodic Nudge Tracking Service
 * Sri Lankan GCE A/L Study Planner
 */
import { DailyTask } from '../types';
import { getTodayDateString } from './storage';
import { generatePeriodicNudge } from './notificationMessages';
import { sendStudyNotification } from './notificationService';

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate?: string;
  completedDates: string[];
  isCompletedToday: boolean;
}

const STREAK_STORAGE_KEY = 'mindmaze_study_streak_v2';
const LAST_ACTIVITY_KEY = 'mindmaze_last_activity_v2';
const LAST_NUDGE_KEY = 'mindmaze_last_nudge_v2';

/**
 * Returns previous calendar date in YYYY-MM-DD format
 */
export function getPreviousDateString(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const year = prev.getFullYear();
    const month = String(prev.getMonth() + 1).padStart(2, '0');
    const day = String(prev.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Load raw streak records from localStorage
 */
function getRawStoredStreak(): { bestStreak: number; completedDates: string[]; lastCompletedDate?: string } {
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
        completedDates: Array.isArray(parsed.completedDates) ? parsed.completedDates : [],
        lastCompletedDate: parsed.lastCompletedDate || undefined,
      };
    }
  } catch (e) {
    console.warn('Failed to parse streak from localStorage:', e);
  }

  // No stored streak: this student has no history yet. Start at zero —
  // never seed fake demo days (a fresh account must show 0, not 5).
  return {
    bestStreak: 0,
    completedDates: [],
    lastCompletedDate: undefined,
  };
}

/**
 * Save streak records to localStorage
 */
function saveRawStoredStreak(data: { bestStreak: number; completedDates: string[]; lastCompletedDate?: string }): void {
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save streak to localStorage:', e);
  }
}

/**
 * Wipe any stored streak history so a fresh account starts at 0.
 * Needed because localStorage is shared per device across sign-outs —
 * without this, a new signup on the same device would inherit the
 * previous student's streak.
 */
export function clearStoredStreak(): void {
  try {
    localStorage.removeItem(STREAK_STORAGE_KEY);
  } catch {}
}

/**
 * Calculate streak state dynamically given the current tasks & storage
 */
export function calculateStreak(dailyTasks: DailyTask[]): StreakState {
  const todayStr = getTodayDateString();
  const raw = getRawStoredStreak();

  // Combine completed dates from raw storage and any tasks with isCompleted: true
  const dateSet = new Set<string>(raw.completedDates);

  dailyTasks.forEach((t) => {
    if (t.isCompleted && t.date) {
      dateSet.add(t.date);
    }
  });

  const isCompletedToday = dateSet.has(todayStr);
  const yesterdayStr = getPreviousDateString(todayStr);

  let currentStreak = 0;

  if (isCompletedToday) {
    // Walk backwards starting from today
    let checkDate = todayStr;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else if (dateSet.has(yesterdayStr)) {
    // Yesterday was completed; today is not yet completed, but streak is alive!
    let checkDate = yesterdayStr;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
    // Both today and yesterday were missed: streak is reset to 0
    currentStreak = 0;
  }

  const bestStreak = Math.max(raw.bestStreak, currentStreak);
  const sortedCompleted = Array.from(dateSet).sort();

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate: isCompletedToday ? todayStr : raw.lastCompletedDate,
    completedDates: sortedCompleted,
    isCompletedToday,
  };
}

/**
 * Call when tasks change or a task completion is toggled
 */
export function recordTaskCompletionAndRefreshStreak(
  dailyTasks: DailyTask[],
  justCompletedToday: boolean
): StreakState {
  const todayStr = getTodayDateString();
  const raw = getRawStoredStreak();
  const dateSet = new Set<string>(raw.completedDates);

  // Sync with current tasks
  dailyTasks.forEach((t) => {
    if (t.isCompleted && t.date) {
      dateSet.add(t.date);
    }
  });

  if (justCompletedToday) {
    dateSet.add(todayStr);
  } else {
    // If no tasks today are completed, remove today from completed set
    const hasAnyDoneToday = dailyTasks.some((t) => t.date === todayStr && t.isCompleted);
    if (!hasAnyDoneToday) {
      dateSet.delete(todayStr);
    }
  }

  const sortedCompleted = Array.from(dateSet).sort();
  const isCompletedToday = dateSet.has(todayStr);
  const yesterdayStr = getPreviousDateString(todayStr);

  let currentStreak = 0;
  if (isCompletedToday) {
    let checkDate = todayStr;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else if (dateSet.has(yesterdayStr)) {
    let checkDate = yesterdayStr;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
    currentStreak = 0;
  }

  const bestStreak = Math.max(raw.bestStreak, currentStreak);

  saveRawStoredStreak({
    bestStreak,
    completedDates: sortedCompleted,
    lastCompletedDate: isCompletedToday ? todayStr : raw.lastCompletedDate,
  });

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate: isCompletedToday ? todayStr : raw.lastCompletedDate,
    completedDates: sortedCompleted,
    isCompletedToday,
  };
}

// ---------------------------------------------------------------------------
// Periodic Gentle Nudge Reminders
// ---------------------------------------------------------------------------

/**
 * Record user activity timestamp to avoid nudging active users
 */
export function recordAppActivity(): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {}
}

export function getLastAppActivityTime(): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    return raw ? Number(raw) : Date.now();
  } catch {
    return Date.now();
  }
}

export function getLastNudgeTime(): number {
  try {
    const raw = localStorage.getItem(LAST_NUDGE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function setLastNudgeTime(time: number = Date.now()): void {
  try {
    localStorage.setItem(LAST_NUDGE_KEY, String(time));
  } catch {}
}

/**
 * Check if a gentle nudge should be sent:
 * - Has upcoming incomplete tasks today
 * - All tasks today are NOT completed
 * - Haven't opened the app in a few hours (> 2.5 hours)
 * - Has not sent a nudge in the last 3 hours (max once every few hours)
 * - Between 8:00 AM and 10:00 PM (never after 10 PM cutoff)
 */
export function checkAndSendPeriodicNudge(
  dailyTasks: DailyTask[],
  currentStreak: number,
  force = false
): { sent: boolean; message?: string } {
  const now = new Date();
  const currentHour = now.getHours();

  // Reasonable cutoff time: Do not nudge before 8 AM or after 10 PM (22:00)
  if (!force && (currentHour < 8 || currentHour >= 22)) {
    return { sent: false };
  }

  const todayStr = getTodayDateString();
  const todayTasks = dailyTasks.filter((t) => t.date === todayStr);

  // If no tasks today or all tasks are already completed, do NOT send nudges!
  if (todayTasks.length === 0) {
    return { sent: false };
  }

  const incompleteTasks = todayTasks.filter((t) => !t.isCompleted);
  if (incompleteTasks.length === 0) {
    return { sent: false };
  }

  const lastActivity = getLastAppActivityTime();
  const lastNudge = getLastNudgeTime();
  const nowMs = Date.now();

  const hoursSinceActivity = (nowMs - lastActivity) / (1000 * 60 * 60);
  const hoursSinceNudge = (nowMs - lastNudge) / (1000 * 60 * 60);

  // Must not have opened app in at least 2 hours (unless forced for testing)
  if (!force && hoursSinceActivity < 2) {
    return { sent: false };
  }

  // Must not have sent a nudge in the last 3 hours (unless forced for testing)
  if (!force && hoursSinceNudge < 3) {
    return { sent: false };
  }

  // Pick the highest priority or first incomplete task
  const nextTask = incompleteTasks.find((t) => t.priority === 'High') || incompleteTasks[0];

  const nudge = generatePeriodicNudge({
    nextTopic: nextTask.topicTitle || nextTask.title,
    subject: nextTask.subject,
    subtopic: nextTask.subtopic,
    remainingCount: incompleteTasks.length,
    currentStreak,
  });

  sendStudyNotification(nudge.title, nudge.body);
  setLastNudgeTime(nowMs);

  return { sent: true, message: `${nudge.title}: ${nudge.body}` };
}
