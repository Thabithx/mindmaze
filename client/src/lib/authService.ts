import { UserProfile, StreamType, SyllabusType, MediumType } from '../types';
import { INITIAL_USER_PROFILE } from '../data/mockData';

const SESSION_KEY = 'al_physics_auth_profile';
const REGISTERED_USERS_KEY = 'al_physics_registered_users';

export interface StoredUserAccount {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'email' | 'guest';
  stream: StreamType;
  selectedSubjects: string[];
  targetGrade: string;
  examDate: string;
  syllabus: SyllabusType;
  medium: MediumType;
  xp: number;
  streakDays: number;
  dailyGoalMCQs: number;
  createdAt: string;
}

// Default pre-seeded demo accounts for one-click testing
export const DEMO_ACCOUNTS: StoredUserAccount[] = [
  {
    id: 'demo-maths-1',
    name: 'Kasun Perera',
    email: 'kasun.al@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    provider: 'google',
    stream: 'Maths',
    selectedSubjects: ['Combined Maths', 'Physics', 'Chemistry'],
    targetGrade: "3 A's",
    examDate: '2027-11-15',
    syllabus: 'current',
    medium: 'English',
    xp: 1420,
    streakDays: 6,
    dailyGoalMCQs: 20,
    createdAt: '2026-08-01',
  },
  {
    id: 'demo-bio-2',
    name: 'Nethmi Silva',
    email: 'nethmi.bio@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    provider: 'google',
    stream: 'Bio',
    selectedSubjects: ['Biology', 'Physics', 'Chemistry'],
    targetGrade: "3 A's",
    examDate: '2027-11-15',
    syllabus: 'current',
    medium: 'English',
    xp: 1850,
    streakDays: 14,
    dailyGoalMCQs: 25,
    createdAt: '2026-07-20',
  },
];

export function getRegisteredUsers(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading registered users', e);
  }
  return DEMO_ACCOUNTS;
}

export function saveRegisteredUser(account: StoredUserAccount): void {
  try {
    const existing = getRegisteredUsers();
    const index = existing.findIndex((u) => u.email.toLowerCase() === account.email.toLowerCase());
    let updated: StoredUserAccount[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = { ...updated[index], ...account };
    } else {
      updated = [account, ...existing];
    }
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving registered user', e);
  }
}

export const GUEST_USER_PROFILE: UserProfile = {
  ...INITIAL_USER_PROFILE,
  id: 'guest',
  name: 'Guest Student',
  email: '',
  avatar: '',
  provider: 'guest',
  isAuthenticated: false,
  stream: 'Maths',
  selectedSubjects: ['Combined Maths', 'Physics', 'Chemistry'],
  targetGrade: "3 A's",
  examDate: '2027-11-15',
  dailyGoalMCQs: 20,
  dailyCompletedMCQs: 0,
  streakDays: 0,
  streakFreezes: 1,
  xp: 0,
  syllabus: 'current',
  currentOnlyFilter: true,
  medium: 'English',
};

export function getStoredSession(): UserProfile {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...GUEST_USER_PROFILE,
          ...parsed,
          isAuthenticated: Boolean(parsed.isAuthenticated === true && parsed.email),
        };
      }
    }
  } catch (e) {
    console.error('Error reading session', e);
  }

  // Default active user for first time visitors
  return {
    ...INITIAL_USER_PROFILE,
    id: 'demo-maths-1',
    name: 'Kasun Perera',
    email: 'kasun.al@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    provider: 'google',
    isAuthenticated: true,
    medium: 'English',
  };
}

export function saveSession(profile: UserProfile): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    if (profile.email) {
      saveRegisteredUser({
        id: profile.id || `usr-${Date.now()}`,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        provider: profile.provider || 'email',
        stream: profile.stream,
        selectedSubjects: profile.selectedSubjects,
        targetGrade: profile.targetGrade,
        examDate: profile.examDate,
        syllabus: profile.syllabus,
        medium: profile.medium || 'English',
        xp: profile.xp,
        streakDays: profile.streakDays,
        dailyGoalMCQs: profile.dailyGoalMCQs,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error('Error saving session', e);
  }
}

export function clearSession(): UserProfile {
  try {
    // Explicitly persist the signed-out guest profile so page refresh maintains signed-out state
    localStorage.setItem(SESSION_KEY, JSON.stringify(GUEST_USER_PROFILE));
  } catch (e) {
    console.error('Error clearing session', e);
  }

  return { ...GUEST_USER_PROFILE };
}
