import React from 'react';
import { ScreenId, UserProfile } from '../types';
import {
  BookOpen,
  Target,
  BarChart3,
  SlidersHorizontal,
  Home,
  LogOut,
  LogIn,
  X,
  Clock,
  Flame,
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  userProfile: UserProfile;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
}

export const MobileActionSheet: React.FC<MobileActionSheetProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  userProfile,
  onOpenAuth,
  onSignOut,
}) => {
  if (!isOpen) return null;

  const isAuthenticated = Boolean(userProfile?.isAuthenticated === true && userProfile?.email);

  const calculateDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return 73;
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 73;
  };

  const daysLeft = calculateDaysRemaining(userProfile.examDate);

  const secondaryTools = [
    {
      id: 'past-papers' as ScreenId,
      label: 'Past Paper Library',
      desc: '2000-2026 Exam Papers & Marking Schemes',
      icon: BookOpen,
      color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    },
    {
      id: 'targets' as ScreenId,
      label: 'Smart Targets & Goals',
      desc: 'Island Rank, Z-Score Target & Daily MCQs',
      icon: Target,
      color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    },
    {
      id: 'analytics' as ScreenId,
      label: 'Analytics & Repeat AI',
      desc: 'Topic Mastery & Predicted Question Trends',
      icon: BarChart3,
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    },
    {
      id: 'onboarding' as ScreenId,
      label: 'Stream & Preferences',
      desc: 'Change A/L Stream, Medium & Exam Year',
      icon: SlidersHorizontal,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'landing' as ScreenId,
      label: 'Portal Overview & Intro',
      desc: 'Return to Public Landing Page',
      icon: Home,
      color: 'text-slate-300 bg-white/5 border-white/10',
    },
  ];

  const handleSelect = (id: ScreenId) => {
    onNavigate(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-[#14162E] p-5 shadow-2xl text-slate-100 animate-slide-up pb-safe">
        {/* Top Drag Indicator & Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-12 h-1.5 rounded-full bg-white/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">More Tools & Navigation</h3>
              <p className="text-xs text-slate-400">Quick access to all Mind Maze features</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
              aria-label="Close sheet"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Exam & User Summary Card */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userProfile.avatar ? (
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="w-10 h-10 rounded-full object-cover border border-cyan-400/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#6B4EFF] text-white flex items-center justify-center font-bold text-sm">
                {userProfile.name ? userProfile.name.charAt(0) : 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-bold text-sm text-white truncate max-w-[170px]">
                {userProfile.name}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="text-cyan-300 font-semibold">{userProfile.stream} Stream</span>
                <span>•</span>
                <span className="text-purple-300 font-semibold">{userProfile.targetGrade}</span>
              </div>
            </div>
          </div>

          {/* Countdown & Streak Pills */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-400/10 px-2.5 py-0.5 rounded-full border border-cyan-400/20">
              <Clock className="w-3 h-3" />
              <span>{daysLeft}d left</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-400/20">
              <Flame className="w-3 h-3 fill-orange-400" />
              <span>{userProfile.streakDays}d streak</span>
            </div>
          </div>
        </div>

        {/* Feature Navigation List */}
        <div className="space-y-2 mb-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Study Modules
          </div>
          {secondaryTools.map((tool) => {
            const Icon = tool.icon;
            const isActive = currentScreen === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => handleSelect(tool.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                  isActive
                    ? 'bg-[#6B4EFF]/20 border-cyan-400/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${tool.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{tool.label}</div>
                    <div className="text-[10px] text-slate-400">{tool.desc}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            );
          })}
        </div>

        {/* Account Authentication Actions */}
        <div className="pt-2 border-t border-white/10">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth('signin');
                }}
                className="flex-1 py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Switch Account</span>
              </button>
              {onSignOut && (
                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="py-3 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-bold text-rose-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth('signin');
                }}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-300" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth('signup');
                }}
                className="flex-1 py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
