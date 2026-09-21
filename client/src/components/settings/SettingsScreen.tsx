import React, { useState } from 'react';
import { StreamType, UserSettings } from '../../types';
import {
  Settings as SettingsIcon,
  User,
  Cloud,
  LogOut,
  BookOpen,
  GraduationCap,
  Target,
  Bell,
  BellOff,
  Volume2,
  Phone,
} from 'lucide-react';
import { BrowserReenableSteps } from '../notifications/BrowserReenableSteps';
import type { LocalPushState } from '../../lib/notificationService';

interface SettingsScreenProps {
  stream: StreamType;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  /** Expected A/L date edit — saved locally and synced to Supabase. */
  onUpdateExamDate?: (dateStr: string) => void;
  /** Goals edit (Z-score + motivation note) — saved locally and synced. */
  onUpdateGoals?: (goals: { targetZScore: string; motivationNote: string }) => void;
  /** Contact number edit — stored info only, never auth/OTP. Blank clears it. */
  onUpdateMobileNumber?: (mobileNumber: string) => void;
  /** Current browser notification permission for the status display. */
  notificationPermission?: NotificationPermission | 'unsupported';
  /** Opens the pre-permission explainer (native prompt fires only from there). */
  onRequestNotificationPermission?: () => void;
  /** Sends a real notification so students can confirm it works. */
  onSendTestNotification?: () => void;
  /** Removes this device's closed-app push subscription (stays signed in). */
  onDisablePushNotifications?: () => void;
  /** Real per-device closed-app push state (null while checking). */
  pushStatus?: LocalPushState | null;
  /** Re-runs the silent heal to (re)create this device's push subscription. */
  onReconnectPush?: () => void;
  /** True while a reconnect attempt is in flight. */
  reconnectingPush?: boolean;
  username?: string | null;
  /** Temporary debug: role the app resolved from profiles.role. */
  userRole?: 'student' | 'admin';
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  onSelectStream?: (stream: StreamType) => void;
  onSelectElective?: (elective: 'Chemistry' | 'ICT') => void;
  cloudSyncEnabled?: boolean;
  onSignOut?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  stream,
  settings,
  onUpdateSettings,
  onUpdateExamDate,
  onUpdateGoals,
  onUpdateMobileNumber,
  username,
  userRole = 'student',
  isAdmin = false,
  onNavigateToAdmin,
  onSelectStream,
  onSelectElective,
  notificationPermission = 'default',
  onRequestNotificationPermission,
  onSendTestNotification,
  onDisablePushNotifications,
  pushStatus = null,
  onReconnectPush,
  reconnectingPush = false,
  cloudSyncEnabled = false,
  onSignOut,
}) => {
  const [targetYear, setTargetYear] = useState(settings.targetExamYear);
  const [dailyGoal, setDailyGoal] = useState(
    settings.dailyHoursGoal ?? Math.round((settings.weeklyHoursGoal / 7) * 10) / 10
  );
  const [examDateInput, setExamDateInput] = useState(settings.targetExamDate || '');
  const [goalZScore, setGoalZScore] = useState(settings.targetZScore || '');
  const [goalNote, setGoalNote] = useState(settings.motivationNote || '');
  const [goalsSavedTick, setGoalsSavedTick] = useState(false);
  const [mobileInput, setMobileInput] = useState(settings.mobileNumber || '');
  const [mobileSavedTick, setMobileSavedTick] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDaily = Math.max(0.5, Math.min(16, Number(dailyGoal) || 4));
    onUpdateSettings({
      targetExamYear: targetYear,
      dailyHoursGoal: cleanDaily,
      weeklyHoursGoal: Math.round(cleanDaily * 7 * 10) / 10,
    });
    // Exam date syncs to Supabase too (drives the Dashboard countdown).
    // Blank clears it — countdown hides until a date is set again.
    onUpdateExamDate?.(examDateInput);
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGoals?.({ targetZScore: goalZScore, motivationNote: goalNote });
    setGoalsSavedTick(true);
    setTimeout(() => setGoalsSavedTick(false), 2500);
  };

  const handleSaveMobile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMobileNumber?.(mobileInput);
    setMobileSavedTick(true);
    setTimeout(() => setMobileSavedTick(false), 2500);
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-3xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161831] via-[#12142B] to-[#0F1023] p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold mb-2">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>App Settings</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Manage your account, study programme, and exam targets.
        </p>
      </div>

      {/* Account & Sync Card */}
      {(username || onSignOut) && (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1E1949] to-[#12142B] p-5 sm:p-6 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#6B4EFF]/20 border border-[#6B4EFF]/40">
              <User className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Signed in as
              </div>
              <div className="text-lg font-black text-white truncate max-w-full break-all">
                {username ? `@${username}` : 'Student'}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-0.5">
                <Cloud className={`w-3.5 h-3.5 ${cloudSyncEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className={cloudSyncEnabled ? 'text-emerald-300' : 'text-slate-500'}>
                  {cloudSyncEnabled ? 'Cloud sync on — data backed up across devices' : 'Local-only mode — sign in to sync'}
                </span>
              </div>
              {/* TEMPORARY DEBUG: shows the role the app resolved from profiles.role */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Role debug:
                </span>
                <code
                  id="debug-user-role"
                  className={`px-2 py-0.5 rounded-lg border text-[11px] font-black ${
                    userRole === 'admin'
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                      : 'bg-white/5 border-white/15 text-cyan-300'
                  }`}
                >
                  {userRole}
                </code>
                {isAdmin && onNavigateToAdmin && (
                  <button
                    type="button"
                    id="btn-open-admin-panel"
                    onClick={onNavigateToAdmin}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-bold transition cursor-pointer"
                  >
                    Open Admin Panel →
                  </button>
                )}
              </div>
            </div>
          </div>
          {onSignOut && (
            <button
              onClick={() => {
                if (window.confirm('Sign out of Mind Maze on this device? Your synced data stays safe in the cloud.')) {
                  onSignOut();
                }
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition cursor-pointer min-h-[40px] shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      )}

      {/* Notifications Card — status, explainer re-entry, test, blocked help */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1E1949] to-[#12142B] p-5 sm:p-6 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white mt-1">
          Study Reminders
        </h2>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {notificationPermission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                <Bell className="w-4 h-4" />
                <span>✅ Enabled</span>
              </span>
            ) : notificationPermission === 'denied' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-300 text-xs font-bold">
                <BellOff className="w-4 h-4" />
                <span>⛔ Blocked in browser</span>
              </span>
            ) : notificationPermission === 'unsupported' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-slate-400 text-xs font-bold">
                <BellOff className="w-4 h-4" />
                <span>Not supported here</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <Bell className="w-4 h-4" />
                <span>Not enabled yet</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {notificationPermission === 'granted' && onSendTestNotification && (
              <button
                type="button"
                onClick={onSendTestNotification}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] text-white text-xs font-bold transition shadow-md cursor-pointer min-h-[44px]"
              >
                <Volume2 className="w-4 h-4" />
                <span>Send Test Notification</span>
              </button>
            )}
            {notificationPermission === 'granted' && onDisablePushNotifications && (
              <button
                type="button"
                onClick={onDisablePushNotifications}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 text-xs font-bold transition cursor-pointer min-h-[44px]"
              >
                <BellOff className="w-4 h-4" />
                <span>Turn Off Push on This Device</span>
              </button>
            )}
            {notificationPermission !== 'granted' &&
              notificationPermission !== 'denied' &&
              notificationPermission !== 'unsupported' &&
              onRequestNotificationPermission && (
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] text-white text-xs font-bold transition shadow-md cursor-pointer min-h-[44px]"
                >
                  <Bell className="w-4 h-4" />
                  <span>Enable Notifications</span>
                </button>
              )}
          </div>
        </div>

        {/* Real per-device closed-app push state. Browser permission alone is
            NOT delivery: this verifies the subscription + server row exist. */}
        {notificationPermission === 'granted' && (
          <div
            className={`mt-3 rounded-2xl border p-3 text-xs leading-relaxed ${
              pushStatus === 'active'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : pushStatus === null || pushStatus === 'unknown'
                  ? 'border-white/10 bg-white/5 text-slate-300'
                  : 'border-amber-400/40 bg-amber-500/10 text-amber-200'
            }`}
          >
            {pushStatus === 'active' ? (
              <span>
                <strong>📲 Closed-app push is active on this device.</strong> You&apos;ll get timetable
                pre-alerts and streak reminders even with the app closed.
              </span>
            ) : pushStatus === null || pushStatus === 'unknown' ? (
              <span>📲 Checking this device&apos;s closed-app push connection…</span>
            ) : pushStatus === 'no-key' ? (
              <span>
                <strong>⚠️ Push service isn&apos;t configured in this app build.</strong> The app owner
                needs to set the VAPID public key for this deployment — granting permission alone
                can&apos;t deliver pushes until then.
              </span>
            ) : pushStatus === 'no-service-worker' ? (
              <span>
                <strong>⚠️ No background worker running.</strong> Reload the app once (or reinstall
                it) and check again — closed-app push needs it.
              </span>
            ) : pushStatus === 'unsupported' || pushStatus === 'no-permission' ? (
              <span>📲 This browser/device can&apos;t receive closed-app push. In-app reminders still work.</span>
            ) : (
              <span className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span>
                  <strong>⚠️ Closed-app push isn&apos;t connected on this device</strong>
                  {pushStatus === 'not-synced'
                    ? ' (browser subscription exists but the server has no record of it).'
                    : ' (no browser subscription yet).'}{' '}
                  Tap Reconnect to fix it.
                </span>
                {onReconnectPush && (
                  <button
                    type="button"
                    onClick={onReconnectPush}
                    disabled={reconnectingPush}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] text-white text-xs font-bold transition shadow-md cursor-pointer min-h-[40px] shrink-0 disabled:opacity-60"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{reconnectingPush ? 'Reconnecting…' : 'Reconnect push'}</span>
                  </button>
                )}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Get reminded when it&apos;s time to study, keep your streak alive, and stay on track for your A/Ls. 💪
        </p>

        {notificationPermission === 'denied' && (
          <div className="mt-3">
            <BrowserReenableSteps />
          </div>
        )}
      </div>

      {/* Study Programme Card — edit stream/elective in profile Settings */}
      {(onSelectStream || onSelectElective) && (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1E1949] to-[#12142B] p-5 sm:p-6 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Study Programme</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white mt-1">
            Your A/L Stream
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            It applies across timetable, planner &amp; topics, and syncs to your cloud profile.
          </p>

          {onSelectStream && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
              {(['Physical Science', 'Biological Science'] as const).map((s) => {
                const normalized = stream === 'Maths' ? 'Physical Science' : stream === 'Bio' ? 'Biological Science' : stream;
                const active = normalized === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSelectStream(s)}
                    className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer min-h-[56px] ${
                      active
                        ? 'border-[#6B4EFF] bg-[#6B4EFF]/20 shadow-[0_0_15px_rgba(107,78,255,0.4)]'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <span className="text-xl">{s === 'Physical Science' ? '📐' : '🔬'}</span>
                    <span className="block text-xs font-bold text-white mt-1">{s}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {s === 'Physical Science' ? 'Combined Maths + Physics + Chem / ICT' : 'Biology + Chemistry + Physics'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {(stream === 'Physical Science' || (stream as string) === 'Maths') && onSelectElective && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                Physical Science 3rd Subject Elective
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['Chemistry', 'ICT'] as const).map((opt) => {
                  const active = settings.physicalScienceElective === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSelectElective(opt)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                        active
                          ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{opt === 'Chemistry' ? '🧪' : '💻'}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target Exam Goal Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1E1949] to-[#12142B] p-5 sm:p-6 backdrop-blur-xl shadow-lg">
        <form onSubmit={handleSaveSettings} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>GCE A/L Target Aspirations</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Targeting {targetYear} Examination{settings.targetZScore ? ` • Z-Score ${settings.targetZScore}` : ''}
            </h2>
            <p className="text-xs text-slate-300">
              Customize your target exam sitting and daily study hour goal (weekly target auto-calculates). Your Z-Score goal lives in the Goals section below.
            </p>
            <div className="mt-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Expected A/L Exam Date</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white focus:outline-none [color-scheme:dark]"
                />
                {examDateInput && (
                  <button
                    type="button"
                    onClick={() => setExamDateInput('')}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-300 cursor-pointer"
                  >
                    Clear date
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Drives the Dashboard countdown. Leave blank to hide it.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Exam Year</label>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="2027" className="bg-[#161831]">2027 A/L</option>
                <option value="2028" className="bg-[#161831]">2028 A/L</option>
                <option value="2029" className="bg-[#161831]">2029 A/L</option>
                <option value="2030" className="bg-[#161831]">2030 A/L</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Daily Goal (hrs/day)</label>
              <input
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-20 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">→ {Math.round(Number(dailyGoal || 0) * 7 * 10) / 10} hrs/week auto</p>
            </div>

            <button
              type="submit"
              className="mt-4 md:mt-0 px-4 py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition shadow-md cursor-pointer min-h-[40px]"
            >
              Update Goal
            </button>
          </div>
        </form>
      </div>

      {/* Goals Card — Z-score target + motivation note (synced to Supabase) */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1E1949] to-[#12142B] p-5 sm:p-6 backdrop-blur-xl shadow-lg">
        <form onSubmit={handleSaveGoals} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Target className="w-4 h-4" />
              <span>My Goals</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Z-Score Target & Motivation Note
            </h2>
            <p className="text-xs text-slate-300">
              Your target appears on the Dashboard, and your note is echoed back in the daily countdown notification.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Z-Score</label>
            <input
              type="text"
              inputMode="decimal"
              value={goalZScore}
              onChange={(e) => setGoalZScore(e.target.value)}
              placeholder="e.g. 1.8000"
              maxLength={20}
              className="w-40 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Motivation Note</label>
            <textarea
              rows={2}
              value={goalNote}
              onChange={(e) => setGoalNote(e.target.value)}
              placeholder="e.g. Do it for future me."
              maxLength={500}
              className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition shadow-md cursor-pointer min-h-[40px]"
            >
              Save Goals
            </button>
            {goalsSavedTick && (
              <span className="text-[11px] font-bold text-emerald-300 animate-fadeIn">Saved ✓</span>
            )}
          </div>
        </form>
      </div>

      {/* Contact Card — optional mobile number (stored info only) */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1E1949] to-[#12142B] p-5 sm:p-6 backdrop-blur-xl shadow-lg">
        <form onSubmit={handleSaveMobile} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Phone className="w-4 h-4" />
              <span>Contact Info</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Mobile Number <span className="text-xs font-bold text-slate-400">(optional)</span>
            </h2>
            <p className="text-xs text-slate-300">
              Stored as contact info only — no verification codes, no login use. Leave blank to remove it.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Mobile Number</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={mobileInput}
              onChange={(e) => setMobileInput(e.target.value)}
              placeholder="e.g. +94 77 123 4567"
              maxLength={30}
              className="w-full sm:w-72 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition shadow-md cursor-pointer min-h-[40px]"
            >
              Save Number
            </button>
            {mobileInput.trim() && (
              <button
                type="button"
                onClick={() => {
                  setMobileInput('');
                  onUpdateMobileNumber?.('');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-rose-300 cursor-pointer"
              >
                Remove number
              </button>
            )}
            {mobileSavedTick && (
              <span className="text-[11px] font-bold text-emerald-300 animate-fadeIn">Saved ✓</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
