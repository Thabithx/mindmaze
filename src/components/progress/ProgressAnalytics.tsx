import React, { useMemo, useRef, useState } from 'react';
import { DailyTask, StreamType, SyllabusTopic, TimetableEntry, UserSettings } from '../../types';
import {
  BarChart3,
  TrendingUp,
  Target,
  Trophy,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Zap,
  Sparkles,
} from 'lucide-react';
import { SUBJECT_METAS, getSubjectsForStream } from '../../data/alSyllabusData';
import { Leaderboard } from '../leaderboard/Leaderboard';
import {
  calculateOverallStreamProgression,
  calculateSubjectProgression,
} from '../../lib/syllabusProgression';
import { calculateMinutesBetween } from '../../lib/storage';

interface ProgressAnalyticsProps {
  stream: StreamType;
  syllabusTopics: SyllabusTopic[];
  timetableEntries: TimetableEntry[];
  dailyTasks: DailyTask[];
  settings: UserSettings;
  /** Separate additive habit stat (completing revisions never moves syllabus %). */
  revisionCount?: number;
  /** Signed-in student's id — highlights their row on the leaderboard. */
  currentUserId?: string | null;
}

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  stream,
  syllabusTopics,
  timetableEntries,
  dailyTasks,
  settings,
  revisionCount = 0,
  currentUserId = null,
}) => {
  // Daily study hour goal drives the weekly target (weekly = daily x 7)
  const dailyGoal = settings.dailyHoursGoal ?? Math.round((settings.weeklyHoursGoal / 7) * 10) / 10;
  const weeklyGoal = Math.round(dailyGoal * 7 * 10) / 10;

  // Get subjects for this student's stream (Physical Science: Combined Maths, Physics, Chem/ICT; Biological Science: Biology, Chem, Physics)
  const streamSubjects = getSubjectsForStream(stream, settings.physicalScienceElective);
  const streamProgression = calculateOverallStreamProgression(streamSubjects, syllabusTopics);

  const totalTopics = streamProgression.totalTopics;
  const completedTopics = streamProgression.completedTopics;
  const inProgressTopics = streamProgression.inProgressTopics;
  const notStartedTopics = streamProgression.notStartedTopics;
  const syllabusPercent = streamProgression.totalPercentage;
  const completedSubtopics = streamProgression.completedSubtopics;
  const totalSubtopics = streamProgression.totalSubtopics;

  // Calculate total weekly timetable hours
  let totalWeeklyMinutes = 0;
  timetableEntries.forEach((entry) => {
    const [sh, sm] = entry.startTime.split(':').map(Number);
    const [eh, em] = entry.endTime.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0) totalWeeklyMinutes += diff;
  });
  const weeklyHours = Math.round((totalWeeklyMinutes / 60) * 10) / 10;
  const weeklyGoalPercent = Math.min(100, Math.round((weeklyHours / weeklyGoal) * 100));

  // Daily task completion stats
  const totalTasksAllTime = dailyTasks.length;
  const completedTasksAllTime = dailyTasks.filter((t) => t.isCompleted).length;

  // Weekday names for week calculations (Mon-Sun)
  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

  // Week-to-week analysis from daily tasks (actual logged time per calendar date)
  const [weekOffset, setWeekOffset] = useState(0);
  // daily = 7 day bars for one week; weekly = 7 days collapse into 1 bar per week for comparison
  const [weekChartMode, setWeekChartMode] = useState<'daily' | 'weekly'>('daily');

  const taskMinutesOf = (t: DailyTask): number => {
    if (typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0) return t.estimatedMinutes;
    if (t.startTime && t.endTime) {
      try {
        return calculateMinutesBetween(t.startTime, t.endTime);
      } catch {
        return 60;
      }
    }
    if (t.timeSlot && t.timeSlot.includes('-')) {
      const [s, e] = t.timeSlot.split('-').map((p) => p.trim());
      if (s && e && s.includes(':') && e.includes(':')) {
        try {
          return calculateMinutesBetween(s, e);
        } catch {
          return 60;
        }
      }
    }
    return 60;
  };

  // Paging bounds: earliest week with any logged task → current week.
  // Prev stops at the first week the user worked; Next stops at this week.
  const minWeekOffset = useMemo(() => {
    if (dailyTasks.length === 0) return 0;
    try {
      const dates = dailyTasks.map((t) => t.date).filter(Boolean).sort();
      const [y, m, d] = dates[0].split('-').map(Number);
      const first = new Date(y, m - 1, d);
      if (Number.isNaN(first.getTime())) return 0;
      const toMonday = (dt: Date) => {
        const mm = new Date(dt);
        mm.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
        mm.setHours(0, 0, 0, 0);
        return mm;
      };
      const diffWeeks = Math.round(
        (toMonday(new Date()).getTime() - toMonday(first).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      return -Math.max(0, diffWeeks);
    } catch {
      return 0;
    }
  }, [dailyTasks]);
  const clampedWeekOffset = Math.max(minWeekOffset, Math.min(0, weekOffset));

  const weekData = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const dayIdx = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - dayIdx + clampedWeekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return { date: d, dateStr: `${y}-${m}-${dd}`, dayName: WEEK_DAYS[i] };
    });

    const taskMinutes = taskMinutesOf;

    // Timetable fallback: if a day has no logged daily tasks, use the recurring
    // timetable template for that weekday so the chart never shows 0 when a plan exists.
    const planMinutesByDay: Record<string, number> = {
      Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0,
    };
    timetableEntries.forEach((entry) => {
      const s = entry.startTime.split(':').map(Number);
      const e = entry.endTime.split(':').map(Number);
      const diff = e[0] * 60 + e[1] - (s[0] * 60 + s[1]);
      if (diff > 0 && entry.dayOfWeek in planMinutesByDay) {
        planMinutesByDay[entry.dayOfWeek] += diff;
      }
    });

    const perDay = days.map((day) => {
      const dayTasks = dailyTasks.filter((t) => t.date === day.dateStr);
      const taskTotalMins = dayTasks.reduce((sum, t) => sum + taskMinutes(t), 0);
      const doneMins = dayTasks.filter((t) => t.isCompleted).reduce((sum, t) => sum + taskMinutes(t), 0);
      // Fall back to timetable plan when nothing is logged for that date.
      const totalMins = taskTotalMins > 0 ? taskTotalMins : (planMinutesByDay[day.dayName] || 0);
      const fromPlan = taskTotalMins === 0 && (planMinutesByDay[day.dayName] || 0) > 0;
      return {
        ...day,
        totalHours: Math.round((totalMins / 60) * 10) / 10,
        doneHours: Math.round((doneMins / 60) * 10) / 10,
        taskCount: dayTasks.length,
        doneCount: dayTasks.filter((t) => t.isCompleted).length,
        fromPlan,
      };
    });

    const weekTotal = Math.round(perDay.reduce((s, d) => s + d.totalHours, 0) * 10) / 10;
    const weekDone = Math.round(perDay.reduce((s, d) => s + d.doneHours, 0) * 10) / 10;
    const startLabel = days[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = days[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const weekLabel = clampedWeekOffset === 0 ? 'This Week' : clampedWeekOffset === -1 ? 'Last Week' : `${startLabel} – ${endLabel}`;
    const maxHrs = Math.max(dailyGoal, ...perDay.map((d) => d.totalHours), 1);
    const todayStr = (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    })();

    return { days: perDay, weekTotal, weekDone, weekLabel, rangeLabel: `${startLabel} – ${endLabel}`, maxHrs, todayStr };
  }, [dailyTasks, dailyGoal, clampedWeekOffset, timetableEntries]);

  // Weekly comparison: every week from the user's first logged week through the
  // latest week (current week, or furthest planned-task week if ahead of it).
  const weeklyHistory = useMemo(() => {
    const toMonday = (d: Date) => {
      const m = new Date(d);
      m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      m.setHours(0, 0, 0, 0);
      return m;
    };
    const parseDateStr = (s: string) => {
      const [y, mo, da] = s.split('-').map(Number);
      return new Date(y, mo - 1, da);
    };
    const now = new Date();
    const thisMonday = toMonday(now);

    // Default window: last 8 weeks (as before) so short histories still show
    // empty runway weeks. Extends back to the first logged week when older.
    let startMonday = new Date(thisMonday);
    startMonday.setDate(thisMonday.getDate() - 7 * 7);
    let endMonday = thisMonday;
    if (dailyTasks.length > 0) {
      const dates = dailyTasks.map((t) => t.date).filter(Boolean).sort();
      const first = parseDateStr(dates[0]);
      const last = parseDateStr(dates[dates.length - 1]);
      if (!Number.isNaN(first.getTime())) {
        const firstMonday = toMonday(first);
        if (firstMonday.getTime() < startMonday.getTime()) startMonday = firstMonday;
      }
      if (!Number.isNaN(last.getTime())) {
        const lastMonday = toMonday(last);
        if (lastMonday.getTime() > endMonday.getTime()) endMonday = lastMonday;
      }
      if (startMonday.getTime() > endMonday.getTime()) startMonday = endMonday;
    }

    const weekCount =
      Math.round((endMonday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    const weeks = Array.from({ length: weekCount }, (_, wIdx) => {
      const monday2 = new Date(startMonday);
      monday2.setDate(startMonday.getDate() + wIdx * 7);
      const days: string[] = Array.from({ length: 7 }, (_, d) => {
        const dt = new Date(monday2);
        dt.setDate(monday2.getDate() + d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      });
      const weekTasks = dailyTasks.filter((t) => days.includes(t.date));
      const totalMins = weekTasks.reduce((s, t) => s + taskMinutesOf(t), 0);
      const doneMins = weekTasks.filter((t) => t.isCompleted).reduce((s, t) => s + taskMinutesOf(t), 0);
      const startL = monday2.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endD = new Date(monday2);
      endD.setDate(monday2.getDate() + 6);
      const endL = endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isCurrent = monday2.getTime() === thisMonday.getTime();
      const isLast = monday2.getTime() === thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000;
      return {
        key: days[0],
        label: isCurrent ? 'This wk' : isLast ? 'Last wk' : `${startL}`,
        subLabel: `${startL}–${endL}`,
        totalHours: Math.round((totalMins / 60) * 10) / 10,
        doneHours: Math.round((doneMins / 60) * 10) / 10,
        isCurrent,
      };
    });
    const maxWk = Math.max(weeklyGoal, ...weeks.map((w) => w.totalHours), 1);
    return { weeks, maxWk };
  }, [dailyTasks, weeklyGoal]);

  // Dynamic drag: leftward drag continuously collapses 7 daily bars into weekly bars.
  // dragProgress 0 = fully daily, 1 = fully weekly. Live during drag, snaps on release.
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ down: false, startX: 0, startScroll: 0, pointerId: -1, baseProgress: 0 });
  const [weekScrolled, setWeekScrolled] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isDraggingWeeks, setIsDraggingWeeks] = useState(false);
  // Weekly comparison is hidden behind the morph by default (distracting).
  // Once combined, user can opt into a clean comparison view with no combined bar in front.
  const [showWeeklyComparison, setShowWeeklyComparison] = useState(false);
  const DRAG_RANGE = 220;
  const targetProgress = isDraggingWeeks ? dragProgress : weekChartMode === 'weekly' ? 1 : 0;
  const isCombined = targetProgress > 0.9;

  const onWeekPointerDown = (e: React.PointerEvent) => {
    const el = weekScrollRef.current;
    if (!el) return;
    dragState.current = {
      down: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      pointerId: e.pointerId,
      baseProgress: weekChartMode === 'weekly' ? 1 : 0,
    };
    setIsDraggingWeeks(true);
    if (e.pointerType === 'mouse' && e.button === 0) {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore if capture unsupported
      }
    }
  };
  const onWeekPointerMove = (e: React.PointerEvent) => {
    const el = weekScrollRef.current;
    if (!el || !dragState.current.down) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) < 4) return;
    if (e.pointerType === 'mouse') {
      e.preventDefault();
      // Still allow inspecting daily bars with small drags; large leftward drag drives collapse.
      if (Math.abs(dx) < 60 && weekChartMode === 'daily') {
        el.scrollLeft = dragState.current.startScroll - dx;
      }
    }
    // Continuous progress: drag left -> 1 (weekly), drag right -> 0 (daily)
    const raw = dragState.current.baseProgress - dx / DRAG_RANGE;
    const clamped = Math.max(0, Math.min(1, raw));
    setDragProgress(clamped);
    setWeekScrolled(clamped > 0.2 || el.scrollLeft > 40);
  };
  const onWeekPointerUp = (e: React.PointerEvent) => {
    const el = weekScrollRef.current;
    if (el && dragState.current.pointerId >= 0) {
      try {
        el.releasePointerCapture(dragState.current.pointerId);
      } catch {
        // ignore
      }
    }
    // Snap to nearest mode for a dynamic but stable end state.
    const finalProgress = dragProgress;
    if (dragState.current.down) {
      if (finalProgress > 0.5) {
        setWeekChartMode('weekly');
        setWeekScrolled(true);
      } else {
        // Stay daily unless already weekly and dragged strongly right
        if (weekChartMode === 'weekly' && finalProgress < 0.5) {
          setWeekChartMode('daily');
          setWeekScrolled(false);
          setShowWeeklyComparison(false);
        } else if (weekChartMode === 'daily') {
          setWeekScrolled(el ? el.scrollLeft > 40 : false);
          setShowWeeklyComparison(false);
        }
      }
    }
    dragState.current.down = false;
    dragState.current.pointerId = -1;
    setIsDraggingWeeks(false);
  };
  const onWeekScroll = () => {
    const el = weekScrollRef.current;
    if (!el) return;
    // Native scroll fallback also drives the contracted glow.
    if (el.scrollWidth > el.clientWidth + 8) {
      setWeekScrolled(el.scrollLeft > 40);
    }
  };

  // Two progress views: content-wise (what you covered) vs time-wise (how long you studied)
  const [activeView, setActiveView] = useState<'content' | 'time'>('content');

  return (
    <div id="progress-analytics-view" className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161831] via-[#12142B] to-[#0F1023] p-4 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Revision Analytics • {stream} Stream</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Progress & Exam Readiness
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Track syllabus completion percentages, study hour volume, and your pathway to a top A/L island rank.
          </p>
        </div>

        {/* Big Overall Score Badge */}
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-[#6B4EFF]/20 border border-[#6B4EFF]/50 shadow-[0_0_20px_rgba(107,78,255,0.3)]">
          <Trophy className="w-8 h-8 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
              Overall Syllabus Covered
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white">{syllabusPercent}%</span>
              <span className="text-xs text-cyan-300 font-bold">ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress View Switcher: Content-wise vs Time-wise */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#161831]/80 p-1.5 backdrop-blur-md w-full sm:w-fit">
        <button
          onClick={() => setActiveView('content')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeView === 'content'
              ? 'bg-[#6B4EFF] text-white shadow-[0_0_12px_rgba(107,78,255,0.4)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Content Progress</span>
        </button>
        <button
          onClick={() => setActiveView('time')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
            activeView === 'time'
              ? 'bg-cyan-500/80 text-white shadow-[0_0_12px_rgba(0,245,255,0.3)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Time Progress</span>
        </button>
      </div>

      {activeView === 'content' ? (
        <div className="space-y-6">
          <p className="text-xs text-slate-400">
            Content Progress — what syllabus topics and units you have actually covered.
          </p>
          {/* Metrics Row - Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit Status Breakdown */}
            <div className="rounded-2xl border border-white/10 bg-[#161831]/80 p-5 backdrop-blur-md shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Syllabus Units Covered</span>
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{completedTopics}</span>
                <span className="text-xs text-emerald-400">of {totalTopics} units completed</span>
              </div>
              <div className="flex gap-1 h-2 w-full rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400"
                  style={{ width: `${totalTopics === 0 ? 0 : (completedTopics / totalTopics) * 100}%` }}
                />
                <div
                  className="bg-amber-400"
                  style={{ width: `${totalTopics === 0 ? 0 : (inProgressTopics / totalTopics) * 100}%` }}
                />
                <div
                  className="bg-slate-600"
                  style={{ width: `${totalTopics === 0 ? 0 : (notStartedTopics / totalTopics) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span className="text-emerald-400 font-bold">{completedTopics} done</span>
                <span className="text-amber-400 font-bold">{inProgressTopics} active</span>
                <span className="text-slate-400 font-bold">{notStartedTopics} pending</span>
              </div>
            </div>

            {/* Subtopics Covered */}
            <div className="rounded-2xl border border-white/10 bg-[#161831]/80 p-5 backdrop-blur-md shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Subtopics Covered</span>
                <Target className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{completedSubtopics}</span>
                <span className="text-xs text-slate-400">of {totalSubtopics} subtopics done</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] to-cyan-400"
                  style={{
                    width: `${totalSubtopics === 0 ? 0 : Math.round((completedSubtopics / totalSubtopics) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Syllabus content mastery across all subjects in your stream.
              </p>
            </div>
          </div>

          {/* Revision habit stat — additive bonus, separate from syllabus % */}
          <div className="rounded-2xl border border-teal-400/30 bg-teal-500/[0.07] p-5 backdrop-blur-md shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-300">🔁 Revision habit (bonus only)</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{revisionCount}</span>
                <span className="text-xs text-slate-300">revision{revisionCount === 1 ? '' : 's'} completed</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tracked separately from first-time topic completions — revising never pushes a subject beyond 100% and never penalizes you.
              </p>
            </div>
            <div className="text-[11px] text-teal-200/90 font-semibold shrink-0">
              {revisionCount === 0
                ? 'Mark a topic completed, then add a Revision block to start.'
                : 'Great habit! Revising keeps it fresh 🔁'}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-slate-400">
            Time Progress — how much study time you have put in and how consistently you execute.
          </p>
          {/* Metrics Row - Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Daily Goal vs Weekly Target */}
            <div className="rounded-2xl border border-white/10 bg-[#161831]/80 p-5 backdrop-blur-md shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Daily Study Hour Goal</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{weeklyHours}</span>
                <span className="text-xs text-slate-400">/ {weeklyGoal} hrs this week ({dailyGoal} hrs/day goal)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-[#6B4EFF]"
                  style={{ width: `${weeklyGoalPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {weeklyGoalPercent >= 100 ? 'Daily goal smashed — weekly time goal exceeded!' : `${Math.round((weeklyGoal - weeklyHours) * 10) / 10} more hours needed this week (about ${dailyGoal} hrs/day).`}
              </p>
            </div>

            {/* Task Completion Rate */}
            <div className="rounded-2xl border border-white/10 bg-[#161831]/80 p-5 backdrop-blur-md shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Tasks Completed on Time</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{completedTasksAllTime}</span>
                <span className="text-xs text-slate-400">of {totalTasksAllTime} study sessions done</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{
                    width: `${
                      totalTasksAllTime === 0 ? 0 : Math.round((completedTasksAllTime / totalTasksAllTime) * 100)
                    }%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Consistent daily study time is the #1 predictor of GCE A/L district merit.
              </p>
            </div>
          </div>

          {/* Week Merge Chart — drag so 7 daily bars join one-by-one into 1 bigger weekly bar */}
          <div className="rounded-2xl border border-white/10 bg-[#161831]/80 p-5 backdrop-blur-md shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>{targetProgress > 0.5 ? 'Weekly Total — 7 Days Joined' : 'This Week — 7 Daily Bars'}</span>
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {minWeekOffset < 0 && (
                  <button
                    onClick={() => {
                      setWeekOffset(minWeekOffset);
                      setShowWeeklyComparison(false);
                    }}
                    disabled={clampedWeekOffset <= minWeekOffset}
                    title="Jump to your first week"
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition min-h-[44px] ${
                      clampedWeekOffset <= minWeekOffset
                        ? 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white cursor-pointer'
                    }`}
                  >
                    ⏮ First
                  </button>
                )}
                <button
                  onClick={() => {
                    setWeekOffset((v) => Math.max(minWeekOffset, v - 1));
                    setShowWeeklyComparison(false);
                  }}
                  disabled={clampedWeekOffset <= minWeekOffset}
                  title={clampedWeekOffset <= minWeekOffset ? 'This is your first week' : 'Previous week'}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition min-h-[44px] ${
                    clampedWeekOffset <= minWeekOffset
                      ? 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  ← Prev
                </button>
                <span className="text-[11px] font-bold text-white px-2 min-w-0 flex-1 sm:flex-none sm:min-w-[110px] text-center truncate">
                  {weekData.weekLabel}
                  <span className="block text-[10px] font-medium text-slate-400 truncate">{weekData.rangeLabel}</span>
                </span>
                    <button
                      onClick={() => {
                        setWeekOffset((v) => Math.min(0, v + 1));
                        setShowWeeklyComparison(false);
                      }}
                  disabled={clampedWeekOffset >= 0}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition min-h-[44px] ${
                    clampedWeekOffset >= 0
                      ? 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white cursor-pointer'
                  }`}
                >
                  Next →
                </button>
                {clampedWeekOffset !== 0 && (
                      <button
                        onClick={() => {
                          setWeekOffset(0);
                          setShowWeeklyComparison(false);
                        }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition cursor-pointer min-h-[44px]"
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={() => {
                    const toWeekly = targetProgress < 0.5;
                    setWeekChartMode(toWeekly ? 'weekly' : 'daily');
                    setDragProgress(toWeekly ? 1 : 0);
                    setWeekScrolled(toWeekly);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#6B4EFF]/20 hover:bg-[#6B4EFF]/30 border border-[#6B4EFF]/50 text-purple-200 text-xs font-bold transition cursor-pointer min-h-[44px]"
                >
                  {targetProgress < 0.5 ? 'Join into 1 →' : '← Split to 7'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {`Drag left and watch the 7 daily bars join one-by-one into 1 bigger weekly bar. ${weekData.weekTotal}h logged vs ${weekData.weekDone}h completed (goal ${weeklyGoal}h).`}
            </p>

            <div
              ref={weekScrollRef}
              onPointerDown={onWeekPointerDown}
              onPointerMove={onWeekPointerMove}
              onPointerUp={onWeekPointerUp}
              onPointerCancel={onWeekPointerUp}
              onScroll={onWeekScroll}
              className="relative overflow-hidden pb-2 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: 'pan-x pan-y' }}
            >
              {/* Morph stage: drag left and the 7 daily bars join one-by-one into one bigger weekly bar.
                  progress 0 = 7 separate daily bars, 1 = single weekly bar. */}
              <div className="relative w-full h-52 pt-2">
                <div className="absolute top-0 inset-x-0 text-center text-[10px] font-bold text-slate-400 truncate px-2">
                  {targetProgress < 0.05
                    ? '7 daily bars — drag left to join them'
                    : targetProgress > 0.95
                      ? `1 weekly bar — ${weekData.weekTotal}h / ${weeklyGoal}h goal`
                      : `${Math.min(7, Math.floor(targetProgress * 7) + 1)} of 7 joined…`}
                </div>
                <div className="absolute inset-x-0 top-6 bottom-8">
                {weekData.days.map((day, i) => {
                  const pctTotal = Math.min(100, Math.round((day.totalHours / weekData.maxHrs) * 100));
                  const pctDone = day.totalHours > 0 ? Math.round((day.doneHours / day.totalHours) * 100) : 0;
                  // Done-hours vs daily goal: below → red, exactly met → yellow, above → green.
                  const goalState =
                    day.doneHours > dailyGoal ? 'above' : day.doneHours >= dailyGoal ? 'met' : 'below';
                  const isToday = day.dateStr === weekData.todayStr;
                  // One-by-one join: bar i merges during progress window [i/7,(i+1)/7]
                  const rawLocal = Math.max(0, Math.min(1, targetProgress * 7 - i));
                  const local = rawLocal * rawLocal * (3 - 2 * rawLocal);
                  const slotW = 100 / 7;
                  const baseLeft = i * slotW + 1.4;
                  const baseW = slotW - 2.8;
                  const targetLeft = 50 - 11;
                  const targetW = 22;
                  const left = baseLeft + (targetLeft - baseLeft) * local;
                  const width = baseW + (targetW - baseW) * local;
                  const weeklyPct = Math.min(96, Math.max(10, weeklyGoal > 0 ? (weekData.weekTotal / weeklyGoal) * 100 : 0));
                  const dayH = day.totalHours > 0 ? Math.max(8, pctTotal) : 4;
                  const height = dayH + (weeklyPct - dayH) * local;
                  return (
                    <div
                      key={day.dateStr}
                      className={`absolute bottom-0 flex flex-col items-center justify-end gap-1 ${isDraggingWeeks ? '' : 'transition-all duration-200 ease-out'}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        height: '100%',
                        zIndex: local > 0.9 ? 5 - i : 10 + i,
                        opacity: 1 - local,
                        visibility: local >= 1 ? 'hidden' : 'visible',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        className={`text-[10px] font-black ${day.totalHours > 0 ? 'text-white' : 'text-slate-600'}`}
                        style={{ opacity: 1 - local }}
                      >
                        {day.totalHours > 0 ? `${day.totalHours}h` : '—'}
                      </span>
                      <div
                        className={`w-full flex flex-col justify-end rounded-lg bg-white/5 border overflow-hidden ${isToday ? 'border-cyan-400/60' : 'border-white/5'}`}
                        style={{ height: `${height}%`, opacity: 1 - local }}
                        title={`${day.dayName} ${day.dateStr}: ${day.doneHours}h done / ${day.totalHours}h logged (${day.doneCount}/${day.taskCount} tasks)`}
                      >
                        <div className="w-full flex flex-col justify-end flex-1">
                          {day.totalHours > day.doneHours && (
                            <div
                              className="w-full bg-amber-400/70"
                              style={{ height: `${Math.max(4, pctTotal - (pctTotal * pctDone) / 100)}%` }}
                            />
                          )}
                          {day.doneHours > 0 && (
                            <div
                              className={`w-full ${
                                goalState === 'above'
                                  ? 'bg-gradient-to-t from-emerald-600 to-emerald-300'
                                  : goalState === 'met'
                                    ? 'bg-gradient-to-t from-amber-500 to-yellow-300'
                                    : 'bg-gradient-to-t from-rose-600 to-rose-400'
                              }`}
                              style={{ height: `${Math.max(8, (pctTotal * pctDone) / 100)}%` }}
                            />
                          )}
                          {day.totalHours === 0 && <div className="w-full bg-white/5" style={{ height: '4%' }} />}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase ${isToday ? 'text-cyan-300' : 'text-slate-500'}`}
                        style={{ opacity: 1 - local }}
                      >
                        {day.dayName.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
                {/* The one bigger weekly bar they merge into */}
                <div
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end gap-1 ${isDraggingWeeks ? '' : 'transition-all duration-300 ease-out'}`}
                  style={{ width: '22%', height: '100%', opacity: targetProgress, zIndex: 20, pointerEvents: targetProgress > 0.5 ? 'auto' : 'none' }}
                >
                  <span className="text-xs font-black text-white whitespace-nowrap">
                    {weekData.weekTotal}h / {weeklyGoal}h
                  </span>
                  <div
                    className="w-full rounded-xl border border-emerald-400/60 bg-emerald-500/15 overflow-hidden shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                    style={{ height: `${Math.min(96, Math.max(10, weeklyGoal > 0 ? (weekData.weekTotal / weeklyGoal) * 100 : 0))}%` }}
                    title={`Weekly total: ${weekData.weekTotal}h planned/logged (${weekData.weekDone}h completed, goal ${weeklyGoal}h)`}
                  >
                    <div className="w-full h-full bg-gradient-to-t from-emerald-600 via-emerald-400 to-cyan-300" style={{ opacity: 0.9 }} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 whitespace-nowrap">Weekly</span>
                </div>
                </div>
              </div>
              {/* Dynamic progress dots */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className={`h-1.5 rounded-full transition-all ${targetProgress < 0.5 ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/20'}`} />
                <span className={`h-1.5 rounded-full transition-all ${targetProgress >= 0.5 ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/20'}`} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/5 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                Below daily goal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />
                Goal met
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
                Above goal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/70 inline-block" />
                Logged but pending
              </span>
              <span className="text-slate-500 hidden sm:inline">
                {targetProgress < 0.5 ? '← drag left: bars join one-by-one into 1 →' : '← drag right: 1 splits back into 7 →'}
              </span>
              <span className="flex items-center gap-1.5 ml-auto">
                {targetProgress < 0.5 ? (
                  <button
                    onClick={() => {
                      setWeekChartMode('weekly');
                      setDragProgress(1);
                      setWeekScrolled(true);
                      setShowWeeklyComparison(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold transition cursor-pointer min-h-[44px]"
                  >
                    Join into 1 →
                  </button>
                ) : (
                  <>
                    {!showWeeklyComparison && (
                      <button
                        onClick={() => setShowWeeklyComparison(true)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold transition cursor-pointer min-h-[44px]"
                      >
                        View weekly comparison
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setWeekChartMode('daily');
                        setDragProgress(0);
                        setWeekScrolled(false);
                        setShowWeeklyComparison(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition cursor-pointer min-h-[44px]"
                    >
                      ← Split to 7
                    </button>
                  </>
                )}
              </span>
            </div>

            {/* Clean weekly comparison — only after combined, only on demand, no combined bar in front */}
            {isCombined && showWeeklyComparison && (
              <div className="rounded-xl border border-cyan-400/30 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-white">
                    {weeklyHistory.weeks.length > 8
                      ? `All ${weeklyHistory.weeks.length} weeks since you started`
                      : 'Last 8 weeks comparison'}
                  </span>
                  <button
                    onClick={() => setShowWeeklyComparison(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition cursor-pointer min-h-[44px]"
                  >
                    ← Back to weekly total
                  </button>
                </div>
                <div className="flex items-end gap-2 h-36 overflow-x-auto pb-1">
                  {weeklyHistory.weeks.map((wk) => {
                    const pct = weeklyHistory.maxWk > 0 ? Math.min(100, Math.round((wk.doneHours / weeklyHistory.maxWk) * 100)) : 0;
                    const metGoal = wk.doneHours >= weeklyGoal && wk.doneHours > 0;
                    return (
                      <div
                        key={wk.key}
                        className={`flex flex-col items-center justify-end gap-1 h-full ${
                          weeklyHistory.weeks.length <= 8 ? 'flex-1 min-w-0' : 'w-[11%] shrink-0'
                        }`}
                        title={`${wk.subLabel}: ${wk.doneHours}h done / ${wk.totalHours}h logged (goal ${weeklyGoal}h)`}
                      >
                        <span className={`text-[10px] font-black ${wk.doneHours > 0 ? 'text-white' : 'text-slate-600'}`}>{wk.doneHours > 0 ? `${wk.doneHours}h` : '—'}</span>
                        <div className={`w-full flex-1 rounded-lg overflow-hidden ${wk.isCurrent ? 'bg-emerald-500/20 border border-emerald-400/50' : 'bg-white/5 border border-white/5'}`}>
                          <div className="w-full h-full flex items-end">
                            <div className={`w-full ${metGoal ? 'bg-emerald-400' : 'bg-cyan-400/70'}`} style={{ height: `${Math.max(wk.doneHours > 0 ? 12 : 4, pct)}%` }} />
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center">{wk.label}</span>
                        <span className="text-[9px] text-slate-600 truncate w-full text-center">{wk.subLabel}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500">Each bar = 1 week total (completed hours) • goal {weeklyGoal}h/week • current week highlighted{weeklyHistory.weeks.length > 8 ? ' • scroll sideways from week 1 →' : ''}.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'content' && (
      <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Content Progress by Subject</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {streamSubjects.map((s) => {
            const sProg = calculateSubjectProgression(s.name, syllabusTopics);
            const sDone = sProg.completedTopics;
            const sActive = sProg.inProgressTopics;
            const sPending = sProg.notStartedTopics;
            const sPercent = sProg.percentage;
            const sSubDone = sProg.completedSubtopics;
            const sSubTotal = sProg.totalSubtopics;

            return (
              <div
                key={s.id}
                className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-sm font-bold text-white line-clamp-1">{s.name}</span>
                  </div>
                  <span className="text-lg font-black text-cyan-300">{sPercent}%</span>
                </div>

                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] to-cyan-400"
                    style={{ width: `${sPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="font-bold text-emerald-400 block">{sDone}</span>
                    <span className="text-[9px] text-slate-400 uppercase">Done</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="font-bold text-amber-400 block">{sActive}</span>
                    <span className="text-[9px] text-slate-400 uppercase">Active</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20">
                    <span className="font-bold text-slate-300 block">{sPending}</span>
                    <span className="text-[9px] text-slate-400 uppercase">Pending</span>
                  </div>
                </div>

                {sSubTotal > 0 && (
                  <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-white/5">
                    <span className="text-cyan-400 font-semibold">{sSubDone}</span> of {sSubTotal} syllabus subtopics completed
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {activeView === 'content' && (
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#121636] to-[#0D1022] p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-cyan-300 text-sm font-bold">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>GCE A/L Preparation Strategies</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="font-bold text-white block">1. 50 MCQ Past Paper Timed Sprints</span>
            <p className="text-slate-400 leading-relaxed">
              Complete full 50-question MCQ simulations strictly within 2 hours. Review every incorrect option on the same day.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="font-bold text-white block">2. Structured Essay Keywords</span>
            <p className="text-slate-400 leading-relaxed">
              Memorize the Department of Examinations marking scheme standard keywords for practicals and theory derivations.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="font-bold text-white block">3. 10-Year Trend Analysis</span>
            <p className="text-slate-400 leading-relaxed">
              Ensure all recurring topics from the last 10 years (e.g., Potentiometers, Coplanar Forces, Buffer Solutions) are marked 'Completed'.
            </p>
          </div>
        </div>
      </div>
      )}

      {/* 🏆 Weekly / Monthly leaderboard — friendly competition on hours */}
      <Leaderboard currentUserId={currentUserId} />
    </div>
  );
};
