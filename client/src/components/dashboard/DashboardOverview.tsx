import { normalizeBatch } from '../../lib/batches';
import React from 'react';
import { DailyTask, ScreenId, StreamType, SyllabusTopic, TimetableEntry, StreakData } from '../../types';
import {
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  Plus,
  Trophy,
  Zap,
  CalendarDays,
} from 'lucide-react';
import { getTodayDateString, getTodayDayOfWeek } from '../../lib/storage';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import { PWAInstallButton } from '../PWAInstallButton';
import { SubjectIcon } from '../common/SubjectIcon';
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
  pomodoroSlot?: React.ReactNode;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stream,
  physicalScienceElective,
  timetableEntries,
  timetable,
  dailyTasks = [],
  syllabusTopics = [],
  userProfile,
  userSettings,
  onNavigate,
  username,
  examDate = null,
  onNavigateToSettings,
  pomodoroSlot,
  onOpenProfileEdit,
}) => {
  const effectiveStream = stream || userSettings?.stream || 'Physical Science';
  const effectiveElective = physicalScienceElective || userSettings?.physicalScienceElective || 'Chemistry';
  const effectiveTimetable = timetableEntries || timetable || [];
  const effectiveDailyTasks = dailyTasks || [];
  const effectiveTopics = syllabusTopics || [];

  const studentName = username || userProfile?.name || userSettings?.studentName || 'A/L Scholar';
  const todayStr = getTodayDateString();
  const todayDayOfWeek = getTodayDayOfWeek();

  const streamSubjectMetas = getSubjectsForStream(effectiveStream, effectiveElective);

  // Today's timetable entries
  const todayBlocks = (effectiveTimetable || [])
    .filter((e) => e && e.dayOfWeek === todayDayOfWeek)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Overall syllabus completion
  const streamProgression = calculateOverallStreamProgression(streamSubjectMetas, effectiveTopics);
  const totalTopicsCount = streamProgression.totalTopics;
  const completedTopicsCount = streamProgression.completedTopics;
  const overallSyllabusPercent = streamProgression.totalPercentage;

  // Exam countdowns for both 2027 and 2028 batches
  const calcDaysLeft = (dateStr?: string, defaultDays = 150) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return defaultDays;
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    if (Number.isNaN(target.getTime())) return defaultDays;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  };

  const date2027 = (() => {
    try {
      return localStorage.getItem('mindmaze_global_exam_date_2027') || '2027-11-25';
    } catch {
      return '2027-11-25';
    }
  })();

  const date2028 = (() => {
    try {
      return localStorage.getItem('mindmaze_global_exam_date_2028') || '2028-11-25';
    } catch {
      return '2028-11-25';
    }
  })();

  const examDaysLeft2027 = calcDaysLeft(date2027, 605);
  const examDaysLeft2028 = calcDaysLeft(date2028, 970);
  const myBatchYear = normalizeBatch(userProfile?.targetYear || userSettings?.targetExamYear);

  const handleOpenSettings = () => {
    if (onOpenProfileEdit) {
      onOpenProfileEdit();
    } else if (onNavigateToSettings) {
      onNavigateToSettings();
    } else if (onNavigate) {
      onNavigate('settings');
    }
  };

  return (
    <div id="dashboard-overview-view" className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* ── Welcome Block (Compact) ── */}
      <div className="glass-card rounded-2xl p-4 sm:p-5.5 relative overflow-hidden shadow-xl border border-white/15">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold inline-flex items-center gap-1.5 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="truncate">{effectiveStream} {effectiveStream.includes('Physical') ? `(${effectiveElective})` : ''}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">{studentName}</span>!
            </h1>

            <p className="text-xs text-slate-300 leading-normal line-clamp-1 sm:line-clamp-none">
              Stay consistent with your daily study goals and master topics step by step.
            </p>
          </div>

          {/* Exam Days Badges for Both Batches */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* 2027 Batch Badge */}
            <div className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl backdrop-blur-xl text-center min-w-[110px] sm:min-w-[125px] shadow-sm transition-all ${
              myBatchYear === '2027'
                ? 'bg-amber-500/15 border-2 border-amber-400/60 ring-2 ring-amber-400/20'
                : 'bg-white/5 border border-white/10 opacity-80 hover:opacity-100'
            }`}>
              <span className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight leading-none">{examDaysLeft2027}</span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">
                Days to 2027 Batch Exam
              </span>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-bold mt-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>2027 Batch</span>
              </div>
            </div>

            {/* 2028 Batch Badge */}
            <div className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl backdrop-blur-xl text-center min-w-[110px] sm:min-w-[125px] shadow-sm transition-all ${
              myBatchYear === '2028'
                ? 'bg-cyan-500/15 border-2 border-cyan-400/60 ring-2 ring-cyan-400/20'
                : 'bg-white/5 border border-white/10 opacity-80 hover:opacity-100'
            }`}>
              <span className="text-xl sm:text-2xl font-black text-cyan-300 tracking-tight leading-none">{examDaysLeft2028}</span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">
                Days to 2028 Batch Exam
              </span>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[9px] font-bold mt-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>2028 Batch</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── How It Works (Short & Sleek) ── */}
      <div className="glass-card rounded-2xl p-3.5 sm:p-4 border border-white/10 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-white">How It Works</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">5-step daily study loop</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            {
              step: '1',
              icon: <BookOpen className="w-4 h-4" />,
              color: 'cyan',
              title: 'Track Syllabus',
              desc: 'Tick off lessons',
              screen: 'topics' as ScreenId,
            },
            {
              step: '2',
              icon: <CalendarDays className="w-4 h-4" />,
              color: 'indigo',
              title: 'Plan Week',
              desc: 'Add study blocks',
              screen: 'planner' as ScreenId,
            },
            {
              step: '3',
              icon: <Clock className="w-4 h-4" />,
              color: 'purple',
              title: 'Pomodoro',
              desc: 'Focus with timed sessions',
              screen: 'dashboard' as ScreenId,
            },
            {
              step: '4',
              icon: <Sparkles className="w-4 h-4" />,
              color: 'amber',
              title: 'Quizzes · Beta',
              desc: 'Coming soon',
              screen: 'quiz' as ScreenId,
            },
            {
              step: '5',
              icon: <Trophy className="w-4 h-4" />,
              color: 'emerald',
              title: 'Rankings',
              desc: 'Climb leaderboard',
              screen: 'leaderboard' as ScreenId,
            },
          ].map((item) => {
            const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
              indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-400/20 hover:border-indigo-400/40', text: 'text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' },
              cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-400/20 hover:border-cyan-400/40',   text: 'text-cyan-300',   badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' },
              purple: { bg: 'bg-purple-500/10',  border: 'border-purple-400/20 hover:border-purple-400/40', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
              amber:  { bg: 'bg-amber-500/10',   border: 'border-amber-400/20 hover:border-amber-400/40',  text: 'text-amber-300',  badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
              emerald:{ bg: 'bg-emerald-500/10', border: 'border-emerald-400/20 hover:border-emerald-400/40',text: 'text-emerald-300',badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
            };
            const c = colorMap[item.color];
            return (
              <button
                key={item.step}
                onClick={() => onNavigate(item.screen)}
                className={`group flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer hover:bg-white/[0.04] active:scale-95 ${c.bg} ${c.border}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.badge}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-slate-400">#{item.step}</span>
                    <span className="text-[11px] font-bold text-white truncate">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {pomodoroSlot && (
        <div className="animate-fadeIn">
          {pomodoroSlot}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('planner')}
          className="glass-card glass-card-hover p-4 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Study Planner</span>
            <span className="text-[10px] text-slate-400">Timetable & Slots</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('topics')}
          className="glass-card glass-card-hover p-4 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Syllabus Tracker</span>
            <span className="text-[10px] text-slate-400">Tick Lessons</span>
          </div>
        </button>

        <button
          disabled
          onClick={() => onNavigate('quiz')}
          className="glass-card glass-card-hover p-4 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Practice MCQ · Beta</span>
            <span className="text-[10px] text-slate-400">Test Mastery</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('leaderboard')}
          className="glass-card glass-card-hover p-4 rounded-2xl flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Leaderboard</span>
            <span className="text-[10px] text-slate-400">Rank & Hours</span>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overall Syllabus Progress */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Syllabus Master Progress</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Overall completion across all stream subjects
              </p>
            </div>

            <button
              onClick={() => onNavigate('topics')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition cursor-pointer"
            >
              <span>Track Units</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Overall Percentage Bar */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Overall Syllabus Covered</span>
              <span className="text-cyan-300 font-black text-base">{overallSyllabusPercent}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-400 to-cyan-400 transition-all duration-500 shadow-sm"
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
                  onClick={() => onNavigate('topics')}
                  className="glass-card-hover p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-400/50 transition cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white flex items-center gap-2 truncate">
                      <SubjectIcon subject={s.name} className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="text-cyan-300 shrink-0 font-black">{sProg.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      style={{ width: `${sProg.percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {sProg.completedTopics} of {sProg.totalTopics} units complete
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-3xl p-6 space-y-5 flex flex-col justify-between shadow-xl">
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
                  onClick={() => onNavigate('planner')}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                  title="Add Study Block"
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
                    onClick={() => onNavigate('planner')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold hover:brightness-110 transition cursor-pointer"
                  >
                    Set Schedule
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {todayBlocks.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onNavigate('planner')}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-400/40 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
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
              onClick={() => onNavigate('planner')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <span>Open Study Planner & Timetable</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <PWAInstallButton variant="card" />
        </div>
      </div>
    </div>
  );
};
