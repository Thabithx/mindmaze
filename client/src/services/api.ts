const API_BASE = import.meta.env.VITE_API_URL || 'https://mindmaze-30xp.onrender.com/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('mind_maze_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('mind_maze_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('mind_maze_token');
};

export const getStoredUser = (): any | null => {
  try {
    const raw = localStorage.getItem('mind_maze_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: any): void => {
  try {
    localStorage.setItem('mind_maze_user', JSON.stringify(user));
  } catch {}
};

export const removeStoredUser = (): void => {
  localStorage.removeItem('mind_maze_user');
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && endpoint !== '/auth/login') {
        removeAuthToken();
        removeStoredUser();
      }
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Server connection timed out. The backend is waking up, please try again in a few seconds.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

// API Methods
export const api = {
  // Auth
  register: (body: any) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (email: string, redirectUrl?: string) =>
    apiFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        redirectUrl: redirectUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
      }),
    }),
  resetPassword: (body: { token: string; email?: string; newPassword: string }) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  getProfile: () => apiFetch('/auth/profile'),
  updateProfile: (body: any) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  addStudyMinutes: (minutes: number) => apiFetch('/auth/add-study-minutes', { method: 'POST', body: JSON.stringify({ minutes }) }),
  deleteAccount: () => apiFetch('/auth/account', { method: 'DELETE' }),
  savePushSubscription: (subscription: any) => apiFetch('/auth/push-subscription', { method: 'POST', body: JSON.stringify({ subscription }) }),

  // Courses
  getCourses: (stream?: string, subject?: string) => {
    const query = new URLSearchParams();
    if (stream) query.append('stream', stream);
    if (subject) query.append('subject', subject);
    return apiFetch(`/courses?${query.toString()}`);
  },
  getCourseById: (id: string) => apiFetch(`/courses/${id}`),
  createCourse: (formData: FormData) => apiFetch('/courses', { method: 'POST', body: formData }),
  deleteCourse: (id: string) => apiFetch(`/courses/${id}`, { method: 'DELETE' }),

  // Timetable
  getTimetable: () => apiFetch('/timetable'),
  syncTimetable: (slots: any[]) => apiFetch('/timetable/sync', { method: 'POST', body: JSON.stringify({ slots }) }),
  createTimetableSlot: (body: any) => apiFetch('/timetable', { method: 'POST', body: JSON.stringify(body) }),
  updateTimetableSlot: (id: string, body: any) => apiFetch(`/timetable/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTimetableSlot: (id: string) => apiFetch(`/timetable/${id}`, { method: 'DELETE' }),
  sendTimetableReminder: (body: { subject: string; topic: string; startTime: string; notes?: string }) =>
    apiFetch('/timetable/send-reminder', { method: 'POST', body: JSON.stringify(body) }),

  // Syllabus
  getSyllabusProgress: () => apiFetch('/syllabus'),
  getLeaderboard: (period = 'weekly', limit = 50) => apiFetch(`/syllabus/leaderboard?period=${period}&limit=${limit}`),
  updateSubtopicProgress: (body: any) => apiFetch('/syllabus/update-subtopic', { method: 'POST', body: JSON.stringify(body) }),
  updateTopicProgress: (body: any) => apiFetch('/syllabus/update-topic', { method: 'PUT', body: JSON.stringify(body) }),
  saveCompletedTopicsPicker: (topics: any[]) => apiFetch('/syllabus/completed-picker', { method: 'POST', body: JSON.stringify({ topics }) }),

  // Mistakes
  getMistakes: () => apiFetch('/mistakes'),
  saveMistake: (body: any) => apiFetch('/mistakes', { method: 'POST', body: JSON.stringify(body) }),
  updateMistake: (id: string, body: any) => apiFetch(`/mistakes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMistake: (id: string) => apiFetch(`/mistakes/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: () => apiFetch('/tasks'),
  syncTasks: (tasks: any[]) => apiFetch('/tasks/sync', { method: 'POST', body: JSON.stringify({ tasks }) }),
  updateTask: (taskId: string, body: any) => apiFetch(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (taskId: string) => apiFetch(`/tasks/${taskId}`, { method: 'DELETE' }),

  // Admin
  getAdminUsers: () => apiFetch('/admin/users'),
  updateUserRole: (id: string, role: string) => apiFetch(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateUserStatus: (id: string, isActive: boolean) => apiFetch(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  deleteUser: (id: string) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
  sendBroadcastEmail: (body: any) => apiFetch('/admin/broadcast-email', { method: 'POST', body: JSON.stringify(body) }),
  testAdminEmail: (body?: { email?: string }) => apiFetch('/admin/test-email', { method: 'POST', body: JSON.stringify(body || {}) }),
  getAdminStats: () => apiFetch('/admin/stats'),
  getAdminExamDate: () => apiFetch('/admin/site-config/exam-date'),
  setAdminExamDate: (payload: { examDate2026?: string; examDate2027?: string; examDate?: string } | string) =>
    apiFetch('/admin/site-config/exam-date', {
      method: 'PUT',
      body: JSON.stringify(typeof payload === 'string' ? { examDate: payload, examDate2026: payload } : payload),
    }),
};
