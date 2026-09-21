import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  checkUsernameAvailable,
  createProfile,
  pushTopics,
  validateUsernameFormat,
  toExamDate,
  toMobileNumber,
  isMobileNumberPlausible,
  CloudError,
} from '../../lib/cloudStore';
import { getUserSettings, saveUserSettings } from '../../lib/storage';
import { buildCompletedTopicsFromIds } from '../../lib/syllabusProgression';
import { CompletedTopicsPicker } from './CompletedTopicsPicker';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Send,
} from 'lucide-react';
import {
  AuthAction,
  cooldownMessage,
  getCooldownRemaining,
  isRateLimitError,
  parseWaitSeconds,
  rateLimitMessage,
  recordAttempt,
  recordRateLimit,
} from '../../lib/authRateLimit';

export type AuthView = 'signin' | 'signup' | 'forgot' | 'check-email' | 'username' | 'update-password';

interface SupabaseAuthProps {
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  /** Called when the student is fully authenticated AND has a username. */
  onAuthReady?: (username: string) => void;
  /** Compact card style for embedding; default is a full-screen gate. */
  variant?: 'fullscreen' | 'card';
  /** Pre-selected stream (e.g. tapped on the landing page). Empty = must choose. */
  initialStream?: 'Physical Science' | 'Biological Science' | null;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('duplicate')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email first — check your inbox for the confirmation link.';
  }
  if (isRateLimitError(message)) {
    return rateLimitMessage(message);
  }
  if (/network|fetch|failed/i.test(message)) {
    return 'Network error. Check your connection and try again.';
  }
  return message;
}

const inputClass =
  'w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors';

export const SupabaseAuth: React.FC<SupabaseAuthProps> = ({ view, onViewChange, onAuthReady, variant = 'fullscreen', initialStream = null }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  // Bumped once per second while any auth cooldown is active so the
  // "try again in Ns" labels count down live.
  const [cooldownTick, setCooldownTick] = useState(0);

  // Live countdown while a cooldown lock is active. The interval only runs
  // when at least one action is locked, so idle pages pay nothing.
  useEffect(() => {
    const anyLocked = (
      ['signin', 'signup', 'forgot', 'resend'] as AuthAction[]
    ).some((a) => getCooldownRemaining(a) > 0);
    if (!anyLocked) return;
    const timer = setTimeout(() => setCooldownTick((t) => t + 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownTick, busy, errorMsg, infoMsg, view]);
  // Stream is REQUIRED at sign-up: nothing is pre-selected unless the
  // student tapped a stream on the landing page (initialStream prop).
  // Physical Science unlocks the Chemistry / ICT elective choice below.
  const [stream, setStream] = useState<'' | 'Physical Science' | 'Biological Science'>(
    initialStream ?? ''
  );
  const [elective, setElective] = useState<'Chemistry' | 'ICT'>(() => {
    try {
      return getUserSettings().physicalScienceElective === 'ICT' ? 'ICT' : 'Chemistry';
    } catch {
      return 'Chemistry';
    }
  });

  // Landing-page stream taps arriving after mount are honoured.
  useEffect(() => {
    if (initialStream) setStream(initialStream);
  }, [initialStream]);
  // Optional extras: expected A/L date (drives the Dashboard countdown)
  // and topics already completed (seed the Topic Tracker accurately).
  // Both are skippable — blank means "not set / starting from scratch".
  const [examDate, setExamDate] = useState('');
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  // Combined Goals step (also optional): Z-score target + motivation note.
  const [targetZScore, setTargetZScore] = useState('');
  const [motivationNote, setMotivationNote] = useState('');
  // Optional contact number — stored info only, never auth/OTP/verification.
  // Skippable: blank (or imperfect) input never blocks sign-up.
  const [mobileNumber, setMobileNumber] = useState('');

  if (!supabase) {
    return (
      <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold">
        Cloud sign-in is not configured on this device. Your study data is saved locally only.
      </div>
    );
  }
  const client = supabase;

  const fail = (err: unknown, action?: AuthAction) => {
    if (err instanceof CloudError) {
      setErrorMsg(err.userMessage);
    } else if (err instanceof Error) {
      if (action && isRateLimitError(err.message)) {
        // Server-side 429: lock this action so instant retries can't extend
        // the sliding-window ban, and show a live countdown instead.
        recordRateLimit(action, parseWaitSeconds(err.message) ?? 60);
        setCooldownTick((t) => t + 1); // restart the countdown ticker
      }
      setErrorMsg(friendlyAuthError(err.message));
    } else {
      setErrorMsg('Something went wrong. Please try again.');
    }
    setBusy(false);
  };

  /** Client-side guard: block attempts still inside the cooldown window. */
  const blockedByCooldown = (action: AuthAction): boolean => {
    if (getCooldownRemaining(action) > 0) {
      setErrorMsg(cooldownMessage(action));
      return true;
    }
    return false;
  };

  const persistStreamChoice = () => {
    if (!stream) return;
    try {
      saveUserSettings({ stream, physicalScienceElective: elective });
    } catch {}
  };

  /** Persist the optional A/L exam date locally (profile row gets it too). */
  const persistExamDateChoice = () => {
    const clean = toExamDate(examDate);
    if (!clean) return;
    try {
      saveUserSettings({ targetExamDate: clean });
    } catch {}
  };

  /** Persist the optional Goals step locally (profile row gets it too). */
  const persistGoalsChoice = () => {
    try {
      const patch: { targetZScore?: string; motivationNote?: string } = {};
      if (targetZScore.trim()) patch.targetZScore = targetZScore.trim().slice(0, 20);
      if (motivationNote.trim()) patch.motivationNote = motivationNote.trim().slice(0, 500);
      if (Object.keys(patch).length > 0) saveUserSettings(patch);
    } catch {}
  };

  /** Persist the optional contact number locally (profile row gets it too). */
  const persistMobileChoice = () => {
    try {
      const clean = toMobileNumber(mobileNumber);
      if (clean) saveUserSettings({ mobileNumber: clean });
    } catch {}
  };

  // ---------- Sign up: email + password + unique username + stream/elective ----------
  // Stream is chosen here (Physical Science reveals the Chemistry / ICT
  // elective). After signing in, stream stays editable in profile Settings.
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (blockedByCooldown('signup')) return;

    const nameError = validateUsernameFormat(username);
    if (nameError) {
      setErrorMsg(nameError);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!stream) {
      setErrorMsg('Please select your A/L stream to continue.');
      return;
    }

    setBusy(true);
    recordAttempt('signup');
    try {
      // 1. Username must be unique — check before creating the auth user.
      const available = await checkUsernameAvailable(username);
      if (!available) {
        setErrorMsg('Username already taken. Please choose another one.');
        setBusy(false);
        return;
      }

      // 2. Create the auth user. emailRedirectTo sends the verification
      //    link back to our /confirmed screen (must be allow-listed under
      //    Authentication → URL Configuration → Redirect URLs).
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/confirmed` },
      });
      if (error) throw error;
      const user = data.user;
      if (!user) {
        setErrorMsg('Could not create your account. Please try again.');
        setBusy(false);
        return;
      }

      // 3. Store the chosen username linked to the new user id.
      //    With "Confirm email" OFF, sign-up returns a session immediately,
      //    so the profile is created right here. (If confirmation is ever
      //    re-enabled there is no session yet — the profile is created on
      //    first login instead; see the check-email fallback below and the
      //    username setup view.)
      persistStreamChoice();
      persistExamDateChoice();
      persistGoalsChoice();
      persistMobileChoice();
      if (data.session) {
        try {
          // Stream + elective + exam date + goals + contact number are part
          // of sign-up and go to the Supabase profile row (also saved
          // locally above). Mobile is optional contact info only — never
          // auth/OTP — and never blocks sign-up when blank or imperfect.
          await createProfile(
            user.id,
            username,
            stream,
            elective,
            toExamDate(examDate),
            targetZScore.trim() || null,
            motivationNote.trim() || null,
            toMobileNumber(mobileNumber)
          );
          // Seed already-completed topics so the Tracker starts accurately.
          // Non-fatal: sign-up still succeeds if this sync fails.
          if (completedTopicIds.length > 0) {
            try {
              await pushTopics(user.id, buildCompletedTopicsFromIds(completedTopicIds));
            } catch (topicsErr) {
              console.warn('Initial topics sync failed:', topicsErr);
            }
          }
        } catch (profileErr) {
          // Rare race: someone grabbed the name in between. Sign out so a
          // clean retry is possible, and explain clearly.
          await client.auth.signOut();
          fail(profileErr, 'signup');
          return;
        }
        setBusy(false);
        onAuthReady?.(username.trim());
      } else if (data.user && (data.user.identities?.length ?? 1) === 0) {
        // "Confirm email" OFF + this email is already registered: Supabase
        // returns an empty-identities user with no session instead of an
        // error (anti-enumeration). Send the student to sign in.
        setBusy(false);
        setErrorMsg('An account with this email already exists. Try signing in instead.');
        onViewChange('signin');
      } else {
      // Fallback for when "Confirm email" is re-enabled: no session yet.
      // Keep the pending username + stream + elective + exam date + goals +
      // mobile number + completed topics so first login can claim them
      // automatically on this device (see App loadCloudForUser).
      try {
        localStorage.setItem('mindmaze_pending_username', username.trim());
        localStorage.setItem('mindmaze_pending_stream', stream);
        localStorage.setItem('mindmaze_pending_elective', elective);
        const cleanDate = toExamDate(examDate);
        if (cleanDate) localStorage.setItem('mindmaze_pending_exam_date', cleanDate);
        if (targetZScore.trim()) localStorage.setItem('mindmaze_pending_zscore', targetZScore.trim().slice(0, 20));
        if (motivationNote.trim()) {
          localStorage.setItem('mindmaze_pending_note', motivationNote.trim().slice(0, 500));
        }
        const cleanMobile = toMobileNumber(mobileNumber);
        if (cleanMobile) localStorage.setItem('mindmaze_pending_mobile', cleanMobile);
        if (completedTopicIds.length > 0) {
          localStorage.setItem('mindmaze_pending_topics', JSON.stringify(completedTopicIds));
        }
      } catch {}
        setBusy(false);
        onViewChange('check-email');
      }
    } catch (err) {
      fail(err, 'signup');
    }
  };

  // ---------- Sign in: email + password ----------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (blockedByCooldown('signin')) return;
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }
    setBusy(true);
    recordAttempt('signin');
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // Session listener in App takes over from here (loads profile + data).
      setBusy(false);
    } catch (err) {
      fail(err, 'signin');
    }
  };

  // ---------- Forgot password ----------
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (blockedByCooldown('forgot')) return;
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter your account email above first.');
      return;
    }
    setBusy(true);
    recordAttempt('forgot');
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setBusy(false);
      setInfoMsg(`If an account exists for ${email.trim()}, a password reset link is on its way. Check your inbox (and spam folder).`);
    } catch (err) {
      fail(err, 'forgot');
    }
  };

  // ---------- Resend verification email (check-email view) ----------
  // Previously the only way to get another email was to re-submit the whole
  // sign-up form — every retry burned the server email quota and deepened
  // the rate-limit ban. A dedicated resend with a 60s cooldown avoids that.
  const handleResend = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (blockedByCooldown('resend')) return;
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Enter your account email on the sign-up form first.');
      return;
    }
    setBusy(true);
    recordAttempt('resend');
    try {
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/confirmed` },
      });
      if (error) throw error;
      setBusy(false);
      setInfoMsg(`Verification email re-sent to ${email.trim()}. Check your inbox and spam folder.`);
    } catch (err) {
      fail(err, 'resend');
    }
  };

  // ---------- Claim username on first login (no profile row yet) ----------
  const handleUsernameSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const nameError = validateUsernameFormat(username);
    if (nameError) {
      setErrorMsg(nameError);
      return;
    }
    if (!stream) {
      setErrorMsg('Please select your A/L stream to continue.');
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) throw new Error('Your session expired. Please sign in again.');
      const available = await checkUsernameAvailable(username);
      if (!available) {
        setErrorMsg('Username already taken. Please choose another one.');
        setBusy(false);
        return;
      }
      await createProfile(
        user.id,
        username,
        stream,
        elective,
        toExamDate(examDate),
        targetZScore.trim() || null,
        motivationNote.trim() || null,
        toMobileNumber(mobileNumber)
      );
      if (completedTopicIds.length > 0) {
        try {
          await pushTopics(user.id, buildCompletedTopicsFromIds(completedTopicIds));
        } catch (topicsErr) {
          console.warn('Initial topics sync failed:', topicsErr);
        }
      }
      try {
        localStorage.removeItem('mindmaze_pending_username');
        localStorage.removeItem('mindmaze_pending_stream');
        localStorage.removeItem('mindmaze_pending_elective');
        localStorage.removeItem('mindmaze_pending_exam_date');
        localStorage.removeItem('mindmaze_pending_zscore');
        localStorage.removeItem('mindmaze_pending_note');
        localStorage.removeItem('mindmaze_pending_mobile');
        localStorage.removeItem('mindmaze_pending_topics');
      } catch {}
      persistStreamChoice();
      persistExamDateChoice();
      persistGoalsChoice();
      persistMobileChoice();
      setBusy(false);
      onAuthReady?.(username.trim());
    } catch (err) {
      fail(err);
    }
  };

  // ---------- Set new password after reset link (recovery session) ----------
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setBusy(false);
      setInfoMsg('Password updated! You are signed in — loading your study data…');
      setTimeout(() => onViewChange('signin'), 1500);
    } catch (err) {
      fail(err, 'signin');
    }
  };

  const tabs = (
    <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
      <button
        type="button"
        onClick={() => {
          onViewChange('signin');
          setErrorMsg(null);
          setInfoMsg(null);
        }}
        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
          view === 'signin' ? 'bg-[#6B4EFF] text-white shadow-[0_0_15px_rgba(107,78,255,0.4)]' : 'text-slate-400 hover:text-white'
        }`}
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onViewChange('signup');
          setErrorMsg(null);
          setInfoMsg(null);
        }}
        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
          view === 'signup' ? 'bg-[#6B4EFF] text-white shadow-[0_0_15px_rgba(107,78,255,0.4)]' : 'text-slate-400 hover:text-white'
        }`}
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span>Create Account</span>
      </button>
    </div>
  );

  const alerts = (
    <>
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          {infoMsg}
        </div>
      )}
    </>
  );

  const passwordField = (label = 'Password', showForgot = false) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-300">{label}</label>
        {showForgot && (
          <button
            type="button"
            onClick={() => {
              onViewChange('forgot');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
          >
            Forgot password?
          </button>
        )}
      </div>
      <div className="relative">
        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  const submitButton = (label: string, action?: AuthAction) => {
    // Re-read on every render; cooldownTick forces a re-render each second
    // while locked so the countdown stays live.
    void cooldownTick;
    const remaining = action ? getCooldownRemaining(action) : 0;
    const locked = remaining > 0;
    return (
      <button
        type="submit"
        disabled={busy || locked}
      className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] disabled:opacity-60 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(107,78,255,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      <span>{busy ? 'Please wait…' : locked ? `Try again in ${remaining}s` : label}</span>
    </button>
    );
  };

  // Shared stream + elective picker used by the sign-up and first-login
  // username-setup forms (plain JSX, no hooks inside). Choosing Physical
  // Science reveals the Chemistry / ICT elective choice.
  // Step eyebrow label used to break the form into a short guided flow.
  const stepBadge = (n: number, title: string, optional: boolean) => (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#6B4EFF]/25 border border-[#6B4EFF]/50 text-cyan-200">
        Step {n}
      </span>
      <span className="text-xs font-bold text-white">{title}</span>
      {optional && (
        <span className="text-[10px] text-slate-500 font-normal">Optional — skip if you'd rather set this later</span>
      )}
    </div>
  );

  const streamPicker = (
    <div className="space-y-3">
      {stepBadge(2, 'Stream & subjects', false)}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your A/L Stream <span className="text-rose-400">*</span></label>
        <div className="grid grid-cols-2 gap-2.5">
          {(['Physical Science', 'Biological Science'] as const).map((s) => {
            const selected = stream === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStream(s)}
                className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  selected
                    ? 'border-[#6B4EFF] bg-[#6B4EFF]/20 shadow-[0_0_15px_rgba(107,78,255,0.4)]'
                    : 'border-white/10 bg-white/5 hover:border-white/25'
                }`}
              >
                <span className="text-xl">{s === 'Physical Science' ? '📐' : '🔬'}</span>
                <span className="block text-xs font-bold text-white mt-1">
                  {s === 'Physical Science' ? 'Physical Science' : 'Biological Science'}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {s === 'Physical Science' ? 'Maths stream' : 'Bio stream'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {stream === 'Physical Science' && (
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Elective Subject <span className="text-rose-400">*</span></label>
          <div className="grid grid-cols-2 gap-2.5">
            {(['Chemistry', 'ICT'] as const).map((opt) => {
              const selected = elective === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setElective(opt)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selected
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <span>{opt === 'Chemistry' ? '⚗️' : '💻'}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Optional extras shared by sign-up and username-setup: expected A/L
  // date (Dashboard countdown) + already-completed topics (Tracker head
  // start). Both skippable — blank/unchecked means "not set / from scratch".
  const headStartStep = (
    <div className="space-y-3 pt-1">
      {stepBadge(3, 'Head start', true)}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Expected A/L Exam Date <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors [color-scheme:dark]"
        />
        <p className="text-[10px] text-slate-500 mt-1">Shows a countdown on your Dashboard. Editable later in Settings.</p>
      </div>
      <CompletedTopicsPicker
        stream={stream}
        elective={elective}
        selectedIds={completedTopicIds}
        onChange={setCompletedTopicIds}
      />
    </div>
  );

  // Combined Goals step (Z-score + motivation note + optional contact
  // number) — one screen, all skippable. Mobile is stored contact info
  // only: never auth/OTP/verification, never blocks sign-up.
  const goalsStep = (
    <div className="space-y-3 pt-1">
      {stepBadge(4, 'Goals', true)}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          What&apos;s your target Z-score? <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={targetZScore}
          onChange={(e) => setTargetZScore(e.target.value)}
          placeholder="e.g. 1.8000"
          maxLength={20}
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
        />
        <p className="text-[10px] text-slate-500 mt-1">Shown on your Dashboard. Editable later in Settings.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Motivation note <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={motivationNote}
          onChange={(e) => setMotivationNote(e.target.value)}
          placeholder="Write yourself a note — it will be sent back to you in reminders. e.g. Do it for future me."
          maxLength={500}
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
        />
        <p className="text-[10px] text-slate-500 mt-1">Included in your daily countdown notification. Editable later in Settings.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Mobile Number <span className="text-slate-500 font-normal">(optional)</span>
        </label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          placeholder="e.g. +94 77 123 4567 — skip if you prefer"
          maxLength={30}
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
        />
        {mobileNumber.trim() && !isMobileNumberPlausible(mobileNumber) ? (
          <p className="text-[10px] text-amber-300/80 mt-1">That doesn&apos;t look like a usual mobile number — you can still continue, it won&apos;t block sign-up.</p>
        ) : (
          <p className="text-[10px] text-slate-500 mt-1">Stored as contact info only — no verification codes, no login use. Editable later in Settings.</p>
        )}
      </div>
    </div>
  );

  const body = (
    <div className="space-y-4">
      {(view === 'signin' || view === 'signup') && tabs}
      {alerts}

      {view === 'signin' && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className={inputClass}
              />
            </div>
          </div>
          {passwordField('Password', true)}
          {submitButton('Sign In to Dashboard', 'signin')}
          <p className="text-[11px] text-slate-500 text-center">
            Your data syncs across devices and survives cache clearing.
          </p>
        </form>
      )}

      {view === 'signup' && (
        <form onSubmit={handleSignUp} className="space-y-3.5">
          {stepBadge(1, 'Account', false)}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. kasun_2027 (letters, numbers, _)"
                required
                minLength={3}
                maxLength={30}
                className={inputClass}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">This is the name shown in the app — choose wisely, it must be unique.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 chars"
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          {streamPicker}
          {headStartStep}
          {goalsStep}
          {submitButton('Create My Account', 'signup')}
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={handleForgot} className="space-y-4">
          <div className="text-center space-y-1">
            <KeyRound className="w-8 h-8 text-cyan-400 mx-auto" />
            <h2 className="text-lg font-black text-white">Reset Password</h2>
            <p className="text-xs text-slate-400">We’ll email you a secure reset link.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className={inputClass}
              />
            </div>
          </div>
          {submitButton('Send Reset Link', 'forgot')}
          <button
            type="button"
            onClick={() => {
              onViewChange('signin');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        </form>
      )}

      {view === 'check-email' && (
        <div className="space-y-4 text-center py-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h2 className="text-lg font-black text-white">Check your inbox!</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            We sent a verification link to <strong className="text-white">{email || 'your email'}</strong>.
            Click it — it opens a confirmation page (possibly in a new tab) where
            you continue straight into your account. Your username{' '}
            <strong className="text-cyan-300">@{username}</strong> is reserved for you.
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            No email? Check spam first — then resend below. Please don&apos;t
            create the account again; each retry counts toward the email limit.
          </p>
          {(() => {
            const resendLeft = getCooldownRemaining('resend');
            return (
              <button
                type="button"
                onClick={handleResend}
                disabled={busy || resendLeft > 0}
                className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-cyan-300 text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>
                  {busy
                    ? 'Sending…'
                    : resendLeft > 0
                      ? `Resend available in ${resendLeft}s`
                      : 'Resend verification email'}
                </span>
              </button>
            );
          })()}
          <button
            type="button"
            onClick={() => {
              onViewChange('signin');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all cursor-pointer"
          >
            I’ve verified — take me to Sign In
          </button>
        </div>
      )}

      {view === 'username' && (
        <form onSubmit={handleUsernameSetup} className="space-y-4">
          <div className="text-center space-y-1">
            <User className="w-8 h-8 text-cyan-400 mx-auto" />
            <h2 className="text-lg font-black text-white">Pick your username</h2>
            <p className="text-xs text-slate-400">This is the name shown across the app (e.g. “Hi, kasun!”).</p>
          </div>
          {stepBadge(1, 'Username', false)}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. kasun_2027"
                required
                minLength={3}
                maxLength={30}
                className={inputClass}
              />
            </div>
          </div>
          {streamPicker}
          {headStartStep}
          {goalsStep}
          {submitButton('Save Username & Continue')}
        </form>
      )}

      {view === 'update-password' && (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="text-center space-y-1">
            <KeyRound className="w-8 h-8 text-cyan-400 mx-auto" />
            <h2 className="text-lg font-black text-white">Choose a new password</h2>
            <p className="text-xs text-slate-400">You arrived via a reset link — set your new password below.</p>
          </div>
          {passwordField('New Password')}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className={inputClass}
              />
            </div>
          </div>
          {submitButton('Update Password & Sign In', 'signin')}
        </form>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <div className="rounded-3xl border border-white/15 bg-[#12142B] p-5 sm:p-6 shadow-2xl">
        {body}
      </div>
    );
  }

  const goToLanding = () => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="relative min-h-screen bg-[#0F1023] bg-[radial-gradient(circle_at_top_right,_#1a1b3d_0%,_#0F1023_100%)] text-slate-100 flex items-center justify-center px-4 py-10 font-['Poppins',sans-serif]">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={goToLanding}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <img
            src="/icon-192.png"
            alt="Mind Maze logo"
            width={192}
            height={192}
            className="w-20 h-20 rounded-3xl object-cover ring-1 ring-white/10 shadow-[0_0_30px_rgba(107,78,255,0.4)] mx-auto"
            draggable={false}
          />
          <div>
            <h1 className="text-2xl font-black text-white">
              Mind <span className="bg-gradient-to-r from-[#6B4EFF] via-[#8B5CF6] to-[#00F5FF] bg-clip-text text-transparent">Maze</span>
            </h1>
            <p className="text-[10px] tracking-wider uppercase font-medium text-cyan-400 mt-0.5">
              GCE A/L Study Planner
            </p>
          </div>
          {view !== 'username' && view !== 'update-password' && (
            <p className="text-xs text-slate-400">Sign in to sync your timetable, topics & streak across devices.</p>
          )}
        </div>
        <div className="rounded-3xl border border-white/15 bg-[#12142B]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          {body}
        </div>
      </div>
    </div>
  );
};
