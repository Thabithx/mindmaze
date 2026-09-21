import React from 'react';
import { DailyTask, ScreenId, StreamType, SyllabusTopic, TimetableEntry, StreakData } from '../../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  TrendingUp,
  Flame,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Plus,
  Trophy,
  Target,
} from 'lucide-react';
import { getTodayDateString, getTodayDayOfWeek } from '../../lib/storage';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import { PWAInstallButton } from '../PWAInstallButton';
import {
  calculateSubjectProgression,
  calculateOverallStreamProgression,
} from '../../lib/syllabusProgression';

interface DashboardOverviewProps {
  stream?: StreamType;
  physicalScienceElective?: 'Chemistry' | 'ICT';
  timetableEntries?: TimetableEntry[];
  timetable?: TimetableEntry[];
  dailyTasks?: DailyTask[];
  syllabusTopics?: SyllabusTopic[];
  streakData?: StreakData;
  streak?: any;
  userProfile?: any;
  userSettings?: any;
  revisionCount?: number;
  examDate?: string | null;
  targetZScore?: string | null;
  motivationNote?: string | null;
  notificationPermission?: NotificationPermission | 'unsupported';
  onRequestNotificationPermission?: () => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleTask?: (taskId: string) => void;
  username?: string | null;
  onNavigateToSettings?: () => void;
  dailyHoursGoal?: number;
  currentUserId?: string | null;
  onOpenProfileEdit?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stream,
  physicalScienceElective,
  timetableEntries,
  timetable,
  dailyTasks = [],
  syllabusTopics = [],
  streakData,
  streak,
  userProfile,
  userSettings,
  onNavigate,
  onToggleTask = () => {},
  username,
  examDate = null,
  targetZScore = null,
  motivationNote = null,
  onNavigateToSettings,
  onOpenProfileEdit,
}) => {
  const effectiveStream = stream || userSettings?.stream || 'Physical Science';
  const effectiveElective = physicalScienceElective || userSettings?.physicalScienceElective || 'Chemistry';
  const effectiveTimetable = timetableEntries || timetable || [];
  const effectiveDailyTasks = dailyTasks || [];
  const effectiveTopics = syllabusTopics || [];
  const effectiveStreak = streakData || streak || {
    currentStreak: userProfile?.streakDays || 1,
    bestStreak: userProfile?.streakDays || 1,
    completedDates: [],
    isCompletedToday: false,
  };

  const studentName = username || userProfile?.name || userSettings?.studentName || 'A/L Scholar';
  const todayStr = getTodayDateString();
  const todayDayOfWeek = getTodayDayOfWeek();

  const streamSubjectMetas = getSubjectsForStream(effectiveStream, effectiveElective);

  // Today's timetable entries
  const todayBlocks = (effectiveTimetable || [])
    .filter((e) => e && e.dayOfWeek === todayDayOfWeek)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Today's tasks
  const todayTasksList = (effectiveDailyTasks || []).filter((t) => t && t.date === todayStr);
  const completedTodayTasks = todayTasksList.filter((t) => t.isCompleted).length;
  const totalTodayTasks = todayTasksList.length;

  // Overall syllabus completion
  const streamProgression = calculateOverallStreamProgression(streamSubjectMetas, effectiveTopics);
  const totalTopicsCount = streamProgression.totalTopics;
  const completedTopicsCount = streamProgression.completedTopics;
  const overallSyllabusPercent = streamProgression.totalPercentage;

  // Calculate total scheduled hours for today
  let totalTodayMinutes = 0;
  todayBlocks.forEach((b) => {
    if (!b.startTime || !b.endTime) return;
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) totalTodayMinutes += diff;
  });
  const todayHoursFormatted = (totalTodayMinutes / 60).toFixed(1);

  // Exam countdown
  const targetDate = examDate || userSettings?.targetExamDate || userProfile?.examDate;
  const examDaysLeft = (() => {
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return 150;
    const [y, m, d] = targetDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    if (Number.isNaN(target.getTime())) return 150;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  })();

  const handleOpenSettings = () => {
    if (onNavigateToSettings) onNavigateToSettings();
    else if (onNavigate) onNavigate('settings');
  };

  const handleOpenProfile = () => {
    if (onOpenProfileEdit) onOpenProfileEdit();
    else if (onNavigate) onNavigate('settings');
  };

  return (
    <div id="dashboard-overview-view" className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 🌟 TOP HERO HEADER (Arranged by Importance) */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1B1647] via-[#12142B] to-[#0D0F1F] p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#6B4EFF]/20 border border-[#6B4EFF]/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{effectiveStream} ({effectiveElective})</span>
              </span>

              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>🔥 {effectiveStreak.currentStreak} Day Streak</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-300">{studentName}</span>! 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Stay focused, execute your daily study timetable, and master every unit step by step.
            </p>
          </div>

          {/* Exam Days Badge */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shrink-0 text-center min-w-[150px]">
            <div className="text-3xl sm:text-4xl font-black text-amber-300">{examDaysLeft}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
              Days to A/L Exam
            </div>
            <button
              onClick={handleOpenSettings}
              className="mt-2 text-[10px] font-semibold text-purple-300 hover:text-white underline cursor-pointer"
            >
              Update Goal Date
            </button>
          </div>
        </div>
      </div>

      {/* 📊 MIDDLE SECTION: SYLLABUS PROGRESS & TODAY'S SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overall Syllabus Progress */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Syllabus Master Progress</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Overall completion across your 3 stream subjects
              </p>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('topics')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition cursor-pointer"
            >
              <span>Track Units</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Overall Percentage Bar */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Overall Completion</span>
              <span className="text-cyan-300 font-extrabold text-sm">{overallSyllabusPercent}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] via-purple-400 to-cyan-400 transition-all duration-500"
                style={{ width: `${overallSyllabusPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{completedTopicsCount} of {totalTopicsCount} syllabus units completed</span>
              <span className="text-emerald-400 font-semibold">{totalTopicsCount - completedTopicsCount} remaining</span>
            </div>
          </div>

          {/* Individual Stream Subjects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(streamSubjectMetas || []).map((s) => {
              const sProg = calculateSubjectProgression(s.name, effectiveTopics);
              return (
                <div
                  key={s.id}
                  onClick={() => onNavigate && onNavigate('topics')}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/40 transition cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white flex items-center gap-1.5 truncate">
                      <span>{s.icon}</span>
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="text-cyan-300 shrink-0">{sProg.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                      style={{ width: `${sProg.percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {sProg.completedTopics} of {sProg.totalTopics} units done
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Today's Timetable Summary */}
        <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span>Today&apos;s Schedule</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {todayDayOfWeek} • {todayBlocks.length} planned session{todayBlocks.length === 1 ? '' : 's'}
                </p>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('planner')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer"
                title="Open Study Planner"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Today's Blocks List */}
            {todayBlocks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">No study slots scheduled for today.</p>
                <button
                  onClick={() => onNavigate && onNavigate('planner')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#6B4EFF] text-white text-xs font-bold hover:bg-[#5b3eff] transition cursor-pointer"
                >
                  Set Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {todayBlocks.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onNavigate && onNavigate('planner')}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-400/30 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-white truncate">{b.topic}</div>
                        <div className="text-[10px] text-slate-400">{b.subject}</div>
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold text-purple-300 shrink-0">
                      {b.startTime} - {b.endTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate && onNavigate('planner')}
            className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#5b3eff] text-white text-xs font-bold transition shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <span>Open Study Planner & Timetable</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 📱 BOTTOM SECTION: APP REMINDER & INSTALL PROMOTION (At Very Bottom) */}
      <div className="pt-4 border-t border-white/10 space-y-4">
        <PWAInstallButton variant="card" />

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Study reminders and push notifications are active for your timetable slots.</span>
          </div>

          <button
            onClick={handleOpenSettings}
            className="text-purple-300 font-semibold hover:underline cursor-pointer shrink-0 self-start sm:self-auto text-xs"
          >
            Notification Settings
          </button>
        </div>
      </div>
    </div>
  );
};
