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

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Auto-set Content-Type to application/json unless body is FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Invalid/expired token
      removeAuthToken();
    }
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

// API Methods
export const api = {
  // Auth
  register: (body: any) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getProfile: () => apiFetch('/auth/profile'),
  updateProfile: (body: any) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
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
  createTimetableSlot: (body: any) => apiFetch('/timetable', { method: 'POST', body: JSON.stringify(body) }),
  updateTimetableSlot: (id: string, body: any) => apiFetch(`/timetable/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTimetableSlot: (id: string) => apiFetch(`/timetable/${id}`, { method: 'DELETE' }),

  // Syllabus
  getSyllabusProgress: () => apiFetch('/syllabus'),
  updateSubtopicProgress: (body: any) => apiFetch('/syllabus/update-subtopic', { method: 'POST', body: JSON.stringify(body) }),
  saveCompletedTopicsPicker: (topics: any[]) => apiFetch('/syllabus/completed-picker', { method: 'POST', body: JSON.stringify({ topics }) }),

  // Mistakes
  getMistakes: () => apiFetch('/mistakes'),
  saveMistake: (body: any) => apiFetch('/mistakes', { method: 'POST', body: JSON.stringify(body) }),
  updateMistake: (id: string, body: any) => apiFetch(`/mistakes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMistake: (id: string) => apiFetch(`/mistakes/${id}`, { method: 'DELETE' }),

  // Admin
  getAdminUsers: () => apiFetch('/admin/users'),
  updateUserRole: (id: string, role: string) => apiFetch(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  updateUserStatus: (id: string, isActive: boolean) => apiFetch(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  sendBroadcastEmail: (body: any) => apiFetch('/admin/broadcast-email', { method: 'POST', body: JSON.stringify(body) }),
  getAdminStats: () => apiFetch('/admin/stats'),
};
