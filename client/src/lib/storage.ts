import { DailyTask, SyllabusTopic, TimetableEntry, UserSettings, StreamType } from '../types';
import { INITIAL_SYLLABUS_TOPICS } from '../data/alSyllabusData';

const TIMETABLE_STORAGE_KEY = 'mindmaze_timetable_v2';
const DAILY_TASKS_STORAGE_KEY = 'mindmaze_daily_tasks_v2';
const TOPICS_STORAGE_KEY = 'mindmaze_syllabus_topics_v2';
const SETTINGS_STORAGE_KEY = 'mindmaze_user_settings_v2';

export const DEFAULT_SETTINGS: UserSettings = {
  stream: 'Physical Science',
  physicalScienceElective: 'Chemistry',
  studentName: '',
  targetExamYear: '2027',
  targetExamDate: '',
  // No fake goal: a fresh account shows no Z-score target until the student
  // sets one at sign-up or in Settings (the goals strip hides when unset).
  targetZScore: '',
  motivationNote: '',
  // Optional contact number (stored info only — never auth/OTP).
  mobileNumber: '',
  reminderSoundEnabled: true,
  notificationsGranted: false,
  hasSeenNotificationPrompt: false,
  dailyHoursGoal: 4,
  weeklyHoursGoal: 28,
};

// ================= TIMETABLE STORAGE =================
// Fresh accounts start with ZERO blocks: an empty timetable stays empty.
// (The recommended schedule is only applied on explicit Reset in the
// Timetable tab via getInitialTimetableForStream — never auto-seeded.)
export function getStoredTimetable(): TimetableEntry[] {
  try {
    const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse timetable from localStorage, fallback to empty', e);
    return [];
  }
}

export function saveStoredTimetable(entries: TimetableEntry[]): void {
  try {
    localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save timetable to localStorage', e);
  }
}

// ================= DAILY TASKS STORAGE =================
export function getStoredDailyTasks(dateStr?: string): DailyTask[] {
  try {
    const raw = localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    if (!raw) {
      // Generate default initial tasks for today from today's timetable
      return [];
    }
    const parsed: DailyTask[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (dateStr) {
      return parsed.filter((t) => t.date === dateStr);
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to parse daily tasks from localStorage', e);
    return [];
  }
}

export function saveStoredDailyTasks(tasks: DailyTask[]): void {
  try {
    localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save daily tasks to localStorage', e);
  }
}

// ================= TOPICS STORAGE =================
export function getStoredSyllabusTopics(): SyllabusTopic[] {
  try {
    const raw = localStorage.getItem(TOPICS_STORAGE_KEY);
    if (!raw) {
      saveStoredSyllabusTopics(INITIAL_SYLLABUS_TOPICS);
      return INITIAL_SYLLABUS_TOPICS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredSyllabusTopics(INITIAL_SYLLABUS_TOPICS);
      return INITIAL_SYLLABUS_TOPICS;
    }

    // Migrate any stored syllabus to the latest detailed version (Physics 1-11,
    // Chemistry 1-14, Biology 1-10, ICT 1-14, Combined Maths Pure+Applied 1-18).
    // Preserves user progress (status / notes) while refreshing subtopic lists.
    // Custom user topics (isCustom) are always preserved.
    const needsMigration =
      parsed.length !== INITIAL_SYLLABUS_TOPICS.length ||
      (parsed as SyllabusTopic[]).some((t: SyllabusTopic) => t.id === 'phy-12' || t.id === 'phy-17') ||
      INITIAL_SYLLABUS_TOPICS.some((fresh) => {
        if (fresh.isCustom) return false;
        const existing = (parsed as SyllabusTopic[]).find((p: SyllabusTopic) => p.id === fresh.id);
        if (!existing) return true;
        const existingSubs = existing.subtopics || [];
        const freshSubs = fresh.subtopics || [];
        if (existingSubs.length !== freshSubs.length) return true;
        if (fresh.topicTitle !== existing.topicTitle || fresh.unitTitle !== existing.unitTitle) return true;
        return freshSubs.some((s) => !existingSubs.includes(s));
      });

    if (needsMigration) {
      const customTopics = (parsed as SyllabusTopic[]).filter((t: SyllabusTopic) => t.isCustom);
      const merged = INITIAL_SYLLABUS_TOPICS.map((fresh) => {
        const existing = (parsed as SyllabusTopic[]).find((p: SyllabusTopic) => p.id === fresh.id);
        if (existing) {
          const freshSubs = fresh.subtopics || [];
          // Keep only completed subtopics that still exist in the new detailed list
          const keptCompleted = (existing.completedSubtopics || []).filter((s: string) =>
            freshSubs.includes(s)
          );
          const keptProgress: Record<string, number> = {};
          for (const [k, v] of Object.entries(existing.subtopicProgress || {})) {
            if (freshSubs.includes(k)) keptProgress[k] = v;
          }
          return {
            ...fresh,
            status: existing.status || fresh.status,
            completedSubtopics: keptCompleted,
            subtopicProgress: keptProgress,
            notes: existing.notes || fresh.notes,
          };
        }
        return fresh;
      });
      const updated = [...merged, ...customTopics];
      saveStoredSyllabusTopics(updated);
      return updated;
    }

    return parsed;
  } catch (e) {
    console.warn('Failed to parse syllabus topics from localStorage', e);
    return INITIAL_SYLLABUS_TOPICS;
  }
}

export function saveStoredSyllabusTopics(topics: SyllabusTopic[]): void {
  try {
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
  } catch (e) {
    console.error('Failed to save syllabus topics to localStorage', e);
  }
}

// ================= USER SETTINGS STORAGE =================
export function getUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      saveUserSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const normalizedStream: StreamType =
      parsed.stream === 'Bio' || parsed.stream === 'Biological Science'
        ? 'Biological Science'
        : 'Physical Science';

    const normalizedElective: 'Chemistry' | 'ICT' =
      parsed.physicalScienceElective === 'ICT' ? 'ICT' : 'Chemistry';

    // Migrate old weekly-only goal to daily goal (weekly = daily x 7)
    const migratedDaily =
      typeof parsed.dailyHoursGoal === 'number'
        ? parsed.dailyHoursGoal
        : typeof parsed.weeklyHoursGoal === 'number'
          ? Math.round((parsed.weeklyHoursGoal / 7) * 10) / 10
          : DEFAULT_SETTINGS.dailyHoursGoal;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      dailyHoursGoal: migratedDaily,
      weeklyHoursGoal: Math.round(migratedDaily * 7 * 10) / 10,
      stream: normalizedStream,
      physicalScienceElective: normalizedElective,
    };
  } catch (e) {
    console.warn('Failed to parse settings from localStorage', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserSettings>): UserSettings {
  try {
    const current = getUserSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
    return DEFAULT_SETTINGS;
  }
}

// ================= DATE HELPERS =================
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDayOfWeek(): TimetableEntry['dayOfWeek'] {
  const days: TimetableEntry['dayOfWeek'][] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[new Date().getDay()];
}

export function getFormattedDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Returns DayOfWeek (e.g. 'Monday') for a given YYYY-MM-DD date string
 */
export function getDayOfWeekFromDate(dateStr: string): TimetableEntry['dayOfWeek'] {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const days: TimetableEntry['dayOfWeek'][] = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[date.getDay()];
  } catch {
    return 'Monday';
  }
}

/**
 * Returns the calendar date (YYYY-MM-DD) for a given DayOfWeek in the current week (Mon-Sun)
 */
export function getDateForDayOfWeekInCurrentWeek(
  targetDay: TimetableEntry['dayOfWeek'],
  referenceDate: Date = new Date()
): string {
  const daysOrder: TimetableEntry['dayOfWeek'][] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  // Calculate relative to Monday as week start
  const currentDayIndex = (referenceDate.getDay() + 6) % 7;
  const targetDayIndex = daysOrder.indexOf(targetDay);
  const diffDays = targetDayIndex - currentDayIndex;

  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + diffDays
  );
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses an "HH:MM" (24-hour) string to minutes since midnight.
 * Returns NaN when the string is not a valid time.
 */
export function timeToMinutes(t: string): number {
  if (typeof t !== 'string') return NaN;
  const parts = t.trim().split(':');
  if (parts.length < 2) return NaN;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * True only when both times are valid "HH:MM" values AND end is
 * strictly after start (same-day ranges; overnight spans are rejected).
 */
export function isEndAfterStart(startTime: string, endTime: string): boolean {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  return Number.isFinite(s) && Number.isFinite(e) && e > s;
}

/**
 * Formats "HH:MM" (24-hour) as 12-hour with AM/PM, e.g. "14:05" -> "2:05 PM".
 * Returns the input unchanged when it cannot be parsed.
 */
export function formatTime12h(t: string): string {
  const mins = timeToMinutes(t);
  if (!Number.isFinite(mins)) return t;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Calculates duration in minutes between "HH:MM" and "HH:MM".
 * Returns 0 when the range is invalid (end not after start, or
 * unparseable input) so callers can never mistake a bad range for a
 * real duration. Use isEndAfterStart() to show a validation error.
 */
export function calculateMinutesBetween(startTime: string, endTime: string): number {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
  const diff = e - s;
  return diff > 0 ? diff : 0;
}

/**
 * Computes an "HH:MM" end time from a start time and duration minutes
 */
export function computeEndTime(startTime: string, durationMinutes: number = 90): string {
  try {
    const [sh, sm] = startTime.split(':').map(Number);
    const totalMin = sh * 60 + sm + durationMinutes;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch {
    return '18:00';
  }
}

/**
 * Formats minutes since midnight as "HH:MM" (24-hour), wrapping past midnight.
 */
export function minutesToHHMM(totalMinutes: number): string {
  const wrapped = ((Math.round(totalMinutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/**
 * Returns the default color code for a subject
 */
export function getSubjectColorKey(subjectName: string): string {
  const lower = subjectName.toLowerCase();
  if (lower.includes('math')) return 'indigo';
  if (lower.includes('physic')) return 'cyan';
  if (lower.includes('chem')) return 'purple';
  if (lower.includes('bio')) return 'emerald';
  if (lower.includes('ict') || lower.includes('info')) return 'pink';
  if (lower.includes('english') || lower.includes('git')) return 'blue';
  return 'amber';
}
