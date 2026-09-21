import React, { useEffect, useState } from 'react';
import { DailyTask, ScreenId, StreamType, SyllabusTopic, TimetableEntry, StreakData } from '../../types';
import {
  LayoutDashboard,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  TrendingUp,
  Bell,
  BellOff,
  Flame,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Circle,
  Plus,
  Trophy,
  Volume2,
  RefreshCw,
  X,
} from 'lucide-react';
import { getTodayDateString, getTodayDayOfWeek } from '../../lib/storage';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import {
  playStudyChime,
  isPushPromptSnoozed,
  snoozePushPrompt,
  isBlockedPromptSnoozed,
  snoozeBlockedPrompt,
  PUSH_PROMPT_SNOOZED_EVENT,
} from '../../lib/notificationService';
import { BrowserReenableSteps } from '../notifications/BrowserReenableSteps';
import { PWAInstallButton } from '../PWAInstallButton';
import { DailyTargetCard } from '../targets/DailyTargetCard';
import { Leaderboard } from '../leaderboard/Leaderboard';
import {
  calculateSubjectProgression,
  calculateOverallStreamProgression,
} from '../../lib/syllabusProgression';

interface DashboardOverviewProps {
  stream: StreamType;
  /** Read-only elective (no picker here; change in Settings → Study Programme). */
  physicalScienceElective?: 'Chemistry' | 'ICT';
  timetableEntries: TimetableEntry[];
  dailyTasks: DailyTask[];
  syllabusTopics: SyllabusTopic[];
  streakData?: StreakData;
  /** Separate additive habit stat: completed revision sessions (never affects syllabus %). */
  revisionCount?: number;
  /** Expected A/L date "YYYY-MM-DD"; countdown hides when unset. */
  examDate?: string | null;
  /** Optional Z-score goal + motivation note for the goals strip. */
  targetZScore?: string | null;
  motivationNote?: string | null;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  onTestSmartReminder?: () => void;
  onTestNudge?: () => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleTask: (taskId: string) => void;
  username?: string | null;
  onNavigateToSettings?: () => void;
  /** Student's personal daily-hours goal (used until the admin target syncs). */
  dailyHoursGoal?: number;
  /** Signed-in student's id — highlights their row on the leaderboard. */
  currentUserId?: string | null;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stream,
  physicalScienceElective = 'Chemistry',
  timetableEntries,
  dailyTasks,
  syllabusTopics,
  streakData = { currentStreak: 0, bestStreak: 0, completedDates: [], isCompletedToday: false },
  revisionCount = 0,
  notificationPermission,
  onRequestNotificationPermission,
  onNavigate,
  onToggleTask,
  username,
  examDate = null,
  targetZScore = null,
  motivationNote = null,
  onNavigateToSettings,
  dailyHoursGoal = 2,
  currentUserId = null,
}) => {
  const todayStr = getTodayDateString();
  const todayDayOfWeek = getTodayDayOfWeek();

  // Dismissible notification prompts: "Later"/X snoozes for 7 days via the
  // key shared with the floating banner, so dismissed students are never
  // nagged on every app open. The snooze event keeps this in sync when the
  // floating banner is dismissed in the same tab.
  const [promptSnoozed, setPromptSnoozed] = useState<boolean>(() => isPushPromptSnoozed());
  const [blockedSnoozed, setBlockedSnoozed] = useState<boolean>(() => isBlockedPromptSnoozed());
  useEffect(() => {
    const refresh = () => {
      setPromptSnoozed(isPushPromptSnoozed());
      setBlockedSnoozed(isBlockedPromptSnoozed());
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener(PUSH_PROMPT_SNOOZED_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(PUSH_PROMPT_SNOOZED_EVENT, refresh);
    };
  }, []);

  // Selected stream subjects:
  // Physical Science: Combined Mathematics, Physics, and either Chemistry OR ICT
  // Biological Science: Biology, Chemistry, Physics (Combined Maths replaced with Biology)
  const streamSubjectMetas = getSubjectsForStream(stream, physicalScienceElective);

  // Today's timetable entries
  const todayBlocks = timetableEntries
    .filter((e) => e.dayOfWeek === todayDayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Today's tasks
  const todayTasksList = dailyTasks.filter((t) => t.date === todayStr);
  const completedTodayTasks = todayTasksList.filter((t) => t.isCompleted).length;
  const totalTodayTasks = todayTasksList.length;
  const todayTaskPercent = totalTodayTasks === 0 ? 0 : Math.round((completedTodayTasks / totalTodayTasks) * 100);

  // Overall syllabus completion across the stream's 3 exact subjects
  const streamProgression = calculateOverallStreamProgression(streamSubjectMetas, syllabusTopics);
  const totalTopicsCount = streamProgression.totalTopics;
  const completedTopicsCount = streamProgression.completedTopics;
  const overallSyllabusPercent = streamProgression.totalPercentage;

  // Calculate total scheduled hours for today
  let totalTodayMinutes = 0;
  todayBlocks.forEach((b) => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0) totalTodayMinutes += diff;
  });
  const todayHoursFormatted = (totalTodayMinutes / 60).toFixed(1);

  // Find next upcoming block today
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nextBlock = todayBlocks.find((b) => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    return sh * 60 + sm >= currentMinutes;
  }) || todayBlocks[0];

  // A/L exam countdown (hidden until a date is set in sign-up or Settings)
  const examCountdown = (() => {
    if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return null;
    const [y, m, d] = examDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    return { days, label: target.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) };
  })();

  return (
    <div id="dashboard-overview-view" className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* A/L Exam Countdown — prominent, hidden when no date is set */}
      {examCountdown && (
        <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-[#1E1835] to-[#6B4EFF]/20 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-3">
            <div className="text-3xl sm:text-4xl">🎯</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {examCountdown.label}
              </div>
              <div className="text-xl sm:text-2xl font-black text-white leading-tight">
                {examCountdown.days < 0 ? (
                  <>Your A/L exam season is here — finish strong! 💪</>
                ) : examCountdown.days === 0 ? (
                  <>Your A/Ls start <span className="text-amber-300">today</span> — good luck! 🍀</>
                ) : examCountdown.days === 1 ? (
                  <>Only <span className="text-amber-300">1 day</span> until your A/Ls</>
                ) : (
                  <><span className="text-amber-300">{examCountdown.days} days</span> until your A/Ls</>
                )}
              </div>
            </div>
          </div>
          {onNavigateToSettings && (
            <button
              onClick={onNavigateToSettings}
              className="text-[11px] font-bold text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer shrink-0 self-start sm:self-center"
            >
              Change date
            </button>
          )}
        </div>
      )}
      {/* Goals strip — Z-score target + personal note (hidden when unset) */}
      {(targetZScore?.trim() || motivationNote?.trim()) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-md">
          {targetZScore?.trim() && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
              <span className="text-sm">🎯</span>
              <span>Target: <span className="text-cyan-300">{targetZScore.trim()} Z-score</span></span>
            </span>
          )}
          {motivationNote?.trim() && (
            <span className="text-xs text-slate-300 italic leading-relaxed">
              💬 “{motivationNote.trim()}”
            </span>
          )}
        </div>
      )}
      {/* Notification status banners — both dismissible (7-day snooze) so they
          never nag on every app open. Full guidance always remains in Settings. */}
      {notificationPermission === 'denied' && !blockedSnoozed ? (
        <div className="relative rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-[#1E1835] to-purple-500/15 p-3.5 sm:p-4 backdrop-blur-md shadow-lg animate-fadeIn">
          <button
            onClick={() => {
              snoozeBlockedPrompt();
              setBlockedSnoozed(true);
            }}
            aria-label="Dismiss blocked-reminders notice for 7 days"
            title="Dismiss for 7 days"
            className="absolute top-2 right-2 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <BellOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-rose-200">
                Reminders are blocked in your browser ⛔
              </h4>
              <p className="text-[11px] text-slate-300">
                No worries — this happens with one accidental tap. Follow the steps below to turn them back on.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <BrowserReenableSteps />
          </div>
        </div>
      ) : notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && !promptSnoozed && (
        <div className="relative rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[#1E1835] to-purple-500/15 p-3.5 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <button
            onClick={() => {
              snoozePushPrompt();
              setPromptSnoozed(true);
            }}
            aria-label="Dismiss reminders prompt for 7 days"
            title="Dismiss for 7 days"
            className="absolute top-2 right-2 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <BellOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                🔔 Turn on reminders to stay on track
              </h4>
              <p className="text-[11px] text-slate-300">
                Get reminded when it&apos;s time to study, keep your streak alive, and stay on track for your A/Ls.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-start sm:justify-end shrink-0">
            <button
              onClick={onRequestNotificationPermission}
              id="btn-banner-allow-notifications"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] text-xs font-bold text-white transition shadow-md cursor-pointer min-h-[44px] flex items-center gap-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>Enable</span>
            </button>
            <button
              onClick={() => {
                playStudyChime();
              }}
              title="Test audio chime"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-cyan-300 transition cursor-pointer min-h-[44px] flex items-center gap-1.5"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Chime</span>
            </button>
            <button
              onClick={() => {
                snoozePushPrompt();
                setPromptSnoozed(true);
              }}
              className="px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition cursor-pointer min-h-[44px]"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* PWA Install Promotion Card */}
      <PWAInstallButton variant="card" />

      {/* Hero Welcome Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1B1647] via-[#12142B] to-[#0D0F1F] p-5 sm:p-7 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6B4EFF]/20 border border-[#6B4EFF]/40 text-cyan-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  GCE A/L Sri Lanka •{' '}
                  {stream === 'Biological Science' || (stream as string) === 'Bio'
                    ? 'Biological Science Stream'
                    : 'Physical Science Stream'}
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              {username ? (
                <>
                  Hi, <span className="bg-gradient-to-r from-cyan-400 to-[#8B5CF6] bg-clip-text text-transparent">{username}</span>! Ready for daily revision today?
                </>
              ) : (
                'Ready for daily revision today?'
              )}
            </h1>
          </div>

          {/* Quick Navigation Action Cards */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('planner')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition shadow-[0_0_20px_rgba(107,78,255,0.4)] hover:scale-105 active:scale-95 cursor-pointer min-h-[48px]"
            >
              <Calendar className="w-4 h-4" />
              <span>Open Timetable</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={() => onNavigate('planner')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition cursor-pointer min-h-[48px]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Daily Tasks</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🎯 Daily Target — admin-set global goal + quiz CTA */}
      <DailyTargetCard
        tasks={dailyTasks}
        personalHoursGoal={dailyHoursGoal}
        onOpenPlanner={() => onNavigate('planner')}
      />

      {/* Overview Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Today's Tasks */}
        <div
          onClick={() => onNavigate('planner')}
          className="rounded-2xl border border-white/10 bg-[#161831]/80 hover:border-emerald-400/40 p-4 sm:p-5 backdrop-blur-md shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate min-w-0">Daily Tasks Done</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {completedTodayTasks}/{totalTodayTasks}
            </span>
            <span className="text-xs font-bold text-emerald-400">({todayTaskPercent}%)</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${todayTaskPercent}%` }} />
          </div>
        </div>

        {/* Metric 2: Today's Study Hours */}
        <div
          onClick={() => onNavigate('planner')}
          className="rounded-2xl border border-white/10 bg-[#161831]/80 hover:border-cyan-400/40 p-4 sm:p-5 backdrop-blur-md shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate min-w-0">Today's Study Hours</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{todayHoursFormatted}</span>
            <span className="text-xs font-bold text-slate-400">hrs planned</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {todayBlocks.length} scheduled revision blocks
          </div>
        </div>

        {/* Metric 3: Overall Syllabus Covered */}
        <div
          onClick={() => onNavigate('topics')}
          className="rounded-2xl border border-white/10 bg-[#161831]/80 hover:border-purple-400/40 p-4 sm:p-5 backdrop-blur-md shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate min-w-0">Syllabus Covered</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{overallSyllabusPercent}%</span>
            <span className="text-xs font-bold text-purple-300">
              {completedTopicsCount}/{totalTopicsCount}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full" style={{ width: `${overallSyllabusPercent}%` }} />
          </div>
        </div>

        {/* Metric 4: Exam Readiness & Consistency */}
        <div
          onClick={() => onNavigate('planner')}
          className="rounded-2xl border border-white/10 bg-[#161831]/80 hover:border-amber-400/40 p-4 sm:p-5 backdrop-blur-md shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate min-w-0">Study Streak</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition">
              <Flame className="w-4 h-4 fill-amber-400/50" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-300">
              🔥 {streakData.currentStreak} {streakData.currentStreak === 1 ? 'Day' : 'Days'}
            </span>
            <span className="text-xs font-bold text-amber-400/80">
              {streakData.isCompletedToday ? 'Done today! 🎉' : streakData.currentStreak > 0 ? 'Active' : 'Start Today!'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Best: {streakData.bestStreak} days</span>
            </span>
            <span className="text-slate-400 text-[10px] font-medium">
              {streakData.isCompletedToday ? 'Protected ✓' : 'Complete 1 task today'}
            </span>
          </div>
        </div>
      </div>

      {/* Revision habit strip — additive bonus stat, separate from syllabus % */}
      <div className="rounded-2xl border border-teal-400/30 bg-gradient-to-r from-teal-500/10 via-[#141A33] to-[#141A33] p-4 sm:p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-teal-200">
              🔁 {revisionCount} revision{revisionCount === 1 ? '' : 's'} done — revising keeps it fresh!
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Revision is a bonus habit: it never changes syllabus % and never penalizes you. Mark a completed topic&apos;s Revision block done to grow this counter.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('planner')}
          className="px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-xs font-bold text-teal-200 transition cursor-pointer shrink-0 min-h-[40px]"
        >
          Revise a completed topic
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Today's Tasks & Next Study Block */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks Section */}
          <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Today's Revision Tasks</h3>
                  <p className="text-xs text-slate-400">
                    {completedTodayTasks} of {totalTodayTasks} topics completed today
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* List of Tasks */}
            {todayTasksList.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-300">No tasks logged yet for today.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Import scheduled study blocks from your timetable or add custom past paper goals.
                </p>
                <button
                  onClick={() => onNavigate('planner')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition cursor-pointer min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open Daily Planner</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayTasksList.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onToggleTask(task.id)}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer group ${
                      task.isCompleted
                        ? 'border-emerald-500/30 bg-emerald-950/15 opacity-70'
                        : 'border-white/10 bg-white/5 hover:border-cyan-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-[40px] min-h-[40px] flex items-center justify-center text-cyan-400">
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 mr-2">
                          {task.subject}
                        </span>
                        {task.blockType === 'revision' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-200 border border-teal-400/40 mr-2">
                            🔁 Revision
                          </span>
                        )}
                        {task.blockType !== 'revision' && !task.topicId && (
                          <span
                            title="Ticking this done won't move syllabus % — link a syllabus topic in the Planner to count it."
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/40 mr-2"
                          >
                            Not linked
                          </span>
                        )}
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            task.isCompleted ? 'text-slate-400 line-through' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                    </div>

                    {task.estimatedMinutes && (
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedMinutes}m
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Timetable Routine */}
          <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{todayDayOfWeek}'s Scheduled Timetable</h3>
                  <p className="text-xs text-slate-400">Color-coded study slots for today</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
              >
                <span>Edit Routine</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {todayBlocks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-400">
                <p className="text-xs font-semibold text-slate-300">No timetable blocks set for {todayDayOfWeek}.</p>
                <button
                  onClick={() => onNavigate('planner')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition cursor-pointer min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Timetable Blocks</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {todayBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                      block.blockType === 'revision'
                        ? 'border-teal-400/40 bg-teal-500/[0.07] hover:border-teal-300/60'
                        : 'border-white/10 bg-white/5 hover:border-cyan-400/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-cyan-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {block.startTime} – {block.endTime}
                        </span>
                        {block.reminderEnabled && (
                          <span className="text-[10px] text-emerald-300 flex items-center gap-0.5">
                            <Bell className="w-2.5 h-2.5" />
                            <span>{block.reminderOffsetMinutes}m</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white block">
                        {block.subject}
                        {block.blockType === 'revision' && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-200 border border-teal-400/40">
                            🔁 Revision
                          </span>
                        )}
                      </span>
                      <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{block.topic}</p>
                    </div>

                    {block.notes && (
                      <span className="mt-2 text-[10px] text-slate-400 line-clamp-1 italic">
                        "{block.notes}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Subject Completion & Weekly Rhythm */}
        <div className="space-y-6">
          {/* Subject Completion Breakdown */}
          <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Subject Syllabus Status</span>
              </h3>
              <button
                onClick={() => onNavigate('topics')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
              >
                Track
              </button>
            </div>

            <div className="space-y-3.5">
              {streamSubjectMetas.map((s) => {
                const sProg = calculateSubjectProgression(s.name, syllabusTopics);
                const sPercent = sProg.percentage;
                const sDone = sProg.completedTopics;
                const sTotal = sProg.totalTopics;

                return (
                  <div
                    key={s.id}
                    onClick={() => onNavigate('topics')}
                    className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-purple-400/40 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
                      <div className="flex items-center gap-2 text-white">
                        <span>{s.icon}</span>
                        <span>{s.name}</span>
                      </div>
                      <span className="text-cyan-300">{sPercent}%</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] to-cyan-400"
                        style={{ width: `${sPercent}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{sDone} of {sTotal} units done</span>
                      <span className="text-slate-500">Tap to update</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Rhythm Mini View */}
          <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Weekly Revision Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Planned study sessions distributed across each day of the week:
            </p>

            <div className="grid grid-cols-7 gap-1 pt-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayAbbr, idx) => {
                const fullDays: TimetableEntry['dayOfWeek'][] = [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ];
                const dayName = fullDays[idx];
                const count = timetableEntries.filter((e) => e.dayOfWeek === dayName).length;
                const isToday = dayName === todayDayOfWeek;

                return (
                  <div
                    key={dayAbbr}
                    className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl border text-center min-w-0 ${
                      isToday
                        ? 'border-cyan-400/50 bg-cyan-950/30'
                        : 'border-white/5 bg-white/5'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-slate-400 truncate">{dayAbbr}</span>
                    <span className={`text-sm font-black my-1 ${isToday ? 'text-cyan-300' : 'text-white'}`}>
                      {count}
                    </span>
                    <span className="hidden min-[420px]:block text-[9px] text-slate-500">blocks</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 🏆 Leaderboard preview — every student sees the friendly competition */}
      <Leaderboard
        currentUserId={currentUserId}
        compact
        onViewAll={() => onNavigate('progress')}
      />
    </div>
  );
};
