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

/* * * Load raw streak records from localStorage */
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

  return {
    bestStreak: 0,
    completedDates: [],
    lastCompletedDate: undefined,
  };
}

/* * * Save streak records to localStorage */
function saveRawStoredStreak(data: { bestStreak: number; completedDates: string[]; lastCompletedDate?: string }): void {
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save streak to localStorage:', e);
  }
}

export function clearStoredStreak(): void {
  try {
    localStorage.removeItem(STREAK_STORAGE_KEY);
  } catch {}
}

export function calculateStreak(dailyTasks: DailyTask[]): StreakState {
  const todayStr = getTodayDateString();
  const raw = getRawStoredStreak();

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
    let checkDate = yesterdayStr;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
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

export function recordDailyVisit(): StreakState {
  const todayStr = getTodayDateString();
  const raw = getRawStoredStreak();
  const dateSet = new Set<string>(raw.completedDates);
  dateSet.add(todayStr);

  let currentStreak = 0;
  let checkDate = todayStr;
  while (dateSet.has(checkDate)) {
    currentStreak++;
    checkDate = getPreviousDateString(checkDate);
  }

  const bestStreak = Math.max(raw.bestStreak, currentStreak);
  const sortedCompleted = Array.from(dateSet).sort();

  saveRawStoredStreak({
    bestStreak,
    completedDates: sortedCompleted,
    lastCompletedDate: todayStr,
  });

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate: todayStr,
    completedDates: sortedCompleted,
    isCompletedToday: true,
  };
}

// Periodic Gentle Nudge Reminders

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

export function checkAndSendPeriodicNudge(
  dailyTasks: DailyTask[],
  currentStreak: number,
  force = false
): { sent: boolean; message?: string } {
  const now = new Date();
  const currentHour = now.getHours();

  if (!force && (currentHour < 8 || currentHour >= 22)) {
    return { sent: false };
  }

  const todayStr = getTodayDateString();
  const todayTasks = dailyTasks.filter((t) => t.date === todayStr);

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

  if (!force && hoursSinceActivity < 2) {
    return { sent: false };
  }

  if (!force && hoursSinceNudge < 3) {
    return { sent: false };
  }

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
