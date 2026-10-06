// Only ONE admin account may open a student's activity profile.
// The account is identified by email (unique) and must still hold the admin role.
// Override with ACTIVITY_VIEWER_EMAIL in the server environment; if it is blank, nobody has access.
const DEFAULT_VIEWER = 'ashjadhazhar@gmail.com';

export const activityViewerEmail = (): string =>
  (process.env.ACTIVITY_VIEWER_EMAIL !== undefined ? process.env.ACTIVITY_VIEWER_EMAIL : DEFAULT_VIEWER).trim().toLowerCase();

export const canViewUserActivity = (user?: { role?: string; email?: string } | null): boolean => {
  const allowed = activityViewerEmail();
  return !!user && !!allowed && user.role === 'admin' && String(user.email || '').trim().toLowerCase() === allowed;
};
