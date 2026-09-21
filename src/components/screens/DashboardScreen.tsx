import React, { useState, useEffect } from 'react';
import { ScreenId, UserProfile, StreamType } from '../../types';
import {
  ALL_STREAM_STUDY_PLANS,
  ALL_STREAM_TIMETABLES,
  ALL_STREAM_DAILY_TOPICS,
  GCE_AL_STREAMS,
} from '../../data/streamStudyData';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Zap,
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  Dna,
  Laptop,
  CheckSquare,
  ChevronRight,
  Flame,
  Shield,
  Layers,
  HelpCircle,
  Play,
  RotateCcw,
  Table,
  List,
} from 'lucide-react';
import { ComingSoonModal } from '../ComingSoonModal';

interface DashboardScreenProps {
  userProfile: UserProfile;
  onNavigate: (screen: ScreenId) => void;
  onStartSpecificQuiz?: (questionId?: string, topic?: string) => void;
}

type DashboardTab = 'plans' | 'timetable' | 'topics';

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  userProfile,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('plans');
  const [dashboardTimetableView, setDashboardTimetableView] = useState<'table' | 'cards'>('table');
  const [comingSoonModalSubject, setComingSoonModalSubject] = useState<string | null>(null);

  const currentStream = (userProfile.stream || 'Maths') as StreamType;
  const streamInfo = GCE_AL_STREAMS.find((s) => s.id === currentStream) || GCE_AL_STREAMS[0];

  // Local state for study plans & timetable checkoffs to provide instant interactivity
  const [plans, setPlans] = useState(() => ALL_STREAM_STUDY_PLANS[currentStream] || ALL_STREAM_STUDY_PLANS.Maths);
  const [timetable, setTimetable] = useState(() => {
    try {
      const saved = localStorage.getItem(`al_timetable_${currentStream}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return ALL_STREAM_TIMETABLES[currentStream] || ALL_STREAM_TIMETABLES.Maths;
  });
  const [dailyTopics, setDailyTopics] = useState(() => ALL_STREAM_DAILY_TOPICS[currentStream] || ALL_STREAM_DAILY_TOPICS.Maths);

  // Sync to stream changes
  useEffect(() => {
    setPlans(ALL_STREAM_STUDY_PLANS[currentStream] || ALL_STREAM_STUDY_PLANS.Maths);
    try {
      const saved = localStorage.getItem(`al_timetable_${currentStream}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTimetable(parsed);
          setDailyTopics(ALL_STREAM_DAILY_TOPICS[currentStream] || ALL_STREAM_DAILY_TOPICS.Maths);
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    setTimetable(ALL_STREAM_TIMETABLES[currentStream] || ALL_STREAM_TIMETABLES.Maths);
    setDailyTopics(ALL_STREAM_DAILY_TOPICS[currentStream] || ALL_STREAM_DAILY_TOPICS.Maths);
  }, [currentStream]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`al_timetable_${currentStream}`, JSON.stringify(timetable));
    } catch (e) {
      // ignore
    }
  }, [timetable, currentStream]);

  // Days remaining calculation
  const calculateDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return 73;
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 73;
  };

  const daysLeft = calculateDaysRemaining(userProfile.examDate);

  // Active study plan
  const activePlan = plans.find((p) => p.isActive) || plans[0];

  // Today's timetable slots (default to Monday / today)
  const todaySlots = timetable.filter((s) => s.dayOfWeek === 'Monday');

  // Toggle timetable slot completion directly on dashboard
  const handleToggleSlot = (slotId: string) => {
    setTimetable((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, isCompleted: !s.isCompleted } : s))
    );
  };

  // Toggle checklist on daily topic
  const handleToggleTopicCheck = (topicId: string, checkIndex: number) => {
    setDailyTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        const newChecks = [...t.checklistStatus];
        newChecks[checkIndex] = !newChecks[checkIndex];
        return { ...t, checklistStatus: newChecks };
      })
    );
  };

  // Switch active plan
  const handleSwitchPlan = (planId: string) => {
    setPlans((prev) =>
      prev.map((p) => ({
        ...p,
        isActive: p.id === planId,
      }))
    );
  };

  // List of upcoming features & subjects kept as coming soon (including Physics)
  const comingSoonModules = [
    {
      id: 'physics',
      name: 'Physics (A/L 2000-2026 Archive & MCQs)',
      icon: Atom,
      tag: 'Coming Soon',
      desc: '30+ full past papers, verified Sinhala/English answer schemes, and timed 50-MCQ exams undergoing final 2026 syllabus check.',
    },
    {
      id: 'chemistry',
      name: 'Chemistry Question Bank & Marking Schemes',
      icon: FlaskConical,
      tag: 'Coming Soon',
      desc: 'Inorganic, Organic mechanisms, and Physical chemistry unit-wise past paper questions with step-by-step solutions.',
    },
    {
      id: 'maths',
      name: 'Combined Mathematics Sprints',
      icon: Calculator,
      tag: 'Coming Soon',
      desc: 'Pure & Applied mathematics structured past paper questions with rapid technique breakdowns and formula sheets.',
    },
    {
      id: 'biology',
      name: 'Biology Resource Book MCQ Archive',
      icon: Dna,
      tag: 'Coming Soon',
      desc: 'National Institute of Education (NIE) syllabus aligned Biology past papers, diagrams, and marking scheme rationales.',
    },
    {
      id: 'practice',
      name: 'AI Practice Quiz Engine & Instant Hints',
      icon: Sparkles,
      tag: 'Coming Soon',
      desc: 'Adaptive testing engine that diagnoses knowledge gaps and serves customized question difficulty curves.',
    },
    {
      id: 'mistakes',
      name: 'Smart Mistake Notebook & Error Cleanser',
      icon: BookOpen,
      tag: 'Coming Soon',
      desc: 'Automatic cataloging of incorrect answers with targeted retry drills and conceptual error tags.',
    },
  ];

  return (
    <div id="mind-maze-dashboard-screen" className="max-w-7xl mx-auto w-full space-y-6 pb-12">
      {/* 1. Header Hero Banner: Clean, fitted, responsive */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7 backdrop-blur-md shadow-xl">
        <div className="absolute top-0 right-0 h-48 w-48 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-[#6B4EFF]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-0.5 text-xs font-bold text-purple-200">
                {userProfile.stream} Stream • GCE A/L {userProfile.syllabus === 'current' ? 'Current Syllabus' : 'Old Syllabus'}
              </span>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Study Plans & Timetables Live
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Welcome Back, {userProfile.name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Your exam revision headquarters. Follow your daily study plan, check off your timetable routine, and lock down syllabus topics.
            </p>
          </div>

          {/* Quick Metrics & CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 w-full md:w-auto">
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3.5 sm:px-4 py-2.5 text-center min-w-[100px] backdrop-blur-md">
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Exam Sitting</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">{daysLeft}</div>
                <div className="text-[9px] uppercase tracking-wider text-purple-300 font-bold">Days Left</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-3.5 sm:px-4 py-2.5 text-center min-w-[100px] backdrop-blur-md">
                <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span>Daily Streak</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-orange-300">{userProfile.streakDays} Days</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Consistent</div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('study-plan')}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <CalendarDays className="w-4 h-4 text-cyan-300" />
              <span>Open Full Routine Screen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 3-Bento Snapshot Cards: Study Plans, Timetable, Daily Topics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Active Study Plan Snapshot */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-300" />
                Active Revision Plan
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {activePlan.progressPercentage}% Completed
              </span>
            </div>
            <h2 className="text-base font-bold text-white leading-snug">
              {activePlan.title}
            </h2>
            <p className="text-xs text-slate-300 line-clamp-2">
              Day {activePlan.currentDay} of {activePlan.durationDays} • {activePlan.recommendedDailyHours}h daily target
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10 mt-2">
              <div
                className="bg-gradient-to-r from-[#6B4EFF] to-[#00F5FF] h-full rounded-full transition-all duration-500"
                style={{ width: `${activePlan.progressPercentage}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab('plans');
              onNavigate('study-plan');
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#6B4EFF]/30 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
          >
            <span>View All Study Plans</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Today's Timetable Routine Snapshot */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between space-y-4 hover:border-cyan-400/40 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300 bg-cyan-400/20 px-2.5 py-0.5 rounded-full border border-cyan-400/30 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-300" />
                Today's Schedule
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {todaySlots.filter((s) => s.isCompleted).length} / {todaySlots.length} Done
              </span>
            </div>
            <h2 className="text-base font-bold text-white leading-snug">
              {todaySlots[0]?.timeSlot || 'Morning Session'}
            </h2>
            <p className="text-xs text-slate-300 line-clamp-2">
              {todaySlots[0]?.topic || 'Mechanics - Projectile Motion & Apex Curvature'}
            </p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                {todaySlots[0]?.activityType || 'Theory Revision'}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">+25 XP on check-off</span>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab('timetable');
              onNavigate('study-plan');
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#6B4EFF]/30 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
          >
            <span>Open Weekly Timetable</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: Today's Cover Topic */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between space-y-4 hover:border-amber-400/40 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-300" />
                Daily Cover Topic
              </span>
              <span className="text-xs font-semibold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md">
                High Priority
              </span>
            </div>
            <h2 className="text-base font-bold text-white leading-snug">
              {dailyTopics[0]?.topic || 'Projectile Apex Curvature Radius'}
            </h2>
            <div className="p-2 rounded-xl bg-black/30 border border-white/10 text-[11px] text-cyan-300 font-mono">
              ρ = (u² cos² θ) / g
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab('topics');
              onNavigate('study-plan');
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-[#6B4EFF]/30 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
          >
            <span>Review Syllabus Topics</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Interactive Main Section: Study Plans, Timetable, Daily Topics */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7 backdrop-blur-md shadow-xl space-y-6">
        {/* Navigation Tab Bar for Live Features */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 p-1 bg-black/30 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('plans')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-[#6B4EFF] text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Study Plans ({plans.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('timetable')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'timetable'
                  ? 'bg-[#6B4EFF] text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Today's Timetable</span>
            </button>

            <button
              onClick={() => setActiveTab('topics')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'topics'
                  ? 'bg-[#6B4EFF] text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Daily Topics Tracker</span>
            </button>
          </div>

          <button
            onClick={() => onNavigate('study-plan')}
            className="text-xs font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer transition-colors self-start sm:self-auto"
          >
            <span>Full Routine Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab 1: Study Plans View */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Curated GCE A/L Revision Plans</h3>
                <p className="text-xs text-slate-400">Choose a sprint plan tailored to your target exam timeline.</p>
              </div>
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Current Active: {activePlan.title}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                    plan.isActive
                      ? 'border-[#6B4EFF] bg-purple-950/20 shadow-lg shadow-purple-900/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        plan.intensity === 'High Intensity'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : plan.intensity === 'Balanced'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {plan.intensity} • {plan.durationDays} Days
                      </span>
                      {plan.isActive && (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active Plan
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-white">{plan.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{plan.tagline}</p>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400">
                      <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                        <span className="block text-slate-500 text-[10px]">Daily Commitment</span>
                        <span className="font-semibold text-white">{plan.recommendedDailyHours} Hours / Day</span>
                      </div>
                      <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                        <span className="block text-slate-500 text-[10px]">Daily MCQ Target</span>
                        <span className="font-semibold text-white">{plan.dailyMCQTarget} Questions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs text-slate-400">
                      Progress: <strong className="text-white">{plan.progressPercentage}%</strong> (Day {plan.currentDay})
                    </span>

                    {plan.isActive ? (
                      <button
                        onClick={() => onNavigate('study-plan')}
                        className="px-3.5 py-1.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold shadow transition-all cursor-pointer"
                      >
                        Manage Milestones →
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSwitchPlan(plan.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-white/10"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Timetable View */}
        {activeTab === 'timetable' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Today's Study Slots (Monday Routine)</h3>
                <p className="text-xs text-slate-400">Check off your study blocks as you complete them to earn XP.</p>
              </div>

              <div className="flex items-center gap-2">
                {/* View switcher */}
                <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <button
                    onClick={() => setDashboardTimetableView('table')}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      dashboardTimetableView === 'table'
                        ? 'bg-[#6B4EFF] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Table view"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => setDashboardTimetableView('cards')}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      dashboardTimetableView === 'cards'
                        ? 'bg-[#6B4EFF] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Cards view"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                </div>

                <span className="text-xs text-cyan-300 font-semibold bg-cyan-400/10 px-3 py-1.5 rounded-xl border border-cyan-400/20 whitespace-nowrap max-w-full overflow-hidden text-ellipsis">
                  {todaySlots.filter((s) => s.isCompleted).length} of {todaySlots.length} Done
                </span>
              </div>
            </div>

            {/* Table View */}
            {dashboardTimetableView === 'table' ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[620px] text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4 w-14 text-center">Status</th>
                        <th className="py-3 px-4 w-40">Time Window</th>
                        <th className="py-3 px-4 w-32">Subject</th>
                        <th className="py-3 px-4">Topic & Study Focus</th>
                        <th className="py-3 px-4 w-28 text-center">Target</th>
                        <th className="py-3 px-4 w-24 text-right">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {todaySlots.map((slot) => {
                        const isPhysics = slot.subject.toLowerCase().includes('physic');

                        return (
                          <tr
                            key={slot.id}
                            onClick={() => handleToggleSlot(slot.id)}
                            className={`cursor-pointer transition-colors hover:bg-white/[0.03] ${
                              slot.isCompleted ? 'bg-emerald-950/15 text-slate-300' : 'text-white'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-4 text-center align-middle">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSlot(slot.id);
                                }}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center ${
                                  slot.isCompleted
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                    : 'border-white/20 bg-white/5 hover:border-cyan-400 text-transparent'
                                }`}
                                title={slot.isCompleted ? 'Completed' : 'Mark complete'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </td>

                            {/* Time Window */}
                            <td className="py-3 px-4 align-middle whitespace-nowrap">
                              <div className="font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span>{slot.startTime} - {slot.endTime}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-0.5 inline-block">
                                {slot.activityType}
                              </span>
                            </td>

                            {/* Subject */}
                            <td className="py-3 px-4 align-middle">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                                  isPhysics
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}
                              >
                                {slot.subject}
                              </span>
                            </td>

                            {/* Topic & Notes */}
                            <td className="py-3 px-4 align-middle">
                              <p
                                className={`font-bold text-sm ${
                                  slot.isCompleted ? 'line-through text-slate-400' : 'text-white'
                                }`}
                              >
                                {slot.topic}
                              </p>
                              {slot.notes && (
                                <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                                  💡 {slot.notes}
                                </p>
                              )}
                            </td>

                            {/* MCQ Target */}
                            <td className="py-3 px-4 align-middle text-center whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30">
                                {slot.targetMCQCount} MCQs
                              </span>
                            </td>

                            {/* State */}
                            <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  slot.isCompleted
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-white/10 text-slate-400'
                                }`}
                              >
                                {slot.isCompleted ? '✓ Done' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Cards View */
              <div className="space-y-2.5">
                {todaySlots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => handleToggleSlot(slot.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      slot.isCompleted
                        ? 'bg-emerald-950/15 border-emerald-500/30 opacity-80'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSlot(slot.id);
                        }}
                        className="mt-0.5 cursor-pointer text-slate-400 hover:text-white"
                      >
                        {slot.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-300 bg-black/40 px-2 py-0.5 rounded">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {slot.activityType}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold ${slot.isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                          {slot.topic}
                        </h4>
                        {slot.notes && (
                          <p className="text-xs text-slate-400 italic">
                            "{slot.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <span className="text-xs font-semibold text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        Target: {slot.targetMCQCount} MCQs
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        slot.isCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-slate-400'
                      }`}>
                        {slot.isCompleted ? '✓ Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Link to Full Timetable */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onNavigate('study-plan')}
                className="text-xs text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Full Weekly Timetable Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Daily Topics Tracker View */}
        {activeTab === 'topics' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white">Today's Syllabus Cover Topics</h3>
                <p className="text-xs text-slate-400">Core concepts frequently tested across GCE A/L examination papers.</p>
              </div>
              <span className="text-xs text-amber-300 font-semibold bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
                High Priority
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                      {topic.syllabusUnit}
                    </span>
                    <span className="text-xs font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                      Key Exam Topic
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{topic.topic}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-mono text-[11px]">
                      Code: {topic.syllabusCode}
                    </p>
                  </div>

                  {/* Subtopics */}
                  <div className="space-y-1 text-xs text-slate-300 bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="font-semibold text-slate-400 text-[11px] mb-1">Key Subtopics & Derivations:</div>
                    {topic.subtopics.map((sub, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* 3-Step Completion Checklist */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Daily 3-Step Milestone Checklist:
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {['1. Theory Reviewed', '2. Formulas Locked', '3. MCQs Solved'].map((label, idx) => {
                        const isChecked = topic.checklistStatus[idx];
                        return (
                          <button
                            key={idx}
                            onClick={() => handleToggleTopicCheck(topic.id, idx)}
                            className={`p-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{isChecked ? '✓ ' : '○ '}{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Coming Soon Section: Clearly labeled as Under Syllabus Verification */}
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-7 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Coming Soon
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Upcoming Question Banks & Past Papers (Syllabus Verification)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Interactive MCQ solving engines, past papers (2000–2026), and verified marking schemes are undergoing final teacher audits.
            </p>
          </div>

          <span className="text-[11px] text-slate-400 italic">
            Currently live: Study Plans, Timetables & Daily Topics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {comingSoonModules.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setComingSoonModalSubject(item.name)}
                className="p-4 rounded-2xl border border-white/10 bg-black/20 hover:border-amber-400/40 hover:bg-black/30 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-white/10 text-slate-300 group-hover:text-cyan-300 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase">
                      {item.tag}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-cyan-300">
                  <span>View Status & Updates</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={!!comingSoonModalSubject}
        subjectName={comingSoonModalSubject || ''}
        onClose={() => setComingSoonModalSubject(null)}
        onNavigateToStudyPlans={() => {
          setComingSoonModalSubject(null);
          onNavigate('study-plan');
        }}
      />
    </div>
  );
};
