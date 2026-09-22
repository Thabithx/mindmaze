
export type AuthAction = 'signin' | 'signup' | 'forgot' | 'resend';

const MIN_GAP_SECONDS: Record<AuthAction, number> = {
  signin: 8,
  signup: 15,
  forgot: 60,
  resend: 60,
};

const DEFAULT_LOCK_SECONDS = 60;

const KEY_PREFIX = 'mindmaze_auth_cooldown_';

function keyFor(action: AuthAction): string {
  return `${KEY_PREFIX}${action}`;
}

function nowMs(): number {
  return Date.now();
}

function readExpiry(action: AuthAction): number {
  try {
    const raw = localStorage.getItem(keyFor(action));
    const ms = raw ? Number(raw) : 0;
    return Number.isFinite(ms) ? ms : 0;
  } catch {
    return 0;
  }
}

export function getCooldownRemaining(action: AuthAction): number {
  const left = Math.ceil((readExpiry(action) - nowMs()) / 1000);
  return left > 0 ? left : 0;
}

function setExpiry(action: AuthAction, seconds: number): void {
  try {
    localStorage.setItem(keyFor(action), String(nowMs() + seconds * 1000));
  } catch {
  }
}

export function recordAttempt(action: AuthAction): void {
  if (getCooldownRemaining(action) <= 0) {
    setExpiry(action, MIN_GAP_SECONDS[action]);
  }
}

export function recordRateLimit(action: AuthAction, seconds?: number): void {
  const wait = Math.max(1, Math.min(600, Math.round(seconds ?? DEFAULT_LOCK_SECONDS)));
  setExpiry(action, wait);
}

export function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('too many') ||
    lower.includes('over_request') ||
    lower.includes('over_email') ||
    lower.includes('over_sms') ||
    lower.includes('too many requests') ||
    /for security purposes.*after \d+ second/i.test(message) ||
    /you can only request this after/i.test(lower) ||
    /please wait.*before retrying/i.test(lower)
  );
}

export function isEmailRateLimit(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('email rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    (lower.includes('rate limit') && lower.includes('email')) ||
    (lower.includes('email') && lower.includes('send'))
  );
}

export function parseWaitSeconds(message: string): number | null {
  const lower = message.toLowerCase();
  const m = lower.match(/after\s+(\d+)\s*second/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 3600) return n;
  }
  if (/after a minute|wait a minute|one minute/i.test(message)) return 60;
  return null;
}

export function rateLimitMessage(message: string, fallbackWait = DEFAULT_LOCK_SECONDS): string {
  const wait = parseWaitSeconds(message) ?? fallbackWait;
  if (isEmailRateLimit(message)) {
    return (
      `Email limit reached — we've already sent emails for this address. ` +
      `Check your inbox and spam folder, then try again in ${wait}s. ` +
      `Asking again right away makes the wait longer.`
    );
  }
  return (
    `Too many attempts. For your security, please wait ${wait}s and try again. ` +
    `Retrying sooner resets the wait.`
  );
}

export function cooldownMessage(action: AuthAction): string {
  const left = getCooldownRemaining(action);
  if (action === 'forgot' || action === 'resend') {
    return (
      `A reset email was just sent. Check your inbox and spam folder — ` +
      `you can request another in ${left}s.`
    );
  }
  return `Please wait ${left}s before trying again — retrying sooner extends the lockout.`;
}
