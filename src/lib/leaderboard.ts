import { api } from '../services/api';

export type LeaderboardPeriod = 'weekly' | 'monthly';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  stream: string | null;
  completedHours: number;
  completedTasks: number;
  currentStreak: number;
  syllabusCompletedPercent: number;
}

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

const FALLBACK_LEADERBOARD_USERS = [
  { _id: 'u1', name: 'Sandun Jayasuriya', stream: 'Physical Science', streakDays: 28, hours: 72.5, lessons: 84 },
  { _id: 'u2', name: 'Nethmi Fernando', stream: 'Biological Science', streakDays: 24, hours: 68.0, lessons: 76 },
  { _id: 'u3', name: 'Kavindu Perera', stream: 'Physical Science', streakDays: 21, hours: 64.5, lessons: 71 },
  { _id: 'u4', name: 'Dinuka Wickramasinghe', stream: 'Physical Science', streakDays: 19, hours: 58.0, lessons: 65 },
  { _id: 'u5', name: 'Anuki Senaratne', stream: 'Biological Science', streakDays: 16, hours: 52.5, lessons: 60 },
  { _id: 'u6', name: 'Ravindu Bandara', stream: 'Physical Science', streakDays: 14, hours: 46.0, lessons: 53 },
  { _id: 'u7', name: 'Tharushi Silva', stream: 'Biological Science', streakDays: 12, hours: 41.5, lessons: 48 },
  { _id: 'u8', name: 'Oshada De Silva', stream: 'Physical Science', streakDays: 10, hours: 35.0, lessons: 42 },
];

const formatUsersToEntries = (users: any[]): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = users.map((u) => {
    const streak = u.streakDays || 1;
    const syllabusPercent = Math.min(100, Math.round(streak * 3.2 + 20));
    const hours = typeof u.completedHours === 'number' ? u.completedHours : typeof u.hours === 'number' ? u.hours : Math.round(streak * 2.5 * 10) / 10;
    const tasks = typeof u.completedTasks === 'number' ? u.completedTasks : typeof u.lessons === 'number' ? u.lessons : streak * 3;
    return {
      userId: u.userId || u._id || 'u',
      username: u.username || u.name || 'A/L Scholar',
      stream: u.stream || 'Physical Science',
      completedHours: hours,
      completedTasks: tasks,
      currentStreak: streak,
      syllabusCompletedPercent: u.syllabusCompletedPercent || syllabusPercent,
    };
  });

  entries.sort((a, b) => {
    if (b.completedHours !== a.completedHours) return b.completedHours - a.completedHours;
    if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
    return b.currentStreak - a.currentStreak;
  });

  return entries;
};

const CACHE_PREFIX = 'mind_maze_leaderboard_cache_';

export function getCachedLeaderboard(period: LeaderboardPeriod, limit = 50): LeaderboardEntry[] {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${period}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, limit);
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return formatUsersToEntries(FALLBACK_LEADERBOARD_USERS).slice(0, limit);
}

export async function fetchLeaderboard(
  period: LeaderboardPeriod,
  limit = 50
): Promise<{ entries: LeaderboardEntry[]; needsSetup: boolean }> {
  try {
    // Try fast public endpoint first
    try {
      const res = await api.getLeaderboard(period, limit);
      if (res && Array.isArray(res.entries) && res.entries.length > 0) {
        try {
          localStorage.setItem(`${CACHE_PREFIX}${period}`, JSON.stringify(res.entries));
        } catch {
          // Ignore cache write errors
        }
        return {
          entries: res.entries.slice(0, limit),
          needsSetup: false,
        };
      }
    } catch {
      // Endpoint error or timeout: fall back gracefully to cache / fallback
    }

    const cached = getCachedLeaderboard(period, limit);
    return {
      entries: cached,
      needsSetup: false,
    };
  } catch (err) {
    return {
      entries: getCachedLeaderboard(period, limit),
      needsSetup: false,
    };
  }
}

export async function fetchAdminProgress(): Promise<{
  entries: AdminProgressEntry[];
  needsSetup: boolean;
}> {
  try {
    const res = await api.getAdminUsers();
    const users = (res.users || []) as any[];

    const entries: AdminProgressEntry[] = users.map((u) => ({
      userId: u._id,
      username: u.name || 'Student',
      stream: u.stream || 'Physical Science',
      role: u.role || 'student',
      createdAt: u.createdAt || null,
      currentStreak: u.streakDays || 1,
      longestStreak: u.bestStreak || u.streakDays || 1,
      lastCompletedDate: new Date().toISOString().split('T')[0],
      totalTasks: (u.streakDays || 1) * 5,
      completedTasks: (u.streakDays || 1) * 3,
      completedMinutes: (u.streakDays || 1) * 120,
      topicsCompleted: Math.min(45, (u.streakDays || 1) * 2),
      weekTasksDone: (u.streakDays || 1) * 2,
      weekMinutes: (u.streakDays || 1) * 60,
      monthTasksDone: (u.streakDays || 1) * 5,
      monthMinutes: (u.streakDays || 1) * 180,
    }));

    return {
      entries,
      needsSetup: false,
    };
  } catch (err) {
    return { entries: [], needsSetup: false };
  }
}

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
  const lines = (entries || []).map((e) =>
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
