import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Users,
  Loader2,
  Bell,
  BellOff,
  BellRing,
  Activity,
  Send,
  Target,
  Trophy,
  Download,
  ChevronDown,
} from 'lucide-react';
import {
  fetchAllProfiles,
  fetchPushAdminOverview,
  checkPushHealthMigration,
  fetchSendPushDryRun,
  invokeSendPushTest,
  SendPushDryRun,
  AdminProfileEntry,
  PushDeviceSummary,
  UserRole,
  CloudError,
} from '../../lib/cloudStore';
import {
  DailyTarget,
  fetchDailyTarget,
  getStoredDailyTarget,
  updateDailyTarget,
} from '../../lib/dailyTarget';
import {
  AdminProgressEntry,
  adminProgressToCsv,
  fetchAdminProgress,
} from '../../lib/leaderboard';

interface AdminPanelProps {
  /** Role the app resolved for the signed-in user (from profiles.role). */
  userRole: UserRole;
  username?: string | null;
  /** Null until the profile row has loaded; lets us distinguish "loading". */
  profileLoaded: boolean;
  onNavigateHome: () => void;
}

/**
 * Admin-only control panel. Rendered at /admin; non-admins see an
 * access-denied card instead of the user list.
 */
export const AdminPanel: React.FC<AdminPanelProps> = ({
  userRole,
  username,
  profileLoaded,
  onNavigateHome,
}) => {
  const isAdmin = userRole === 'admin';
  const [users, setUsers] = useState<AdminProfileEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  // Push health overview: per-student subscription presence. Loaded
  // alongside the user list; fails independently (user list still shows).
  const [pushOverview, setPushOverview] = useState<PushDeviceSummary[]>([]);
  const [loadingPush, setLoadingPush] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  // Null until probed. False means the push-health migration was never run:
  // every row then shows "Not asked" / "Not subscribed" regardless of
  // reality, so the panel must say so instead of looking complete.
  const [pushMigrationOk, setPushMigrationOk] = useState<boolean | null>(null);
  // Live delivery-pipeline probe (dryRun sends NOTHING) + per-user test push.
  const [dryRun, setDryRun] = useState<SendPushDryRun | null>(null);
  const [checkingPipe, setCheckingPipe] = useState(false);
  const [pipeError, setPipeError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});
  // ---- Daily target (admin-set global goal) ----
  const [dailyTarget, setDailyTarget] = useState<DailyTarget>(() => getStoredDailyTarget());
  const [targetHours, setTargetHours] = useState('');
  const [targetTasks, setTargetTasks] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetMsg, setTargetMsg] = useState<string | null>(null);
  // ---- Student progress + top performers (full drill-down) ----
  const [progress, setProgress] = useState<AdminProgressEntry[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressSetup, setProgressSetup] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const checkPipeline = useCallback(async () => {
    setCheckingPipe(true);
    setPipeError(null);
    try {
      setDryRun(await fetchSendPushDryRun());
    } catch (err) {
      setDryRun(null);
      setPipeError(
        err instanceof CloudError ? err.userMessage : 'Pipeline check failed.'
      );
    } finally {
      setCheckingPipe(false);
    }
  }, []);

  const sendTestPush = useCallback(async (userId: string, username: string | null) => {
    setTestingId(userId);
    try {
      const n = await invokeSendPushTest(userId);
      setTestMsg((prev) => ({
        ...prev,
        [userId]:
          n > 0
            ? `✓ test push accepted by ${n} device${n === 1 ? '' : 's'} — it should arrive in seconds, even with the app closed.`
            : `⚠️ 0 devices accepted it — @${username ?? 'user'} looks subscribed but delivery failed (most often a VAPID key mismatch: the frontend VITE_VAPID_PUBLIC_KEY and the function VAPID_PUBLIC_KEY secret must be from the same pair).`,
      }));
    } catch (err) {
      setTestMsg((prev) => ({
        ...prev,
        [userId]: `❌ ${err instanceof CloudError ? err.userMessage : 'Test push failed.'}`,
      }));
    } finally {
      setTestingId(null);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      setUsers(await fetchAllProfiles());
    } catch (err) {
      setUsersError(
        err instanceof CloudError
          ? err.userMessage
          : 'Could not load user list. Your account may not have admin access.'
      );
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadPushOverview = useCallback(async () => {
    setLoadingPush(true);
    setPushError(null);
    try {
      const overview = await fetchPushAdminOverview();
      setPushOverview(overview);
      // Visible in DevTools console: distinguishes "query returned nothing"
      // from "rows returned but not matched to students" without guessing.
      console.info(`[Admin] push overview: ${overview.length} user(s) with rows`, overview.map((o) => o.userId));
    } catch (err) {
      setPushOverview([]);
      setPushError(
        err instanceof CloudError
          ? err.userMessage
          : 'Could not load push overview.'
      );
    } finally {
      setLoadingPush(false);
    }
    // Probe the telemetry column even when the overview "succeeds": a
    // missing push_admin_read_all policy filters rows silently (no error),
    // and a missing push_permission column makes every badge "Not asked".
    // Both come from the same migration file, so one probe covers both.
    try {
      setPushMigrationOk((await checkPushHealthMigration()).pushPermissionColumn);
    } catch {
      // Probe is advisory only — leave the previous value on failure.
    }
  }, []);

  const refreshAll = useCallback(() => {
    void loadUsers();
    void loadPushOverview();
    void loadProgress();
    void loadTarget();
  }, [loadUsers, loadPushOverview]);

  const loadTarget = useCallback(async () => {
    try {
      const t = await fetchDailyTarget();
      setDailyTarget(t);
      setTargetHours(String(t.hours));
      setTargetTasks(String(t.tasks));
    } catch {
      /* local mirror stays */
    }
  }, []);

  const loadProgress = useCallback(async () => {
    setLoadingProgress(true);
    try {
      const res = await fetchAdminProgress();
      setProgress(res.entries);
      setProgressSetup(res.needsSetup);
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  const handleSaveTarget = useCallback(async () => {
    setSavingTarget(true);
    setTargetMsg(null);
    try {
      const next = await updateDailyTarget(Number(targetHours), Number(targetTasks));
      setDailyTarget(next);
      setTargetHours(String(next.hours));
      setTargetTasks(String(next.tasks));
      setTargetMsg(`✓ Daily target live for all students: ${next.tasks} tasks + ${next.hours}h.`);
    } catch (err) {
      setTargetMsg(`❌ ${err instanceof Error ? err.message : 'Could not save the daily target.'}`);
    } finally {
      setSavingTarget(false);
    }
  }, [targetHours, targetTasks]);

  const handleExportCsv = useCallback(() => {
    try {
      const csv = adminProgressToCsv(progress);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindmaze-student-progress-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* export is best-effort */
    }
  }, [progress]);

  useEffect(() => {
    if (profileLoaded && isAdmin) {
      void loadUsers();
      void loadPushOverview();
      void loadTarget();
      void loadProgress();
    }
  }, [profileLoaded, isAdmin, loadUsers, loadPushOverview, loadTarget, loadProgress]);

  if (!profileLoaded) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#161831]/60 p-10 text-center backdrop-blur-md">
        <Loader2 className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-200 mt-3">Loading your profile…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 sm:p-8 backdrop-blur-xl text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-rose-400" />
          <h1 className="text-xl sm:text-2xl font-black text-white mt-3">Access denied</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            This area is restricted to administrators. Your account is signed in as{' '}
            <strong className="text-white">@{username ?? 'unknown'}</strong> with role{' '}
            <code className="px-1.5 py-0.5 rounded bg-black/40 border border-white/15 text-cyan-300 font-bold">
              {userRole}
            </code>
            . If you should be an admin, ask the site owner to set your{' '}
            <code className="px-1 py-0.5 rounded bg-black/40 border border-white/15">profiles.role</code>{' '}
            to <code className="px-1 py-0.5 rounded bg-black/40 border border-white/15">admin</code> in
            the Supabase dashboard, then log out and back in.
          </p>
          <button
            onClick={onNavigateHome}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const adminCount = users.filter((u) => u.role === 'admin').length;

  // Supabase project this build talks to (catches "counted rows in editor
  // of project A while the app reads project B" instantly).
  const projectRef = (() => {
    try {
      const u = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const host = u ? new URL(u).hostname : '';
      return host.split('.')[0] || 'unknown';
    } catch {
      return 'unknown';
    }
  })();

  // ---- Push health aggregates ----
  const students = users.filter((u) => u.role !== 'admin');
  const admins = users.filter((u) => u.role === 'admin');
  const pushByUser = new Map<string, PushDeviceSummary>(pushOverview.map((p) => [p.userId, p]));
  const subscribedStudents = students.filter((u) => (pushByUser.get(u.id)?.deviceCount ?? 0) > 0);
  // Admin devices count too (e.g. your own test subscriptions) — shown
  // separately so student-outreach metrics stay student-scoped.
  const subscribedAdmins = admins.filter((u) => (pushByUser.get(u.id)?.deviceCount ?? 0) > 0);
  const subscribedTotal = subscribedStudents.length + subscribedAdmins.length;
  const permGranted = students.filter((u) => u.pushPermission === 'granted').length;
  const permDenied = students.filter((u) => u.pushPermission === 'denied').length;
  const permUnsupported = students.filter((u) => u.pushPermission === 'unsupported').length;
  // NULL (never reported) or 'default' = never granted: not asked yet / old client.
  const permNotAsked = students.length - permGranted - permDenied - permUnsupported;

  const permissionBadge = (perm: AdminProfileEntry['pushPermission']) => {
    if (perm === 'granted')
      return <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-400/40"><BellRing className="w-3 h-3" />Granted</span>;
    if (perm === 'denied')
      return <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-rose-500/20 text-rose-300 border-rose-400/40"><BellOff className="w-3 h-3" />Blocked</span>;
    if (perm === 'unsupported')
      return <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-white/5 text-slate-400 border-white/15"><BellOff className="w-3 h-3" />Unsupported</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-400/40"><Bell className="w-3 h-3" />Not asked</span>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161831] via-[#12142B] to-[#0F1023] p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin Panel • restricted</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
          Admin Control Panel
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Signed in as <strong className="text-white">@{username ?? 'unknown'}</strong> with role{' '}
          <code className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
            {userRole}
          </code>
        </p>
      </div>

      {/* Debug / status card (temporary visibility aid) */}
      <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-4 sm:p-5 text-xs">
        <h2 className="text-sm font-bold text-cyan-300 mb-2">Role debug (temporary)</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">App role</dt>
            <dd className="text-base font-black text-white mt-0.5">{userRole}</dd>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Username</dt>
            <dd className="text-base font-black text-white mt-0.5">@{username ?? '—'}</dd>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Users loaded</dt>
            <dd className="text-base font-black text-white mt-0.5">
              {users.length} <span className="text-[11px] font-semibold text-slate-400">({adminCount} admin)</span>
            </dd>
          </div>
        </dl>
      </div>

      {/* 🎯 Daily target — one global goal for every student */}
      <div className="rounded-3xl border border-amber-400/30 bg-[#161831]/80 backdrop-blur-xl p-4 sm:p-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-amber-400" />
          <span>Daily study target (all students)</span>
        </h2>
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Currently live: <strong className="text-amber-200">{dailyTarget.tasks} tasks + {dailyTarget.hours}h per day</strong>
          {dailyTarget.fromCloud ? ' (synced from cloud)' : ' (local preview — run the leaderboard migration to sync it to everyone)'}.
          Students see it on their dashboard next to the quiz link.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tasks / day</label>
            <input
              type="number"
              min={0}
              max={24}
              step={1}
              value={targetTasks}
              onChange={(e) => setTargetTasks(e.target.value)}
              placeholder={String(dailyTarget.tasks)}
              className="w-24 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hours / day</label>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
              placeholder={String(dailyTarget.hours)}
              className="w-24 rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold text-white focus:outline-none"
            />
          </div>
          <button
            onClick={() => void handleSaveTarget()}
            disabled={savingTarget}
            className="px-4 py-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition cursor-pointer min-h-[40px] disabled:opacity-60"
          >
            {savingTarget ? 'Saving…' : 'Set Daily Target'}
          </button>
        </div>
        {targetMsg && (
          <p className="text-[11px] font-semibold mt-2 text-slate-300">{targetMsg}</p>
        )}
      </div>

      {/* 🏆 Top performers + full student progress drill-down */}
      <div className="rounded-3xl border border-white/10 bg-[#161831]/80 backdrop-blur-xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Student progress ({progress.length} accounts)</span>
          </h2>
          <div className="flex items-center gap-2">
            {progress.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>CSV</span>
              </button>
            )}
            <button
              onClick={() => void loadProgress()}
              disabled={loadingProgress}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer min-h-[40px] disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingProgress ? 'animate-spin' : ''}`} />
              <span>{loadingProgress ? 'Loading…' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {progressSetup ? (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-semibold leading-relaxed">
            Progress data isn&apos;t set up in Supabase yet. Run{' '}
            <code className="px-1 py-0.5 rounded bg-black/40 border border-white/15">supabase/migration_add_daily_target_and_leaderboard.sql</code>{' '}
            in the Supabase SQL Editor, then press Refresh. (The account list below keeps working meanwhile.)
          </div>
        ) : progress.length === 0 && !loadingProgress ? (
          <p className="text-xs text-slate-400 text-center py-6">No student progress yet — aggregates appear after students complete planner blocks.</p>
        ) : (
          <>
            {/* Top 3 this month */}
            {progress.filter((p) => p.role !== 'admin').slice(0, 3).length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {progress.filter((p) => p.role !== 'admin').slice(0, 3).map((p, i) => (
                  <div
                    key={p.userId}
                    className={`rounded-2xl border p-3 text-center ${i === 0 ? 'border-amber-400/50 bg-amber-500/10' : 'border-white/10 bg-white/[0.03]'}`}
                  >
                    <div className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                    <div className="text-xs font-black text-white truncate">@{p.username ?? '—'}</div>
                    <div className="text-sm font-black text-amber-300">{Math.round((p.monthMinutes / 60) * 10) / 10}h</div>
                    <div className="text-[10px] text-slate-400">{p.monthTasksDone} tasks • 🔥{p.currentStreak}d</div>
                  </div>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                    <th className="py-2 pr-3 font-bold">Student</th>
                    <th className="py-2 pr-3 font-bold">Streak</th>
                    <th className="py-2 pr-3 font-bold">Done (all-time)</th>
                    <th className="py-2 pr-3 font-bold">This week</th>
                    <th className="py-2 pr-3 font-bold">This month</th>
                    <th className="py-2 font-bold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((p) => {
                    const allH = Math.round((p.completedMinutes / 60) * 10) / 10;
                    const wH = Math.round((p.weekMinutes / 60) * 10) / 10;
                    const mH = Math.round((p.monthMinutes / 60) * 10) / 10;
                    const open = expandedId === p.userId;
                    return (
                      <React.Fragment key={p.userId}>
                        <tr className="border-b border-white/5 hover:bg-white/[0.03]">
                          <td className="py-2.5 pr-3 font-bold text-white">
                            @{p.username ?? '—'}
                            {p.role === 'admin' && (
                              <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-400/40 align-middle">admin</span>
                            )}
                            <span className="block text-[10px] font-medium text-slate-500">{p.stream ?? ''}</span>
                          </td>
                          <td className="py-2.5 pr-3 text-amber-300 font-bold">🔥{p.currentStreak}d <span className="text-slate-500 font-medium">(best {p.longestStreak})</span></td>
                          <td className="py-2.5 pr-3 text-slate-300">{p.completedTasks}/{p.totalTasks} tasks • {allH}h • {p.topicsCompleted} topics</td>
                          <td className="py-2.5 pr-3 text-slate-300">{p.weekTasksDone} tasks • {wH}h</td>
                          <td className="py-2.5 pr-3 font-bold text-white">{p.monthTasksDone} tasks • {mH}h</td>
                          <td className="py-2.5">
                            <button
                              onClick={() => setExpandedId(open ? null : p.userId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 transition cursor-pointer"
                            >
                              <span>{open ? 'Hide' : 'Drill-down'}</span>
                              <ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-white/10 bg-white/[0.02]">
                            <td colSpan={6} className="py-3 px-3">
                              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                  <dt className="text-slate-500 font-bold uppercase text-[9px]">Joined</dt>
                                  <dd className="text-white font-bold">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</dd>
                                </div>
                                <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                  <dt className="text-slate-500 font-bold uppercase text-[9px]">Last active day</dt>
                                  <dd className="text-white font-bold">{p.lastCompletedDate ?? 'never'}</dd>
                                </div>
                                <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                  <dt className="text-slate-500 font-bold uppercase text-[9px]">Topics completed</dt>
                                  <dd className="text-white font-bold">{p.topicsCompleted}</dd>
                                </div>
                                <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                  <dt className="text-slate-500 font-bold uppercase text-[9px]">Completion rate</dt>
                                  <dd className="text-white font-bold">{p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0}%</dd>
                                </div>
                              </dl>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          Week = Mon–Sun, month = calendar month (Sri Lanka time). Hours come from completed planner blocks. Sorted by this month&apos;s hours.
        </p>
      </div>

      {/* Push notification health */}
      <div className="rounded-3xl border border-white/10 bg-[#161831]/80 backdrop-blur-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-emerald-400" />
            <span>Push notification health</span>
          </h2>
          <button
            onClick={refreshAll}
            disabled={loadingUsers || loadingPush}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer min-h-[44px] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${(loadingUsers || loadingPush) ? 'animate-spin' : ''}`} />
            <span>{loadingUsers || loadingPush ? 'Loading…' : 'Refresh'}</span>
          </button>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-4">
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Students</dt>
            <dd className="text-base font-black text-white mt-0.5">{students.length}</dd>
          </div>
          <div className="rounded-xl bg-black/30 border border-emerald-400/30 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Subscribed</dt>
            <dd className="text-base font-black text-emerald-300 mt-0.5">{subscribedTotal}</dd>
            {subscribedAdmins.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                incl. {subscribedAdmins.length} admin{subscribedAdmins.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Permission granted</dt>
            <dd className="text-base font-black text-white mt-0.5">{permGranted}</dd>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Blocked</dt>
            <dd className="text-base font-black text-rose-300 mt-0.5">{permDenied}</dd>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Not asked yet</dt>
            <dd className="text-base font-black text-amber-300 mt-0.5">{permNotAsked}</dd>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/10 p-3">
            <dt className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Unsupported</dt>
            <dd className="text-base font-black text-slate-300 mt-0.5">{permUnsupported}</dd>
          </div>
        </dl>

        {/* Self-diagnosis: raw query result vs matched profiles. If these two
            numbers disagree, the join (not the query) is where rows vanish. */}
        {!loadingPush && !pushError && (
          <p className="text-[11px] text-slate-500 -mt-2 mb-3">
            Overview response: {pushOverview.length} user(s) with rows · {subscribedTotal} matched (
            {subscribedStudents.length} student{subscribedStudents.length === 1 ? '' : 's'} +{' '}
            {subscribedAdmins.length} admin{subscribedAdmins.length === 1 ? '' : 's'}) · project{' '}
            <code className="text-slate-400">{projectRef}</code>
            {pushOverview.length > subscribedTotal &&
              ' — some rows belong to unknown/deleted profiles (orphans).'}
          </p>
        )}

        {pushMigrationOk === false && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-semibold mb-3 leading-relaxed">
            Push telemetry is not set up in Supabase yet, so every student shows &ldquo;Not asked&rdquo; /
            &ldquo;Not subscribed&rdquo; regardless of reality: permission reports have nowhere to land and the
            admin subscription overview is blind. Run{' '}
            <code className="px-1 py-0.5 rounded bg-black/40 border border-white/15">supabase/migration_add_push_admin_overview.sql</code>{' '}
            in the Supabase SQL Editor (one step: telemetry column + admin read policy + overview function),
            then press Refresh. (If the push_subscriptions table itself is missing,
            run <code className="px-1 py-0.5 rounded bg-black/40 border border-white/15">supabase/migration_add_push_subscriptions.sql</code> first.)
          </div>
        )}

        {/* Live delivery-pipeline probe: answers "subscribed but no push?"
            without guessing. dryRun sends NOTHING — diagnostics only. */}
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Delivery pipeline</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Checks the live send-push function (VAPID secrets, subscription rows, today&apos;s slots). Sends nothing.
              </p>
            </div>
            <button
              onClick={() => void checkPipeline()}
              disabled={checkingPipe}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition cursor-pointer min-h-[40px] disabled:opacity-60"
            >
              <Activity className={`w-3.5 h-3.5 ${checkingPipe ? 'animate-spin' : ''}`} />
              <span>{checkingPipe ? 'Checking…' : 'Check pipeline'}</span>
            </button>
          </div>
          {pipeError && (
            <p className="text-[11px] text-rose-300 font-semibold mt-2 leading-relaxed">{pipeError}</p>
          )}
          {dryRun && (
            <div className="mt-2">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-white/[0.04] border border-white/10 p-2">
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Function time (SL)</dt>
                  <dd className="text-[11px] font-bold text-white mt-0.5">{dryRun.slTime}</dd>
                </div>
                <div className={`rounded-lg border p-2 ${dryRun.vapidConfigured ? 'bg-emerald-500/10 border-emerald-400/40' : 'bg-rose-500/10 border-rose-400/40'}`}>
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">VAPID secrets</dt>
                  <dd className={`text-[11px] font-black mt-0.5 ${dryRun.vapidConfigured ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {dryRun.vapidConfigured ? '✓ Set' : '✗ Missing'}
                  </dd>
                </div>
                <div className="rounded-lg bg-white/[0.04] border border-white/10 p-2">
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Subscription rows</dt>
                  <dd className="text-[11px] font-bold text-white mt-0.5">{dryRun.subscriptionRows}</dd>
                </div>
                <div className="rounded-lg bg-white/[0.04] border border-white/10 p-2">
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Reminder slots today</dt>
                  <dd className="text-[11px] font-bold text-white mt-0.5">{dryRun.enabledSlotsToday}</dd>
                </div>
                <div className="rounded-lg bg-white/[0.04] border border-white/10 p-2">
                  <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Quiz windows (12pm/5pm)</dt>
                  <dd className="text-[11px] font-bold text-white mt-0.5">
                    {dryRun.quizSlotNow ? `🔔 ${dryRun.quizSlotNow} live now` : 'Scheduled ✓'}
                  </dd>
                </div>
              </dl>
              {!dryRun.vapidConfigured && (
                <p className="text-[11px] text-rose-300 font-semibold mt-2 leading-relaxed">
                  VAPID secrets are missing in the function: run
                  <code className="px-1 py-0.5 rounded bg-black/40 border border-white/15 mx-1">supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:you@example.com</code>
                  (public key must match the app&apos;s VITE_VAPID_PUBLIC_KEY — same pair), then redeploy the function. Nothing can be delivered until then.
                </p>
              )}
              {dryRun.vapidConfigured && dryRun.subscriptionRows === 0 && (
                <p className="text-[11px] text-amber-300 font-semibold mt-2 leading-relaxed">
                  No subscription rows at all: the break is client-side — students grant permission but no device ever subscribes (VAPID key missing in the app build, service worker blocked, or an old app version). Ask one student to open Settings → check the closed-app push status there.
                </p>
              )}
            </div>
          )}
        </div>

        {pushError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-3">
            {pushError}
          </div>
        )}

        {!pushError && students.length === 0 && !loadingUsers && (
          <p className="text-xs text-slate-400 text-center py-6">No student rows found.</p>
        )}

        {!pushError && students.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <th className="py-2 pr-3 font-bold">Username</th>
                  <th className="py-2 pr-3 font-bold">Permission</th>
                  <th className="py-2 pr-3 font-bold">Push status</th>
                  <th className="py-2 font-bold">Last active</th>
                </tr>
              </thead>
              <tbody>
                {[...students, ...admins].map((u) => {
                  const push = pushByUser.get(u.id);
                  const devices = push?.deviceCount ?? 0;
                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="py-2.5 pr-3 font-bold text-white">
                        @{u.username ?? '—'}
                        {u.role === 'admin' && (
                          <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-400/40 align-middle">
                            admin
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{permissionBadge(u.pushPermission)}</td>
                      <td className="py-2.5 pr-3">
                        {devices > 0 ? (
                          <span className="inline-flex flex-col items-start gap-1">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                              ✓ Receiving{devices > 1 ? ` (${devices} devices)` : ''}
                            </span>
                            <button
                              onClick={() => void sendTestPush(u.id, u.username)}
                              disabled={testingId === u.id}
                              title="Send one real closed-app push to this student's devices"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[10px] font-bold transition cursor-pointer disabled:opacity-60"
                            >
                              <Send className="w-3 h-3" />
                              <span>{testingId === u.id ? 'Sending…' : 'Test push'}</span>
                            </button>
                            {testMsg[u.id] && (
                              <span className="text-[10px] text-slate-300 leading-snug max-w-[220px]">
                                {testMsg[u.id]}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-white/5 text-slate-400 border-white/15">
                            Not subscribed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {push?.latestAt ? new Date(push.latestAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          Stale subscriptions heal automatically: each granted device re-verifies its subscription against the
          current VAPID key on sign-in and recreates it when needed. &ldquo;Blocked&rdquo; students must re-enable
          notifications in their browser site settings first — the app cannot resubscribe them. Permission and
          subscription columns update as students open the app.
        </p>
      </div>

      {/* User list */}
      <div className="rounded-3xl border border-white/10 bg-[#161831]/80 backdrop-blur-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>All users ({users.length})</span>
          </h2>
          <button
            onClick={refreshAll}
            disabled={loadingUsers}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer min-h-[44px] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingUsers ? 'animate-spin' : ''}`} />
            <span>{loadingUsers ? 'Loading…' : 'Refresh'}</span>
          </button>
        </div>

        {usersError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-3">
            {usersError} (Did you run the latest migration SQL? Admins need the
            profiles_admin_read_all policy.)
          </div>
        )}

        {!usersError && users.length === 0 && !loadingUsers && (
          <p className="text-xs text-slate-400 text-center py-6">No user rows found.</p>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <th className="py-2 pr-3 font-bold">Username</th>
                  <th className="py-2 pr-3 font-bold">Stream</th>
                  <th className="py-2 pr-3 font-bold">Role</th>
                  <th className="py-2 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="py-2.5 pr-3 font-bold text-white">@{u.username ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-300">{u.stream ?? '—'}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            : 'bg-white/5 text-slate-300 border-white/15'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
          Role changes are dashboard-only: edit <code className="text-slate-300">profiles.role</code> in the
          Supabase Table Editor. There is intentionally no in-app control that can modify roles.
        </p>
      </div>
    </div>
  );
};
