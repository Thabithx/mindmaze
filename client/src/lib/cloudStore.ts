import { DailyTask, SyllabusTopic, TimetableEntry, TopicStatus } from '../types';
import { supabase } from './supabaseClient';

/**
 * Cloud persistence layer (Supabase).
 * localStorage remains as an offline cache/mirror; when a student is logged
 * in, Supabase is the source of truth and localStorage is kept in sync.
 */

export class CloudError extends Error {
  userMessage: string;
  constructor(userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = 'CloudError';
    this.userMessage = userMessage;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

function requireClient() {
  if (!supabase) throw new CloudError('Cloud sync is not configured on this device.');
  return supabase;
}

/** Extract a human-readable message from any Supabase/PostgREST/network error shape.
 *  PostgREST failures are plain objects ({ message, details, hint, code }),
 *  NOT Error instances — reading only err.message produced "Unknown error". */
function describeError(err: unknown): { message: string; code?: string } {
  if (err instanceof Error) {
    return { message: err.message || 'Unknown error' };
  }
  if (err && typeof err === 'object') {
    const r = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof r.message === 'string' && r.message.trim()) parts.push(r.message.trim());
    if (typeof r.details === 'string' && r.details.trim()) parts.push(r.details.trim());
    if (typeof r.hint === 'string' && r.hint.trim()) parts.push(r.hint.trim());
    const code = typeof r.code === 'string' && r.code.trim() ? r.code.trim() : undefined;
    if (parts.length > 0) return { message: parts.join(' '), code };
    try {
      const json = JSON.stringify(r);
      if (json && json !== '{}') return { message: json, code };
    } catch {
      // fall through to Unknown error
    }
  } else if (typeof err === 'string' && err.trim()) {
    return { message: err.trim() };
  }
  return { message: 'Unknown error' };
}

function friendlyError(prefix: string, err: unknown): CloudError {
  const { message: msg, code } = describeError(err);
  if (/network|fetch|failed|offline/i.test(msg)) {
    return new CloudError(`${prefix} You appear to be offline — your work is saved on this device and will sync later.`, err);
  }
  const suffix = code ? `${msg} (code ${code})` : msg;
  return new CloudError(`${prefix} ${suffix}`, err);
}

// ================= PROFILES =================

export type UserRole = 'student' | 'admin';

export type PhysicalElective = 'Chemistry' | 'ICT';

export interface UserProfileRow {
  username: string | null;
  /** Study stream from the profiles table; null when never set (or column missing). */
  stream: string | null;
  /** Access role; always 'student' unless the row was promoted in the dashboard. */
  role: UserRole;
  /** Physical Science 3rd-subject choice; null when never set (or column missing). */
  elective: PhysicalElective | null;
  /** Expected A/L exam date ('YYYY-MM-DD'); null when never set (or column missing). */
  alExamDate: string | null;
  /** Optional Z-score goal (free text, e.g. '1.8000'); null when unset. */
  targetZScore: string | null;
  /** Optional personal motivation note; null when unset. */
  motivationNote: string | null;
  /** Optional contact number (stored info only — never auth/OTP); null when unset. */
  mobileNumber: string | null;
  /** Last browser notification permission reported by the student's device;
   *  null when never reported (never asked, or pre-telemetry app version). */
  pushPermission: PushPermission | null;
}

/** Browser notification permission as reported by a student's device. */
export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

/** Normalize a raw permission value; null when missing/invalid. */
export function toPushPermission(v: unknown): PushPermission | null {
  return v === 'granted' || v === 'denied' || v === 'default' || v === 'unsupported' ? v : null;
}

/** Normalize a raw elective value; null when missing/invalid. */
export function toElective(v: unknown): PhysicalElective | null {
  return v === 'ICT' ? 'ICT' : v === 'Chemistry' ? 'Chemistry' : null;
}

/** Normalize a raw exam-date value; null unless YYYY-MM-DD. */
export function toExamDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(t + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : t;
}

/**
 * Light sanity check for the optional contact number (stored info only —
 * never auth/OTP/verification). Accepts digits with an optional leading '+'
 * plus common separators (spaces, dashes, parentheses). Returns the trimmed
 * value (max 30 chars) or null when blank. Never throws and never blocks:
 * callers store whatever the student typed; this only trims/caps length.
 */
export function toMobileNumber(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, 30);
  return t ? t : null;
}

/** True when a typed number looks plausible (7–15 digits); hint only, never blocking. */
export function isMobileNumberPlausible(v: string): boolean {
  const digits = v.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  return /^[+\d][\d\s\-().]*$/.test(v.trim());
}

/** True when a Supabase error means "column does not exist" (pre-migration DB).
 *  Covers both raw Postgres errors (code 42703) and PostgREST schema-cache
 *  errors (code PGRST204: "Could not find the 'x' column ... in the schema
 *  cache"), which is what the API actually returns for a missing column. */
function isMissingColumnError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code === '42703' || code === 'PGRST204') return true;
  const msg = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err ?? '');
  return /column .* does not exist/i.test(msg) || /could not find .* column .* schema cache/i.test(msg);
}

export async function fetchUsername(userId: string): Promise<string | null> {
  return (await fetchUserProfile(userId)).username;
}

/** Load the student's profile row (username + stream + role + elective + exam date). */
export async function fetchUserProfile(userId: string): Promise<UserProfileRow> {
  const toRole = (v: unknown): UserRole => (v === 'admin' ? 'admin' : 'student');
  // Layered back-compat: each level drops one more column, so any
  // combination of pre-migration tables still resolves.
  const levels = [
    'username, stream, role, elective, al_exam_date, target_z_score, motivation_note, mobile_number, push_permission',
    'username, stream, role, elective, al_exam_date, target_z_score, motivation_note, mobile_number',
    'username, stream, role, elective, al_exam_date, target_z_score, motivation_note',
    'username, stream, role, elective, al_exam_date',
    'username, stream, role, elective',
    'username, stream, role',
    'username, stream',
    'username',
  ];
  let lastErr: unknown = null;
  for (const cols of levels) {
    try {
      const { data, error } = await requireClient()
        .from('profiles')
        .select(cols)
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      const row = (data ?? {}) as { username?: string | null; stream?: string | null; role?: string | null; elective?: string | null; al_exam_date?: string | null; target_z_score?: string | null; motivation_note?: string | null; mobile_number?: string | null; push_permission?: string | null };
      const textOrNull = (v: unknown): string | null => {
        if (typeof v !== 'string') return null;
        const t = v.trim();
        return t ? t : null;
      };
      return {
        username: row.username ?? null,
        stream: cols.includes('stream') ? (row.stream ?? null) : null,
        role: cols.includes('role') ? toRole(row.role) : 'student',
        elective: cols.includes('elective') ? toElective(row.elective) : null,
        alExamDate: cols.includes('al_exam_date') ? toExamDate(row.al_exam_date) : null,
        targetZScore: cols.includes('target_z_score') ? textOrNull(row.target_z_score) : null,
        motivationNote: cols.includes('motivation_note') ? textOrNull(row.motivation_note) : null,
        mobileNumber: cols.includes('mobile_number') ? toMobileNumber(row.mobile_number) : null,
        pushPermission: cols.includes('push_permission') ? toPushPermission(row.push_permission) : null,
      };
    } catch (err) {
      if (!isMissingColumnError(err)) {
        if (err instanceof CloudError) throw err;
        throw friendlyError('Could not load your profile.', err);
      }
      lastErr = err;
    }
  }
  if (lastErr instanceof CloudError) throw lastErr;
  throw friendlyError('Could not load your profile.', lastErr);
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const { data, error } = await requireClient().rpc('is_username_available', {
      uname: username.trim(),
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not check username availability.', err);
  }
}

export function validateUsernameFormat(username: string): string | null {
  const name = username.trim();
  if (name.length < 3) return 'Username must be at least 3 characters.';
  if (name.length > 30) return 'Username must be 30 characters or fewer.';
  if (!/^[A-Za-z0-9_]+$/.test(name)) return 'Username may only contain letters, numbers and underscores.';
  return null;
}

export async function createProfile(
  userId: string,
  username: string,
  stream?: string | null,
  elective?: PhysicalElective | null,
  alExamDate?: string | null,
  targetZScore?: string | null,
  motivationNote?: string | null,
  mobileNumber?: string | null
): Promise<void> {
  // NOTE: role is ALWAYS 'student' here. There is intentionally no role
  // parameter — students can never self-assign another role. The database
  // additionally enforces this via the profiles_insert_own RLS policy
  // (WITH CHECK role = 'student') and the force_profiles_role_student
  // trigger, so even hand-crafted API requests cannot escalate.
  const baseRow: Record<string, unknown> = { id: userId, username: username.trim(), role: 'student' };
  if (stream) baseRow.stream = stream;
  if (elective) baseRow.elective = elective;
  if (alExamDate && toExamDate(alExamDate)) baseRow.al_exam_date = toExamDate(alExamDate);
  if (targetZScore && targetZScore.trim()) baseRow.target_z_score = targetZScore.trim().slice(0, 20);
  if (motivationNote && motivationNote.trim()) {
    baseRow.motivation_note = motivationNote.trim().slice(0, 500);
  }
  // Optional contact number — stored info only, never auth/OTP. Light
  // trim/cap only; never blocks sign-up when blank or imperfect.
  const cleanMobile = toMobileNumber(mobileNumber);
  if (cleanMobile) baseRow.mobile_number = cleanMobile;
  // Cast: the generated client types predate the stream/role/elective/exam
  // columns; the extra keys pass through at runtime and are stripped below
  // if the DB lacks them (pre-migration databases).
  const row = baseRow as { id: string; username: string };
  try {
    const { error } = await requireClient()
      .from('profiles')
      .insert(row);
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new CloudError('Username already taken. Please choose another one.');
      }
      // Back-compat: profiles table missing newer columns yet — retry
      // without the missing key(s) so sign-up still works pre-migration.
      if (isMissingColumnError(error)) {
        const errMsg = (error as { message?: string }).message ?? '';
        const fallbackRow: Record<string, unknown> = { ...baseRow };
        if (/stream/i.test(errMsg)) delete fallbackRow.stream;
        if (/role/i.test(errMsg)) delete fallbackRow.role;
        if (/elective/i.test(errMsg)) delete fallbackRow.elective;
        if (/al_exam_date/i.test(errMsg)) delete fallbackRow.al_exam_date;
        if (/target_z_score/i.test(errMsg)) delete fallbackRow.target_z_score;
        if (/motivation_note/i.test(errMsg)) delete fallbackRow.motivation_note;
        if (/mobile_number/i.test(errMsg)) delete fallbackRow.mobile_number;
        // If nothing was stripped (unrecognized missing column), rethrow.
        if (Object.keys(fallbackRow).length === Object.keys(baseRow).length) throw error;
        const retry = await requireClient()
          .from('profiles')
          .insert(fallbackRow as { id: string; username: string });
        if (retry.error) {
          if ((retry.error as { code?: string }).code === '23505') {
            throw new CloudError('Username already taken. Please choose another one.');
          }
          throw retry.error;
        }
        return;
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not create your profile.', err);
  }
}

/** Admin user-list entry (read-only in the app; roles change in the dashboard). */
export interface AdminProfileEntry {
  id: string;
  username: string | null;
  stream: string | null;
  role: UserRole;
  createdAt: string | null;
  /** Last reported browser permission; null = never reported (not asked / old client). */
  pushPermission: PushPermission | null;
}

/**
 * List every profile row. Only succeeds for admins (see the
 * profiles_admin_read_all RLS policy); everyone else gets an RLS error,
 * which the Admin Panel surfaces as "access denied".
 */
export async function fetchAllProfiles(): Promise<AdminProfileEntry[]> {
  const mapRows = (rows: Record<string, unknown>[]): AdminProfileEntry[] =>
    rows.map((r) => ({
      id: String(r.id ?? ''),
      username: (r.username as string | null) ?? null,
      stream: (r.stream as string | null) ?? null,
      role: r.role === 'admin' ? 'admin' : 'student',
      createdAt: (r.created_at as string | null) ?? null,
      pushPermission: toPushPermission(r.push_permission),
    }));
  try {
    const { data, error } = await requireClient()
      .from('profiles')
      .select('id, username, stream, role, created_at, push_permission')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return mapRows((data ?? []) as Record<string, unknown>[]);
  } catch (err) {
    // Pre-telemetry DBs lack push_permission — retry without it so the user
    // list still loads (permission shows as "not asked" for everyone).
    if (isMissingColumnError(err)) {
      try {
        const { data, error } = await requireClient()
          .from('profiles')
          .select('id, username, stream, role, created_at')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        return mapRows((data ?? []) as Record<string, unknown>[]);
      } catch (retryErr) {
        if (retryErr instanceof CloudError) throw retryErr;
        throw friendlyError('Could not load user list.', retryErr);
      }
    }
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not load user list.', err);
  }
}

/** Per-student push subscription summary for the Admin Panel health view.
 *  Aggregated client-side from non-sensitive columns only — key material
 *  (p256dh/auth) and endpoint URLs are never selected. */
export interface PushDeviceSummary {
  userId: string;
  deviceCount: number;
  latestAt: string | null;
  userAgent: string | null;
}

/**
 * Load every student's subscription presence, admin-gated server-side.
 * Primary path is the get_push_admin_overview() RPC (aggregates only — key
 * material and endpoint URLs never leave the database). Unlike a raw table
 * SELECT, a missing setup fails LOUDLY here instead of RLS-filtering to an
 * empty list that the panel would misread as "nobody subscribed".
 * Falls back to the legacy direct select for databases that ran
 * migration_add_push_health.sql but not yet migration_add_push_admin_overview.sql.
 */
export async function fetchPushAdminOverview(): Promise<PushDeviceSummary[]> {
  try {
    const { data, error } = await requireClient().rpc('get_push_admin_overview');
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).flatMap((r) => {
      const uid = typeof r.user_id === 'string' ? r.user_id : String(r.user_id ?? '');
      if (!uid) return [];
      const n = Number(r.device_count ?? 0);
      return [
        {
          userId: uid,
          deviceCount: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0,
          latestAt: typeof r.latest_at === 'string' ? r.latest_at : null,
          // The RPC returns aggregates only (no per-device user agent).
          userAgent: null,
        },
      ];
    });
  } catch (err) {
    if (err instanceof CloudError) throw err;
    const { message, code } = describeError(err);
    // RPC not installed yet → legacy direct-select path (works once the
    // push_admin_read_all policy exists).
    if (code === 'PGRST202' || /could not find the function|function .* does not exist/i.test(message)) {
      return await fetchPushAdminOverviewDirect();
    }
    if (
      code === '42P01' ||
      /relation .* does not exist|could not find the table/i.test(message)
    ) {
      throw new CloudError(
        'Push overview is not available: the push_subscriptions table is missing. Please run supabase/migration_add_push_subscriptions.sql in the Supabase SQL Editor first, then supabase/migration_add_push_admin_overview.sql.'
      );
    }
    throw friendlyError('Could not load push overview.', err);
  }
}

/**
 * Legacy direct-select overview (works once the push_admin_read_all policy
 * exists). Kept as a fallback for databases that ran
 * migration_add_push_health.sql but not the newer overview migration.
 * NOTE: without that policy, RLS silently filters to the viewer's own rows
 * (no error) — an empty result here must never be mistaken for "nobody
 * subscribed", which is exactly the false display this RPC-first ordering
 * plus the Admin Panel migration banner guard against.
 */
async function fetchPushAdminOverviewDirect(): Promise<PushDeviceSummary[]> {
  try {
    const { data, error } = await requireClient()
      .from('push_subscriptions')
      .select('user_id, created_at, user_agent');
    if (error) throw error;
    const byUser = new Map<string, PushDeviceSummary>();
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      const uid = typeof r.user_id === 'string' ? r.user_id : String(r.user_id ?? '');
      if (!uid) continue;
      const cur = byUser.get(uid) ?? { userId: uid, deviceCount: 0, latestAt: null, userAgent: null };
      cur.deviceCount += 1;
      const created = typeof r.created_at === 'string' ? r.created_at : null;
      if (created && (!cur.latestAt || created > cur.latestAt)) {
        cur.latestAt = created;
        cur.userAgent = typeof r.user_agent === 'string' ? r.user_agent : cur.userAgent;
      }
      byUser.set(uid, cur);
    }
    return [...byUser.values()];
  } catch (err) {
    if (err instanceof CloudError) throw err;
    const { message, code } = describeError(err);
    if (
      code === '42P01' ||
      /relation .* does not exist|could not find the table/i.test(message)
    ) {
      throw new CloudError(
        'Push overview is not available: the push_subscriptions table is missing. Please run supabase/migration_add_push_subscriptions.sql in the Supabase SQL Editor first, then supabase/migration_add_push_admin_overview.sql.'
      );
    }
    if (/permission denied|policy|not allowed|unauthorized/i.test(message)) {
      throw new CloudError(
        'Push overview is not available: your database needs the push-admin update. Please run supabase/migration_add_push_admin_overview.sql in the Supabase SQL Editor first (it adds the overview function and the admin read policy).'
      );
    }
    throw friendlyError('Could not load push overview.', err);
  }
}

/** Live send-push pipeline state (dryRun sends NOTHING — diagnostics only). */
export interface SendPushDryRun {
  slTime: string;
  vapidConfigured: boolean;
  subscriptionRows: number;
  enabledSlotsToday: number;
  /** Which daily-quiz window is live right now (12:00 / 17:00 SL), if any. */
  quizSlotNow?: 'noon' | 'evening' | null;
  quizWindows?: string[];
}

/**
 * Ask the deployed send-push Edge Function for its live pipeline state.
 * Admin-gated server-side (403 for non-admins). Tells "subscribed but no
 * push" apart instantly: vapidConfigured=false → set the function secrets;
 * subscriptionRows=0 → nobody has a server row (client-side); both healthy
 * but enabledSlotsToday=0 → simply nothing due today.
 */
export async function fetchSendPushDryRun(): Promise<SendPushDryRun> {
  try {
    const { data, error } = await requireClient().functions.invoke('send-push', {
      body: { dryRun: true },
    });
    if (error) throw error;
    const r = (data ?? {}) as Record<string, unknown>;
    return {
      slTime: typeof r.slTime === 'string' ? r.slTime : '—',
      vapidConfigured: r.vapidConfigured === true,
      subscriptionRows: typeof r.subscriptionRows === 'number' ? r.subscriptionRows : 0,
      enabledSlotsToday: typeof r.enabledSlotsToday === 'number' ? r.enabledSlotsToday : 0,
      quizSlotNow: r.quizSlotNow === 'noon' || r.quizSlotNow === 'evening' ? r.quizSlotNow : null,
      quizWindows: Array.isArray(r.quizWindows) ? (r.quizWindows as string[]) : ['12:00', '17:00'],
    };
  } catch (err) {
    const { message } = describeError(err);
    if (/403|forbidden|not allowed|unauthorized/i.test(message)) {
      throw new CloudError('Pipeline check was refused (403): your account is not an admin, or the deployed send-push function predates the admin gate — redeploy it with `supabase functions deploy send-push`.');
    }
    if (err instanceof CloudError) throw err;
    throw friendlyError('Pipeline check failed (is the send-push function deployed and the 15-min cron scheduled?).', err);
  }
}

/**
 * Send one REAL closed-app push to a student's devices via the Edge Function
 * (admin only, 403 otherwise). Returns how many subscriptions accepted it.
 * 0 with subscribed devices = delivery failure (usually a VAPID public-key
 * mismatch between this frontend build and the function secrets).
 */
export async function invokeSendPushTest(userId: string): Promise<number> {
  try {
    const { data, error } = await requireClient().functions.invoke('send-push', {
      body: { testUserId: userId },
    });
    if (error) throw error;
    const n = Number((data as { sentToSubscriptions?: unknown } | null)?.sentToSubscriptions ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } catch (err) {
    const { message } = describeError(err);
    if (/403|forbidden|not allowed|unauthorized/i.test(message)) {
      throw new CloudError('Test push was refused (403): redeploy the send-push function with `supabase functions deploy send-push` so the admin gate exists.');
    }
    if (err instanceof CloudError) throw err;
    throw friendlyError('Test push failed.', err);
  }
}

/**
 * Probe whether the push-health migration has been applied to this database
 * (profiles.push_permission column present). Used by the Admin Panel to warn
 * instead of silently showing "Not asked" for everyone when telemetry has
 * nowhere to land. Never throws and never false-alarms on network errors:
 * any non-column error resolves to true (assume healthy).
 */
export async function checkPushHealthMigration(): Promise<{ pushPermissionColumn: boolean }> {
  try {
    const { error } = await requireClient().from('profiles').select('push_permission').limit(1);
    if (error && isMissingColumnError(error)) return { pushPermissionColumn: false };
    return { pushPermissionColumn: true };
  } catch {
    return { pushPermissionColumn: true };
  }
}

/** Save the student's study stream to their Supabase profile row.
 *  NOTE: this updates ONLY the stream column — role is never included, so
 *  there is no client path that can modify it. */
export async function updateProfileStream(userId: string, stream: string): Promise<void> {  try {
    const { error } = await requireClient()
      .from('profiles')
      .update({ stream })
      .eq('id', userId);
    if (error) {
      if (isMissingColumnError(error)) {
        throw new CloudError(
          'Study stream could not be saved: your database needs the stream update. Please run supabase/migration_add_stream_to_profiles.sql in the Supabase SQL Editor first.'
        );
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not save your stream.', err);
  }
}

/** Save the student's Physical Science elective to their Supabase profile.
 *  Same pattern as the stream: own row only, never touches role. */
export async function updateProfileElective(userId: string, elective: PhysicalElective): Promise<void> {  try {
    const { error } = await requireClient()
      .from('profiles')
      .update({ elective })
      .eq('id', userId);
    if (error) {
      if (isMissingColumnError(error)) {
        throw new CloudError(
          'Elective could not be saved: your database needs the elective update. Please run supabase/migration_add_elective_and_exam_date.sql in the Supabase SQL Editor first.'
        );
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not save your elective.', err);
  }
}

/** Save (or clear with null) the student's expected A/L exam date.
 *  Same pattern as stream/elective: own row only, never touches role. */
export async function updateProfileExamDate(userId: string, examDate: string | null): Promise<void> {
  const clean = examDate ? toExamDate(examDate) : null;
  if (examDate && !clean) throw new CloudError('Exam date must look like YYYY-MM-DD.');
  try {
    const { error } = await requireClient()
      .from('profiles')
      .update({ al_exam_date: clean })
      .eq('id', userId);
    if (error) {
      if (isMissingColumnError(error)) {
        throw new CloudError(
          'Exam date could not be saved: your database needs the exam-date update. Please run supabase/migration_add_elective_and_exam_date.sql in the Supabase SQL Editor first.'
        );
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not save your exam date.', err);
  }
}

/** Save the student's goal fields (Z-score + motivation note) to Supabase.
 *  Own row only, never touches role. Pass null/'' to clear a field. */
export async function updateProfileGoals(
  userId: string,
  goals: { targetZScore?: string | null; motivationNote?: string | null }
): Promise<void> {
  const patch: Record<string, string | null> = {};
  if (goals.targetZScore !== undefined) {
    const t = goals.targetZScore?.trim() ?? '';
    patch.target_z_score = t ? t.slice(0, 20) : null;
  }
  if (goals.motivationNote !== undefined) {
    const t = goals.motivationNote?.trim() ?? '';
    patch.motivation_note = t ? t.slice(0, 500) : null;
  }
  if (Object.keys(patch).length === 0) return;
  try {
    const { error } = await requireClient()
      .from('profiles')
      .update(patch)
      .eq('id', userId);
    if (error) {
      if (isMissingColumnError(error)) {
        throw new CloudError(
          'Goals could not be saved: your database needs the goals update. Please run supabase/migration_add_goals_to_profiles.sql in the Supabase SQL Editor first.'
        );
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not save your goals.', err);
  }
}

/** Save (or clear with null/'') the student's optional contact number.
 *  Stored info only — never auth/OTP/verification. Own row only, never
 *  touches role. Blank clears the field. */
export async function updateProfileMobileNumber(userId: string, mobileNumber: string | null): Promise<void> {
  const clean = toMobileNumber(mobileNumber);
  try {
    const { error } = await requireClient()
      .from('profiles')
      .update({ mobile_number: clean })
      .eq('id', userId);
    if (error) {
      if (isMissingColumnError(error)) {
        throw new CloudError(
          'Mobile number could not be saved: your database needs the mobile-number update. Please run supabase/migration_add_mobile_number_to_profiles.sql in the Supabase SQL Editor first.'
        );
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not save your mobile number.', err);
  }
}

/**
 * Silently report this device's live browser notification permission to the
 * student's own profile row (drives the Admin Panel health view). Background
 * telemetry: NEVER throws — returns false when the column is missing
 * (pre-migration DB), offline, or otherwise unsavable. Callers must not
 * surface any UI for this.
 */
export async function updateProfilePushPermission(userId: string, permission: PushPermission): Promise<boolean> {
  try {
    const { error } = await requireClient()
      .from('profiles')
      .update({ push_permission: permission })
      .eq('id', userId);
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ================= LOAD =================

export interface CloudStreak {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  completedDates: string[];
}

export interface CloudData {
  timetable: TimetableEntry[];
  tasks: DailyTask[];
  /** Null when the student has no topic rows in the cloud yet. */
  topics: SyllabusTopic[] | null;
  streak: CloudStreak | null;
  hasTimetable: boolean;
  hasTasks: boolean;
}

function mapTimetableRow(r: Record<string, unknown>): TimetableEntry {
  const rawBlock = (r.block_type as string) ?? (r as Record<string, unknown>).blockType;
  return {
    id: String(r.id),
    dayOfWeek: r.day_of_week as TimetableEntry['dayOfWeek'],
    subject: (r.subject as string) ?? '',
    topic: (r.topic as string) ?? '',
    blockType: rawBlock === 'revision' ? 'revision' : 'study',
    topicId: (r.topic_id as string) ?? undefined,
    subtopic: (r.subtopic as string) ?? undefined,
    targetProgress: (r.target_progress as number) ?? undefined,
    isCompleted: Boolean(r.is_completed),
    startTime: (r.start_time as string) ?? '16:00',
    endTime: (r.end_time as string) ?? '18:00',
    color: (r.color as string) ?? 'cyan',
    reminderEnabled: r.reminder_enabled !== false,
    reminderOffsetMinutes: ((r.reminder_offset_minutes as number) ?? 15) as TimetableEntry['reminderOffsetMinutes'],
    notes: (r.notes as string) ?? undefined,
    fromTaskId: (r.from_task_id as string) ?? undefined,
  };
}

function mapTaskRow(r: Record<string, unknown>): DailyTask {
  const rawBlock = (r.block_type as string) ?? (r as Record<string, unknown>).blockType;
  return {
    id: String(r.id),
    date: String(r.date),
    title: (r.title as string) ?? '',
    subject: (r.subject as string) ?? '',
    blockType: rawBlock === 'revision' ? 'revision' : 'study',
    topicId: (r.topic_id as string) ?? undefined,
    topicTitle: (r.topic_title as string) ?? undefined,
    subtopic: (r.subtopic as string) ?? undefined,
    targetProgress: (r.target_progress as number) ?? undefined,
    isCompleted: Boolean(r.is_completed),
    completedAt: (r.completed_at as string) ?? undefined,
    timeSlot: (r.time_slot as string) ?? undefined,
    startTime: (r.start_time as string) ?? undefined,
    endTime: (r.end_time as string) ?? undefined,
    estimatedMinutes: (r.estimated_minutes as number) ?? undefined,
    priority: ((r.priority as string) ?? 'Medium') as DailyTask['priority'],
    fromTimetableId: (r.from_timetable_id as string) ?? undefined,
  };
}

function mapTopicRow(r: Record<string, unknown>): SyllabusTopic {
  return {
    id: String(r.topic_id),
    subject: (r.subject as string) ?? '',
    unitNumber: (r.unit_number as number) ?? 0,
    unitTitle: (r.unit_title as string) ?? '',
    topicTitle: (r.topic_title as string) ?? '',
    subtopics: Array.isArray(r.subtopics) ? (r.subtopics as string[]) : [],
    completedSubtopics: Array.isArray(r.completed_subtopics) ? (r.completed_subtopics as string[]) : [],
    subtopicProgress: (r.subtopic_progress as Record<string, number>) ?? {},
    status: ((r.status as string) ?? 'not_started') as TopicStatus,
    notes: (r.notes as string) ?? undefined,
    isCustom: Boolean(r.is_custom),
  };
}

export async function loadCloudData(userId: string): Promise<CloudData> {
  const client = requireClient();
  try {
    const [ttRes, taskRes, topicRes, streakRes] = await Promise.all([
      client.from('timetable_entries').select('*').eq('user_id', userId),
      client.from('daily_tasks').select('*').eq('user_id', userId),
      client.from('topics').select('*').eq('user_id', userId),
      client.from('streaks').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    if (ttRes.error) throw ttRes.error;
    if (taskRes.error) throw taskRes.error;
    if (topicRes.error) throw topicRes.error;
    if (streakRes.error) throw streakRes.error;

    const ttRows = (ttRes.data ?? []) as Record<string, unknown>[];
    const taskRows = (taskRes.data ?? []) as Record<string, unknown>[];
    const topicRows = (topicRes.data ?? []) as Record<string, unknown>[];
    const sRow = streakRes.data as Record<string, unknown> | null;

    return {
      timetable: ttRows.map(mapTimetableRow),
      tasks: taskRows.map(mapTaskRow),
      topics: topicRows.length > 0 ? topicRows.map(mapTopicRow) : null,
      streak:
        sRow != null
          ? {
              currentStreak: (sRow.current_streak as number) ?? 0,
              longestStreak: (sRow.longest_streak as number) ?? 0,
              lastCompletedDate: (sRow.last_completed_date as string) ?? undefined,
              completedDates: Array.isArray(sRow.completed_dates)
                ? (sRow.completed_dates as string[])
                : [],
            }
          : null,
      hasTimetable: ttRows.length > 0,
      hasTasks: taskRows.length > 0,
    };
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not load your synced study data.', err);
  }
}

// ================= SAVE =================

async function upsertAndPrune(
  table: 'timetable_entries' | 'daily_tasks',
  userId: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  const client = requireClient();
  const ids = rows.map((r) => r.id as string);
  if (rows.length > 0) {
    const { error } = await client.from(table).upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  // Quote text IDs for the PostgREST `in=(...)` list so hyphens and other
  // characters in client-generated IDs can never break the prune query.
  const idList = ids.map((id) => `"${String(id).replace(/"/g, '""')}"`).join(',');
  if (ids.length > 0) {
    const { error } = await client.from(table).delete().eq('user_id', userId).not('id', 'in', `(${idList})`);
    if (error) throw error;
  } else {
    const { error } = await client.from(table).delete().eq('user_id', userId);
    if (error) throw error;
  }
}

export async function pushTimetable(userId: string, entries: TimetableEntry[]): Promise<void> {
  const withBlock = entries.map((e) => ({
    id: e.id,
    user_id: userId,
    day_of_week: e.dayOfWeek,
    subject: e.subject,
    topic: e.topic,
    block_type: e.blockType === 'revision' ? 'revision' : 'study',
    topic_id: e.topicId ?? null,
    subtopic: e.subtopic ?? null,
    target_progress: e.targetProgress ?? null,
    is_completed: e.isCompleted ?? false,
    start_time: e.startTime,
    end_time: e.endTime,
    color: e.color,
    reminder_enabled: e.reminderEnabled,
    reminder_offset_minutes: e.reminderOffsetMinutes,
    notes: e.notes ?? null,
    from_task_id: e.fromTaskId ?? null,
  }));
  try {
    await upsertAndPrune('timetable_entries', userId, withBlock);
  } catch (err) {
    // Pre-migration DBs lack block_type — retry without it so sync still works.
    if (isMissingColumnError(err)) {
      const fallback = withBlock.map(({ block_type: _drop, ...rest }) => rest);
      await upsertAndPrune('timetable_entries', userId, fallback);
      return;
    }
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not sync your timetable.', err);
  }
}

export async function pushTasks(userId: string, tasks: DailyTask[]): Promise<void> {
  const client = requireClient();
  const withBlock = tasks.map((t) => ({
    id: t.id,
    user_id: userId,
    date: t.date,
    title: t.title,
    subject: t.subject,
    block_type: t.blockType === 'revision' ? 'revision' : 'study',
    topic_id: t.topicId ?? null,
    topic_title: t.topicTitle ?? null,
    subtopic: t.subtopic ?? null,
    target_progress: t.targetProgress ?? null,
    is_completed: t.isCompleted,
    completed_at: t.completedAt ?? null,
    time_slot: t.timeSlot ?? null,
    start_time: t.startTime ?? null,
    end_time: t.endTime ?? null,
    estimated_minutes: t.estimatedMinutes ?? null,
    priority: t.priority,
    from_timetable_id: t.fromTimetableId ?? null,
  }));
  try {
    await upsertAndPrune('daily_tasks', userId, withBlock);

    // Maintain the per-day summary rows (daily_progress table).
    const byDate = new Map<string, { completed: number; total: number }>();
    for (const t of tasks) {
      const agg = byDate.get(t.date) ?? { completed: 0, total: 0 };
      agg.total += 1;
      if (t.isCompleted) agg.completed += 1;
      byDate.set(t.date, agg);
    }
    // Only keep recent history in the summary table (last 120 days with tasks).
    const recentDates = Array.from(byDate.keys()).sort().slice(-120);
    const summaryRows = recentDates.map((date) => ({
      user_id: userId,
      date,
      completed_count: byDate.get(date)?.completed ?? 0,
      total_count: byDate.get(date)?.total ?? 0,
    }));
    if (summaryRows.length > 0) {
      const { error } = await client.from('daily_progress').upsert(summaryRows, { onConflict: 'user_id,date' });
      if (error) throw error;
    }
    const { data: existing } = await client.from('daily_progress').select('date').eq('user_id', userId);
    const stale = ((existing ?? []) as { date: string }[])
      .map((r) => r.date)
      .filter((d) => !byDate.has(d));
    if (stale.length > 0) {
      await client.from('daily_progress').delete().eq('user_id', userId).in('date', stale);
    }
  } catch (err) {
    // Pre-migration DBs lack block_type — retry without it so sync still works.
    if (isMissingColumnError(err)) {
      const fallback = withBlock.map(({ block_type: _drop, ...rest }) => rest);
      try {
        await upsertAndPrune('daily_tasks', userId, fallback);
        return;
      } catch (retryErr) {
        if (retryErr instanceof CloudError) throw retryErr;
        throw friendlyError('Could not sync your daily tasks.', retryErr);
      }
    }
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not sync your daily tasks.', err);
  }
}

export async function pushTopics(userId: string, topics: SyllabusTopic[]): Promise<void> {
  try {
    const rows = topics
      .map((t) => ({
        user_id: userId,
        topic_id: t.id,
        subject: t.subject,
        unit_number: t.unitNumber,
        unit_title: t.unitTitle,
        topic_title: t.topicTitle,
        subtopics: t.subtopics ?? [],
        completed_subtopics: t.completedSubtopics ?? [],
        subtopic_progress: t.subtopicProgress ?? {},
        status: t.status,
        notes: t.notes ?? null,
        is_custom: t.isCustom ?? false,
        updated_at: new Date().toISOString(),
      }));
    const { error } = await requireClient().from('topics').upsert(rows, { onConflict: 'user_id,topic_id' });
    if (error) throw error;
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not sync your syllabus progress.', err);
  }
}

export async function pushStreak(
  userId: string,
  streak: { currentStreak: number; bestStreak: number; lastCompletedDate?: string; completedDates: string[] }
): Promise<void> {
  try {
    const { error } = await requireClient()
      .from('streaks')
      .upsert(
        {
          user_id: userId,
          current_streak: streak.currentStreak,
          longest_streak: streak.bestStreak,
          last_completed_date: streak.lastCompletedDate ?? null,
          completed_dates: streak.completedDates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not sync your study streak.', err);
  }
}

/** Revision habit counter stored on profiles.revision_count (separate stat). */
export async function fetchRevisionCount(userId: string): Promise<number | null> {
  try {
    const { data, error } = await requireClient()
      .from('profiles')
      .select('revision_count')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      if (isMissingColumnError(error)) return null; // pre-migration DB
      throw error;
    }
    const v = (data as { revision_count?: unknown } | null)?.revision_count;
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not load your revision count.', err);
  }
}

/** Persist the revision counter (additive only; never blocks the UI). */
export async function updateProfileRevisionCount(userId: string, count: number): Promise<void> {
  try {
    const { error } = await requireClient()
      .from('profiles')
      .update({ revision_count: Math.max(0, Math.floor(count)) })
      .eq('id', userId);
    if (error) {
      if (isMissingColumnError(error)) {
        throw new CloudError(
          'Revision count could not be saved: your database needs the revision update. Please run supabase/migration_add_revision_support.sql in the Supabase SQL Editor first.'
        );
      }
      throw error;
    }
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw friendlyError('Could not save your revision count.', err);
  }
}
