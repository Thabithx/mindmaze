import React, { useState } from 'react';
import { MilestoneBadge, ScreenId, TargetCard, UserProfile } from '../../types';
import {
  Target,
  Sparkles,
  Flame,
  Shield,
  Award,
  Calendar,
  CheckCircle2,
  Lock,
  ChevronRight,
  TrendingUp,
  Zap,
  BookCheck,
  Compass,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface TargetsScreenProps {
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const TargetsScreen: React.FC<TargetsScreenProps> = ({
  userProfile,
  onUpdateProfile,
  onNavigate,
}) => {
  const [targetCards, setTargetCards] = useState<TargetCard[]>([]);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'All' | 'Daily' | 'Weekly' | 'Monthly'>('All');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalGrade, setTempGoalGrade] = useState(userProfile.targetGrade);
  const [tempExamDate, setTempExamDate] = useState(userProfile.examDate);

  const calculateDaysRemaining = (dateStr: string) => {
    const target = new Date(dateStr).getTime();
    const now = new Date('2026-09-01').getTime();
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
  };

  const daysLeft = calculateDaysRemaining(userProfile.examDate);

  const filteredCards = targetCards.filter((card) => {
    if (selectedTimeframe === 'All') return true;
    return card.timeframe === selectedTimeframe;
  });

  const handleSaveGoal = () => {
    onUpdateProfile({
      targetGrade: tempGoalGrade,
      examDate: tempExamDate,
    });
    setIsEditingGoal(false);
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return Flame;
      case 'Compass': return Compass;
      case 'BookCheck': return BookCheck;
      case 'Award': return Award;
      case 'ShieldCheck': return ShieldCheck;
      case 'FileText': return FileText;
      default: return Sparkles;
    }
  };

  return (
    <div id="mind-maze-targets-screen" className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header & Goal Planner Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-3 backdrop-blur-md">
              <Target className="w-3.5 h-3.5 text-cyan-300" />
              <span>Smart Goal & Exam Pacing Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Targets & Gamification Hub
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Auto-paced Daily, Weekly, and Monthly question quotas calculated specifically for your {userProfile.stream} Stream targets.
            </p>
          </div>

          {/* Goal Summary Pill */}
          <div className="flex items-center gap-3 bg-white/10 border border-white/10 p-4 rounded-2xl backdrop-blur-sm shadow-sm">
            <div>
              <div className="text-[11px] text-slate-400">Current Target</div>
              <div className="text-xl font-black text-cyan-300">{userProfile.targetGrade}</div>
              <div className="text-[10px] text-purple-300">{daysLeft} Days to A/L Exam</div>
            </div>
            <button
              onClick={() => setIsEditingGoal(!isEditingGoal)}
              className="px-3 py-1.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white transition-colors shadow-[0_0_15px_rgba(107,78,255,0.4)]"
            >
              {isEditingGoal ? 'Close' : 'Adjust Goal'}
            </button>
          </div>
        </div>

        {/* Goal Edit Drawer */}
        {isEditingGoal && (
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Target Grade</label>
              <select
                value={tempGoalGrade}
                onChange={(e) => setTempGoalGrade(e.target.value)}
                className="w-full bg-[#161831] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="3 A's">3 A's (Island Merit Standard)</option>
                <option value="2 A's 1 B">2 A's 1 B (High Z-Score)</option>
                <option value="1 A 2 B's">1 A 2 B's</option>
                <option value="3 B's">3 B's</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSaveGoal}
                className="w-full py-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] min-h-[40px]"
              >
                Save &amp; Recalculate Quotas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gamification Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* XP Points */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
              <Sparkles className="w-4 h-4 text-cyan-300" /> Total Knowledge XP
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {userProfile.xp} XP
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Level {userProfile.level} • Next at {userProfile.level * 500} XP
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-cyan-300">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Streak & Freeze */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-300">
              <Flame className="w-4 h-4 text-orange-400" /> Active Daily Streak
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {userProfile.streakDays} Days
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>{userProfile.streakFreezes} Streak Freezes in Vault</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-400">
            <Flame className="w-6 h-6 fill-orange-400 animate-pulse" />
          </div>
        </div>

        {/* Badges Unlocked */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-cyan-300" /> Milestone Badges
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              3 / 6 Unlocked
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Consistent Study Pace
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
            <Compass className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Auto-Generated Targets for {userProfile.targetGrade}
            </h2>
            <p className="text-xs text-slate-400">
              System adapts targets in real-time as you solve papers and revise mistakes.
            </p>
          </div>

          {/* Timeframe Filter Tabs */}
          <div className="flex items-center gap-1 bg-white/10 border border-white/10 p-1 rounded-xl backdrop-blur-sm">
            {(['All', 'Daily', 'Weekly', 'Monthly'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-[#6B4EFF] text-white shadow-[0_0_10px_rgba(107,78,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => {
            const pct = Math.min(100, Math.round((card.current / card.target) * 100));
            return (
              <div
                key={card.id}
                className={`rounded-3xl border p-5 backdrop-blur-md flex flex-col justify-between transition-all shadow-sm ${
                  card.completed
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-[#6B4EFF]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        card.timeframe === 'Daily'
                          ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                          : card.timeframe === 'Weekly'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      {card.timeframe} Target
                    </span>
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> +{card.xpReward} XP
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-5 space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      {card.current} / {card.target} {card.unit}
                    </span>
                    <span className="font-bold text-white">{pct}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-500 ${
                        card.completed
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-[#6B4EFF] to-cyan-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    {card.completed ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Goal Achieved!
                      </span>
                    ) : (
                      <button
                        onClick={() => onNavigate('practice')}
                        className="text-xs font-bold text-purple-300 hover:text-cyan-300 flex items-center gap-1"
                      >
                        Solve Now <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone Badges Hub */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md space-y-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Milestone Badges & Goal Progression
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Earn badges as you master past paper question volumes and retain difficult concepts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Award className="w-7 h-7 text-amber-400/60" />
            </div>
            <p className="text-sm font-semibold text-white/70">Badges Coming Soon</p>
            <p className="text-xs text-slate-500 max-w-xs">Keep studying and completing tasks — badges will unlock as you hit milestones.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
