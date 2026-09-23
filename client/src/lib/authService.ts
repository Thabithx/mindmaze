import { UserProfile, StreamType, SyllabusType, MediumType } from '../types';

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
  return [];
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
  id: 'guest',
  name: 'Guest Student',
  email: '',
  avatar: '',
  provider: 'guest',
  isAuthenticated: false,
  stream: 'Physical Science',
  selectedSubjects: [],
  targetGrade: '',
  examDate: '',
  dailyGoalMCQs: 0,
  dailyCompletedMCQs: 0,
  streakDays: 0,
  xp: 0,
  syllabus: 'current',
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

  return { ...GUEST_USER_PROFILE };
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(GUEST_USER_PROFILE));
  } catch (e) {
    console.error('Error clearing session', e);
  }

  return { ...GUEST_USER_PROFILE };
}
