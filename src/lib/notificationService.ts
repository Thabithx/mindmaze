/**
 * Mind Maze Notification & Study Reminder Service
 */
import { TimetableEntry, DailyTask } from '../types';
import { generateSmartStudyReminder, generateDailyCountdown } from './notificationMessages';
import { getTodayDateString } from './storage';

const COUNTDOWN_SENT_KEY = 'mindmaze_countdown_sent_day';

let audioCtx: AudioContext | null = null;

export function playStudyChime(): void {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    // Synthesize a pleasant two-tone study chime: E5 -> B5
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.15); // B5
    gain2.gain.setValueAtTime(0.2, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);
  } catch (e) {
    console.warn('Audio chime playback failed:', e);
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn('Notification permission request error:', e);
    return Notification.permission;
  }
}

// ---------------------------------------------------------------------------
// Real Web Push subscription (free: browser vendor push service + VAPID).
// Call AFTER permission is granted. Reads the session internally so callers
// (e.g. NotificationPermissionModal) don't need prop drilling.
// Requires VITE_VAPID_PUBLIC_KEY in .env.
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/** Current VAPID public key as bytes; null when unconfigured/invalid. */
function getVapidKeyBytes(): Uint8Array | null {
  try {
    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!publicKey) return null;
    return urlBase64ToUint8Array(publicKey);
  } catch {
    return null;
  }
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * True when the subscription was minted with the CURRENT VAPID public key.
 * Some browsers hide applicationServerKey (null) — that counts as a match:
 * the subscription is kept and its server row is re-verified instead of
 * being destroyed on a guess.
 */
function subscriptionUsesCurrentKey(sub: PushSubscription, keyBytes: Uint8Array): boolean {
  try {
    const raw = (sub.options as PushSubscriptionOptions | undefined)?.applicationServerKey ?? null;
    if (!raw) return true;
    const existing = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBuffer);
    return bytesEqual(existing, keyBytes);
  } catch {
    return true;
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    isNotificationSupported()
  );
}

/**
 * Wait for the active service worker registration, but never hang forever.
 * `navigator.serviceWorker.ready` never resolves when no worker is
 * registered (e.g. registration failed, or DEV mode unregisters workers),
 * which used to freeze push subscribe/unsubscribe indefinitely.
 */
async function getReadyRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const reg = await Promise.race([ready, timeout]);
    if (reg) return reg;
    // Fallback: an installed-but-not-yet-controlling registration.
    return (await navigator.serviceWorker.getRegistration().catch(() => null)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribe this browser/device for closed-app push and save it to Supabase.
 * Safe to call repeatedly: reuses a healthy subscription and upserts.
 *
 * AUTO-HEALING: when the existing subscription was minted under a previous
 * VAPID public key (e.g. the key was rotated), the stale subscription is
 * unsubscribed, its server row deleted, and a fresh subscription created —
 * all silently, with no browser-settings trip for the student.
 * Returns true when a subscription is stored.
 */
export async function subscribeForPush(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const keyBytes = getVapidKeyBytes();
    if (!keyBytes) {
      console.warn('[Push] VITE_VAPID_PUBLIC_KEY is not set. Skipping push subscription.');
      return false;
    }

    const { supabase } = await import('./supabaseClient');
    if (!supabase) return false;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return false;

    // Ensure a worker is registered first (subscribe needs one; `ready`
    // alone hangs forever when registration failed, e.g. /sw.js 404).
    let reg = await getReadyRegistration();
    if (!reg) {
      reg = await registerServiceWorker();
    }
    if (!reg) {
      // DEV-only note: registerServiceWorker() deliberately stays
      // unregistered under `vite dev`, so the silent granted-repair below
      // can never succeed on localhost dev — verify it with a production
      // build (`npm run build` + `npm run preview`) instead.
      if (import.meta.env.DEV) {
        console.info('[Push] No service worker in DEV; skipping silent re-subscribe (expected — test with vite preview).');
      }
      return false;
    }

    // Drop a stale subscription from before a VAPID key rotation: pushes to
    // it can never be delivered, and subscribing while it exists throws.
    let sub = await reg.pushManager.getSubscription();
    if (sub && !subscriptionUsesCurrentKey(sub, keyBytes)) {
      const staleEndpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => undefined);
      try {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', staleEndpoint);
      } catch {
        // Row cleanup is best-effort; the server also prunes dead
        // endpoints on 404/410 during sends.
      }
      sub = null;
    }

    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        });
      } catch (subErr) {
        // Racy stale state (e.g. InvalidStateError: a subscription exists
        // that getSubscription didn't see): clear once and retry a single
        // time before giving up.
        try {
          const ghost = await reg.pushManager.getSubscription();
          if (ghost) {
            const ghostEndpoint = ghost.endpoint;
            await ghost.unsubscribe().catch(() => undefined);
            await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', ghostEndpoint);
          }
        } catch {
          // Best-effort only — fall through to the single retry below.
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        });
      }
    }

    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const authKey = json.keys?.auth;
    if (!p256dh || !authKey) return false;

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth: authKey,
        user_agent: navigator.userAgent,
      },
      { onConflict: 'user_id,endpoint' }
    );
    if (error) {
      console.warn('[Push] Failed to save subscription:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Push] subscribeForPush failed:', err);
    return false;
  }
}

/**
 * Best-effort cleanup for revoked/denied permission.
 * If the browser permission is no longer granted but a push subscription for
 * this device still exists (e.g. the student revoked it in browser settings),
 * unsubscribe it and delete its row so the server stops sending dead pushes.
 * No-op when permission is still granted or no subscription exists.
 */
export async function cleanupStalePushSubscription(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    if (Notification.permission === 'granted') return;
    const reg = await getReadyRegistration(2000);
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => undefined);
    const { supabase } = await import('./supabaseClient');
    if (!supabase) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch (err) {
    console.warn('[Push] cleanupStalePushSubscription failed:', err);
  }
}

/**
 * Remove this device's push subscription (call on logout / settings opt-out).
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    const reg = await getReadyRegistration(2000);
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    const endpoint = sub?.endpoint;
    if (sub) await sub.unsubscribe().catch(() => undefined);
    if (!endpoint) return;
    const { supabase } = await import('./supabaseClient');
    if (!supabase) return;
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } catch (err) {
    console.warn('[Push] unsubscribeFromPush failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Shared "ask again later" snooze for every Enable-reminders prompt.
// The floating PushSubscribeBanner AND the Dashboard banner share ONE snooze
// key, so dismissing either one silences both for 7 days — students are never
// double-nagged, and never nagged on every app open. Bumping the key suffix
// re-prompts everyone exactly once after major notification upgrades.
// A same-tab window event keeps both banners in sync without a reload.
// ---------------------------------------------------------------------------

const PUSH_PROMPT_SNOOZE_KEY = 'mindmaze_push_banner_dismissed_v2';
const BLOCKED_PROMPT_SNOOZE_KEY = 'mindmaze_blocked_banner_dismissed_v1';
const PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const PUSH_PROMPT_SNOOZED_EVENT = 'mindmaze:push-prompt-snoozed';

function readSnooze(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    return Date.now() - Number(raw) < PROMPT_SNOOZE_MS;
  } catch {
    return false;
  }
}

function writeSnooze(key: string): void {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
  try {
    window.dispatchEvent(new Event(PUSH_PROMPT_SNOOZED_EVENT));
  } catch {}
}

/** True when the "turn on reminders" prompt was dismissed in the last 7 days. */
export function isPushPromptSnoozed(): boolean {
  return readSnooze(PUSH_PROMPT_SNOOZE_KEY);
}

/** Snooze the "turn on reminders" prompt for 7 days (both banners listen). */
export function snoozePushPrompt(): void {
  writeSnooze(PUSH_PROMPT_SNOOZE_KEY);
}

/** True when the "reminders are blocked" prompt was dismissed in the last 7 days. */
export function isBlockedPromptSnoozed(): boolean {
  return readSnooze(BLOCKED_PROMPT_SNOOZE_KEY);
}

/** Snooze the "reminders are blocked" prompt for 7 days. */
export function snoozeBlockedPrompt(): void {
  writeSnooze(BLOCKED_PROMPT_SNOOZE_KEY);
}

// ---------------------------------------------------------------------------
// Real per-device push status. Settings used to show "Enabled" from
// Notification.permission alone — a student could look fully subscribed while
// having NO push subscription row (VAPID key missing in the production build,
// service worker failed, silent subscribe failure) and closed-app pushes
// would never arrive. This reports the actual device state so the UI can show
// "Not connected — reason + Reconnect" instead of a false green tick.
// ---------------------------------------------------------------------------

export type LocalPushState =
  | 'active'
  | 'unsupported'
  | 'no-permission'
  | 'no-key'
  | 'no-service-worker'
  | 'not-subscribed'
  | 'not-synced'
  | 'unknown';

/** True when a VAPID public key was baked into this build. Missing in a
 *  production build (e.g. Vercel env var unset) = subscribe always fails. */
export function isVapidKeyConfigured(): boolean {
  try {
    return !!((import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '').trim();
  } catch {
    return false;
  }
}

/**
 * Inspect this device's real closed-app push state. Never throws.
 * 'active' means a live subscription exists AND its server row is present.
 */
export async function getLocalPushState(): Promise<LocalPushState> {
  try {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission !== 'granted') return 'no-permission';
    if (!isVapidKeyConfigured()) return 'no-key';
    const reg = await getReadyRegistration(3000);
    if (!reg) return 'no-service-worker';
    const sub = await reg.pushManager.getSubscription().catch(() => null);
    if (!sub) return 'not-subscribed';
    // Subscription exists locally — is its row on the server? (Owner RLS
    // policy lets a signed-in student read their own rows.)
    try {
      const { supabase } = await import('./supabaseClient');
      if (!supabase) return 'unknown';
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) return 'not-synced';
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint')
        .eq('user_id', userData.user.id)
        .eq('endpoint', sub.endpoint)
        .maybeSingle();
      if (error) return 'unknown';
      return data ? 'active' : 'not-synced';
    } catch {
      return 'unknown';
    }
  } catch {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Silent background health check. Runs on app load / sign-in and (throttled)
// when the tab regains focus. Never shows UI and never throws — students who
// never granted permission keep seeing the existing Enable prompts as before.
// ---------------------------------------------------------------------------

export type PushHealthStatus = 'healthy' | 'unavailable' | 'skipped' | 'cleaned' | 'unsupported';

/** Minimum gap between background heal passes (explicit sign-in always heals). */
const HEAL_THROTTLE_MS = 5 * 60 * 1000;
let lastHealAt = 0;

/** Last permission value reported to the profile (avoids an UPDATE per load). */
const PERM_REPORT_KEY = 'mindmaze_push_perm_reported';

/**
 * Report this device's live browser permission to the student's profile row
 * (Admin Panel health view). Silent telemetry: skips when signed out or
 * already reported; never throws.
 */
async function reportPushPermissionToProfile(perm: 'granted' | 'denied' | 'default' | 'unsupported'): Promise<void> {
  try {
    try {
      if (localStorage.getItem(PERM_REPORT_KEY) === perm) return;
    } catch {
      // Storage unavailable — still attempt the report.
    }
    const { supabase } = await import('./supabaseClient');
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) return;
    const { updateProfilePushPermission } = await import('./cloudStore');
    const saved = await updateProfilePushPermission(data.user.id, perm);
    if (saved) {
      try {
        localStorage.setItem(PERM_REPORT_KEY, perm);
      } catch {}
    }
  } catch {
    // Telemetry must never interrupt the student.
  }
}

/**
 * Ensure this device can receive closed-app push, healing silently:
 * - permission granted → report 'granted' immediately, then drop
 *   VAPID-stale subscriptions and (re)subscribe when the server row is
 *   missing. Throttled unless forced.
 * - permission denied → report 'denied' immediately, then drop any dead
 *   subscription row.
 * - permission default (never asked) → report 'default' so the Admin Panel
 *   can tell a current client apart from an old/never-reporting one, then
 *   do nothing else; existing Enable prompts keep showing as before.
 * - push unsupported → report 'unsupported', nothing else to do.
 *
 * The permission report always fires BEFORE the slower subscription/SW
 * handshake: the profile UPDATE is cheap and must not wait behind (or be
 * lost with) work that can take seconds or be cut off by a tab close.
 */
export async function ensureHealthyPushSubscription(options?: { force?: boolean }): Promise<PushHealthStatus> {
  try {
    if (!isPushSupported()) {
      void reportPushPermissionToProfile('unsupported');
      return 'unsupported';
    }
    const perm = Notification.permission;
    if (perm === 'granted') {
      void reportPushPermissionToProfile('granted');
      const now = Date.now();
      if (!options?.force && now - lastHealAt < HEAL_THROTTLE_MS) return 'skipped';
      lastHealAt = now;
      const ok = await subscribeForPush();
      return ok ? 'healthy' : 'unavailable';
    }
    if (perm === 'denied') {
      void reportPushPermissionToProfile('denied');
      await cleanupStalePushSubscription();
      return 'cleaned';
    }
    void reportPushPermissionToProfile('default');
    return 'skipped';
  } catch {
    return 'unavailable';
  }
}

/**
 * Listen for subscription-rotation notices from the service worker
 * (pushsubscriptionchange). Re-subscribes so push_subscriptions keeps the
 * fresh endpoint. Call once at app startup.
 */
export function listenForPushSubscriptionChange(): void {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'PUSH_SUBSCRIPTION_CHANGE') {
        if (Notification.permission === 'granted') {
          void subscribeForPush().catch(() => undefined);
        }
      }
    });
  } catch (err) {
    console.warn('[Push] listenForPushSubscriptionChange failed:', err);
  }
}

/**
 * Register Service Worker if available.
 * Production only: registering during local development would let the worker
 * serve stale cached shells and block Vite's dev server / HMR traffic, so in
 * DEV we unregister any leftover workers and stay unregistered.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    if (import.meta.env.DEV) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(
        (regs ?? []).map((reg) => reg.unregister().catch(() => false))
      );
      return null;
    }
  } catch (err) {
    console.warn('Service worker dev cleanup failed:', err);
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Trigger a native system notification with fallback to audio chime
 */
export async function sendStudyNotification(
  title: string,
  body: string,
  icon = '/icon-192.png',
  tag = 'mind-maze-study-reminder',
  url = '/'
): Promise<boolean> {
  // Always play gentle chime
  playStudyChime();

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Prefer the service worker so the notification also works when the tab
    // is backgrounded and so taps route via the worker's notificationclick
    // handler. NOTE: getRegistration() alone returns null on pages the worker
    // doesn't control yet (first load after install), so wait on `ready`
    // (bounded — it never resolves without a registration) instead.
    if ('serviceWorker' in navigator) {
      const reg = await getReadyRegistration();
      if (reg) {
        try {
          await reg.showNotification(title, {
            body,
            icon,
            badge: '/icon-192.png',
            tag,
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url },
          } as NotificationOptions);
          return true;
        } catch (swErr) {
          // Fall through to the plain Notification fallback below.
          console.warn('Service worker showNotification failed, falling back:', swErr);
        }
      }
    }

    // Fallback to standard web notification
    new Notification(title, {
      body,
      icon,
      badge: '/icon-192.png',
      tag,
    });
    return true;
  } catch (err) {
    console.warn('Failed to dispatch notification:', err);
    return false;
  }
}

// Track alerted slot IDs so we don't spam duplicate alerts within the same minute
const alertedSlotIds = new Set<string>();

/**
 * Send the daily A/L countdown notification once each morning.
 *
 * Respects the existing setup: skipped entirely when notifications aren't
 * granted, outside 8:00–22:00 quiet hours, when no exam date is set, or
 * when the exam has passed. One send per calendar day max.
 */
export function maybeSendDailyCountdown(
  examDateStr: string | null | undefined,
  motivationNote?: string | null
): { sent: boolean; message?: string } {
  if (!examDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(examDateStr)) {
    return { sent: false };
  }
  const [y, m, d] = examDateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  if (Number.isNaN(target.getTime())) return { sent: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((target.getTime() - today.getTime()) / 86400000);
  // Exam passed (yesterday or earlier) — nothing to count down to.
  if (daysLeft < 0) return { sent: false };

  // Morning send at/after 8 AM, never in quiet hours (10 PM - 8 AM).
  const hour = new Date().getHours();
  if (hour < 8 || hour >= 22) return { sent: false };

  // Permission gate — same requirement as every other notification.
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return { sent: false };
  }

  // Once per calendar day.
  const todayStr = getTodayDateString();
  try {
    if (localStorage.getItem(COUNTDOWN_SENT_KEY) === todayStr) {
      return { sent: false };
    }
  } catch {
    return { sent: false };
  }

  const msg = generateDailyCountdown({ daysLeft, motivationNote });
  if (!msg) return { sent: false };

  void sendStudyNotification(msg.title, msg.body, '/icon-192.png', 'mind-maze-countdown');
  try {
    localStorage.setItem(COUNTDOWN_SENT_KEY, todayStr);
  } catch {}
  return { sent: true, message: `${msg.title}: ${msg.body}` };
}

/**
 * Check timetable entries against current local time and trigger smart contextual reminders
 */
export function checkTimetableReminders(
  entries: TimetableEntry[],
  currentDay: TimetableEntry['dayOfWeek'],
  options?: {
    dailyTasks?: DailyTask[];
    currentStreak?: number;
    onReminderTriggered?: (entry: TimetableEntry, msg: string) => void;
  }
): void {
  const now = new Date();
  const currentMinutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  const todayStr = getTodayDateString();

  const dailyTasks = options?.dailyTasks || [];
  const currentStreak = options?.currentStreak ?? 0;
  const todayTasks = dailyTasks.filter((t) => t.date === todayStr);
  const totalTodayTasks = todayTasks.length;
  const completedTodayTasks = todayTasks.filter((t) => t.isCompleted).length;
  const remainingTodayTasks = totalTodayTasks - completedTodayTasks;

  for (const entry of entries) {
    if (!entry.reminderEnabled) continue;
    if (entry.dayOfWeek !== currentDay) continue;

    const [startH, startM] = entry.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    // Calculate target reminder time in minutes
    const reminderTargetMinutes = startMinutes - (entry.reminderOffsetMinutes || 0);

    // If current time matches within 1-minute window
    if (Math.abs(currentMinutesSinceMidnight - reminderTargetMinutes) <= 1) {
      const alertKey = `${entry.id}-${now.toDateString()}-${reminderTargetMinutes}`;
      if (!alertedSlotIds.has(alertKey)) {
        alertedSlotIds.add(alertKey);

        const timeContext =
          entry.reminderOffsetMinutes === 0
            ? 'Starting right now'
            : `Starting in ${entry.reminderOffsetMinutes} minutes (${entry.startTime} - ${entry.endTime})`;

        // Generate contextual, motivational reminder message
        const smartMsg = generateSmartStudyReminder({
          subject: entry.subject,
          topicTitle: entry.topic,
          subtopic: entry.subtopic,
          timeContext,
          currentStreak,
          totalTodayTasks,
          completedTodayTasks,
          remainingTodayTasks,
          currentHour: now.getHours(),
        });

        sendStudyNotification(smartMsg.title, smartMsg.body);

        if (options?.onReminderTriggered) {
          options.onReminderTriggered(entry, `${smartMsg.title}: ${smartMsg.body}`);
        }
      }
    }
  }
}
