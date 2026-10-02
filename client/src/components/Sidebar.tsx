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
  User,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LogIn,
  X,
  Sparkles,
  Brain,
  Bell,
} from 'lucide-react';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  userRole?: string;
  isAuthenticated?: boolean;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
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
      { id: 'quiz' as ScreenId, label: 'Practice Quiz · Beta', icon: Zap, color: 'text-yellow-400', activeBg: 'bg-yellow-600' },
      { id: 'mistakes' as ScreenId, label: 'Mistake Notebook', icon: BookmarkCheck, color: 'text-rose-400', activeBg: 'bg-rose-600' },
      { id: 'pastpapers' as ScreenId, label: 'Past Papers', icon: FileText, color: 'text-orange-400', activeBg: 'bg-orange-600' },
    ],
  },
  {
    label: 'Progress & Alerts',
    items: [
      { id: 'leaderboard' as ScreenId, label: 'Leaderboard', icon: Trophy, color: 'text-amber-400', activeBg: 'bg-amber-600' },
      { id: 'progress' as ScreenId, label: 'Analytics', icon: BarChart3, color: 'text-teal-400', activeBg: 'bg-teal-600' },
      { id: 'notifications' as ScreenId, label: 'Notifications', icon: Bell, color: 'text-indigo-400', activeBg: 'bg-indigo-600' },
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
  isAuthenticated = false,
  onOpenAuthModal,
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
        id="main-sidebar"
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex min-h-0 shrink-0 flex-col border-r border-white/[0.06] bg-[#0D0F1E]/95 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:h-full lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 w-80 max-w-[85vw]' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >
        {isOpenMobile && (
          <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.08] shrink-0 lg:hidden bg-white/[0.02]">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Navigation Menu</span>
            </span>
            <button
              onClick={onCloseMobile}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer border border-white/10"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="hidden lg:flex shrink-0 items-center px-3 pt-3 pb-1">
        <button type="button" onClick={onToggleCollapse} aria-label={isCollapsed?'Expand sidebar':'Collapse sidebar'} aria-expanded={!isCollapsed} aria-controls="main-sidebar" title={isCollapsed?'Expand sidebar':'Collapse sidebar'} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-300 shadow-sm transition-all hover:border-indigo-400/60 hover:bg-indigo-500/20 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer">
          {isCollapsed?<PanelLeftOpen className="h-5 w-5" aria-hidden="true"/>:<PanelLeftClose className="h-5 w-5" aria-hidden="true"/>}
        </button>
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 lg:px-3 lg:py-4 pb-28 lg:pb-4 space-y-6 lg:space-y-5 scrollbar-thin">
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
                      disabled={item.id === 'quiz'}
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
                      {!isCollapsed && item.id === 'notifications' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-cyan-300 border border-indigo-500/40">
                          Alerts
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Admin */}
          {['admin','content_manager'].includes(userRole) && (
            <div>
              {!isCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2 mb-2">
                  {userRole==='admin'?'Admin':'Content'}
                </p>
              )}
              <button
                onClick={() => handleSelect('admin')}
                title={isCollapsed ? (userRole==='admin'?'Admin Control':'Content Manager') : undefined}
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
                {!isCollapsed && <span className="text-[13px]">{userRole==='admin'?'Admin Control':'Content Manager'}</span>}
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
              <User className={`w-[18px] h-[18px] shrink-0 ${currentScreen === 'settings' ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {!isCollapsed && <span className="text-[13px]">Profile & Settings</span>}
            </button>

            {isAuthenticated && onSignOut ? (
              <button
                onClick={onSignOut}
                title={isCollapsed ? 'Log Out' : undefined}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400/85 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0 text-rose-400/80 group-hover:text-rose-400" />
                {!isCollapsed && <span className="text-[13px]">Log Out</span>}
              </button>
            ) : onOpenAuthModal ? (
              <button
                onClick={() => {
                  onOpenAuthModal('signin');
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? 'Sign In / Register' : undefined}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
              >
                <LogIn className="w-[18px] h-[18px] shrink-0 text-indigo-400 group-hover:text-indigo-300" />
                {!isCollapsed && <span className="text-[13px]">Sign In / Register</span>}
              </button>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] shrink-0">
          {!isCollapsed&&<address className="support-contacts not-italic text-xs font-bold leading-relaxed text-left">
            <p className="text-[11px] font-extrabold mb-2">FOR SUPPORT CONTACT MINDMAZE TEAM</p>
            <a className="block py-1 font-bold underline underline-offset-4 break-all" href="mailto:Mindmazeorg@gmail.com">Mindmazeorg@gmail.com</a>
            <a className="block py-1 text-[11px] font-bold hover:underline" href="tel:+94741135855">Asjadh Azhar - 0741135855</a>
            <a className="block py-1 text-[11px] font-bold hover:underline" href="tel:+94772065719">Athif Ahamed - 0772065719</a>
          </address>}

        </div>
      </aside>
    </>
  );
};
