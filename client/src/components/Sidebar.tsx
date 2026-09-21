import React from 'react';
import { ScreenId } from '../types';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Zap,
  BookmarkCheck,
  FileText,
  Trophy,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  userRole?: string;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile = false,
  onCloseMobile,
  userRole = 'student',
  onSignOut,
}) => {
  const mainNavItems = [
    { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: LayoutDashboard, badge: 'Home' },
    { id: 'topics' as ScreenId, label: 'Syllabus Tracker', icon: BookOpen, badge: 'A/L' },
    { id: 'planner' as ScreenId, label: 'Timetable & Planner', icon: CalendarDays, badge: 'Weekly' },
    { id: 'courses' as ScreenId, label: 'Courses & Media', icon: GraduationCap, badge: 'PDF/Videos' },
    { id: 'quiz' as ScreenId, label: 'Practice Quiz', icon: Zap, badge: 'MCQ' },
    { id: 'mistakes' as ScreenId, label: 'Mistake Notebook', icon: BookmarkCheck, badge: 'Review' },
    { id: 'pastpapers' as ScreenId, label: 'Past Paper Library', icon: FileText, badge: 'PDF' },
    { id: 'leaderboard' as ScreenId, label: 'Leaderboard', icon: Trophy, badge: 'Rank' },
    { id: 'progress' as ScreenId, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as ScreenId, label: 'Settings', icon: Settings },
  ];

  if (userRole === 'admin') {
    mainNavItems.push({
      id: 'admin' as ScreenId,
      label: 'Admin Control',
      icon: ShieldCheck,
      badge: 'Admin',
    });
  }

  const handleSelect = (screenId: ScreenId) => {
    onNavigate(screenId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-extrabold shadow-lg">
              MM
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap">
                <span className="font-extrabold text-white text-base tracking-wide flex items-center gap-1">
                  Mind Maze <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </span>
                <span className="block text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  GCE A/L Study Suite
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />

                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Controls */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>
    </>
  );
};
