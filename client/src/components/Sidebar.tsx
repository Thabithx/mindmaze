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
  Brain,
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

const navGroups = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-400', activeBg: 'bg-indigo-600' },
      { id: 'topics' as ScreenId, label: 'Syllabus Tracker', icon: BookOpen, color: 'text-cyan-400', activeBg: 'bg-cyan-600' },
      { id: 'planner' as ScreenId, label: 'Study Planner', icon: CalendarDays, color: 'text-purple-400', activeBg: 'bg-purple-600' },
    ],
  },
  {
    label: 'Study Tools',
    items: [
      { id: 'courses' as ScreenId, label: 'Courses & Media', icon: GraduationCap, color: 'text-emerald-400', activeBg: 'bg-emerald-600' },
      { id: 'quiz' as ScreenId, label: 'Practice Quiz', icon: Zap, color: 'text-yellow-400', activeBg: 'bg-yellow-600' },
      { id: 'mistakes' as ScreenId, label: 'Mistake Notebook', icon: BookmarkCheck, color: 'text-rose-400', activeBg: 'bg-rose-600' },
      { id: 'pastpapers' as ScreenId, label: 'Past Papers', icon: FileText, color: 'text-orange-400', activeBg: 'bg-orange-600' },
    ],
  },
  {
    label: 'Progress',
    items: [
      { id: 'leaderboard' as ScreenId, label: 'Leaderboard', icon: Trophy, color: 'text-amber-400', activeBg: 'bg-amber-600' },
      { id: 'progress' as ScreenId, label: 'Analytics', icon: BarChart3, color: 'text-teal-400', activeBg: 'bg-teal-600' },
    ],
  },
];

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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.06] bg-[#0D0F1E]/95 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >
        {/* Sidebar Header (Mobile close only, no duplicate logo) */}
        {isOpenMobile && (
          <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.06] shrink-0 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation Menu</span>
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2 mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-indigo-400" />
                      )}
                      <Icon
                        className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                          isActive ? item.color : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="flex-1 text-left truncate text-[13px]">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Admin */}
          {userRole === 'admin' && (
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2 mb-2">
                  Admin
                </p>
              )}
              <button
                onClick={() => handleSelect('admin')}
                title={isCollapsed ? 'Admin Control' : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  currentScreen === 'admin'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {currentScreen === 'admin' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-rose-400" />
                )}
                <ShieldCheck className={`w-[18px] h-[18px] shrink-0 ${currentScreen === 'admin' ? 'text-rose-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {!isCollapsed && <span className="text-[13px]">Admin Control</span>}
              </button>
            </div>
          )}

          {/* Account */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2 mb-2">
                Account
              </p>
            )}
            <button
              onClick={() => handleSelect('settings')}
              title={isCollapsed ? 'Settings' : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                currentScreen === 'settings'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {currentScreen === 'settings' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-slate-400" />
              )}
              <Settings className={`w-[18px] h-[18px] shrink-0 ${currentScreen === 'settings' ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {!isCollapsed && <span className="text-[13px]">Settings</span>}
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                title={isCollapsed ? 'Log Out' : undefined}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400/85 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0 text-rose-400/80 group-hover:text-rose-400" />
                {!isCollapsed && <span className="text-[13px]">Log Out</span>}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
