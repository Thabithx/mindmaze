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

async function getReadyRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const reg = await Promise.race([ready, timeout]);
    if (reg) return reg;
    return (await navigator.serviceWorker.getRegistration().catch(() => null)) ?? null;
  } catch {
    return null;
  }
}

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

    let reg = await getReadyRegistration();
    if (!reg) {
      reg = await registerServiceWorker();
    }
    if (!reg) {
      // DEV-only note: registerServiceWorker() deliberately stays
      if (import.meta.env.DEV) {
        console.info('[Push] No service worker in DEV; skipping silent re-subscribe (expected — test with vite preview).');
      }
      return false;
    }

    let sub = await reg.pushManager.getSubscription();
    if (sub && !subscriptionUsesCurrentKey(sub, keyBytes)) {
      const staleEndpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => undefined);
      try {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', staleEndpoint);
      } catch {
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
        try {
          const ghost = await reg.pushManager.getSubscription();
          if (ghost) {
            const ghostEndpoint = ghost.endpoint;
            await ghost.unsubscribe().catch(() => undefined);
            await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', ghostEndpoint);
          }
        } catch {
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

export function isPushPromptSnoozed(): boolean {
  return readSnooze(PUSH_PROMPT_SNOOZE_KEY);
}

export function snoozePushPrompt(): void {
  writeSnooze(PUSH_PROMPT_SNOOZE_KEY);
}

export function isBlockedPromptSnoozed(): boolean {
  return readSnooze(BLOCKED_PROMPT_SNOOZE_KEY);
}

export function snoozeBlockedPrompt(): void {
  writeSnooze(BLOCKED_PROMPT_SNOOZE_KEY);
}


export type LocalPushState =
  | 'active'
  | 'unsupported'
  | 'no-permission'
  | 'no-key'
  | 'no-service-worker'
  | 'not-subscribed'
  | 'not-synced'
  | 'unknown';

export function isVapidKeyConfigured(): boolean {
  try {
    return !!((import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || '').trim();
  } catch {
    return false;
  }
}

export async function getLocalPushState(): Promise<LocalPushState> {
  try {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission !== 'granted') return 'no-permission';
    if (!isVapidKeyConfigured()) return 'no-key';
    const reg = await getReadyRegistration(3000);
    if (!reg) return 'no-service-worker';
    const sub = await reg.pushManager.getSubscription().catch(() => null);
    if (!sub) return 'not-subscribed';
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


export type PushHealthStatus = 'healthy' | 'unavailable' | 'skipped' | 'cleaned' | 'unsupported';

const HEAL_THROTTLE_MS = 5 * 60 * 1000;
let lastHealAt = 0;

const PERM_REPORT_KEY = 'mindmaze_push_perm_reported';

async function reportPushPermissionToProfile(perm: 'granted' | 'denied' | 'default' | 'unsupported'): Promise<void> {
  try {
    if (localStorage.getItem(PERM_REPORT_KEY) === perm) return;
    localStorage.setItem(PERM_REPORT_KEY, perm);
  } catch {}
}

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

const alertedSlotIds = new Set<string>();

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
  if (daysLeft < 0) return { sent: false };

  const hour = new Date().getHours();
  if (hour < 8 || hour >= 22) return { sent: false };

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return { sent: false };
  }

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
