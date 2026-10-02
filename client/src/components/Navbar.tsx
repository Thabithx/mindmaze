import { ThemeToggle } from './ThemeToggle';
import React, { useState } from 'react';
import { ScreenId, UserProfile } from '../types';
import { Logo } from './Logo';
import {
  User,
  Settings,
  LogOut,
  Menu,
  Flame,
  Sparkles,
  LogIn,
  Bell,
  Search,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  userProfile?: UserProfile;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen?: boolean;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onOpenProfileEdit: () => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  currentScreen,
  onNavigate,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
  onOpenAuthModal,
  onSignOut,
  onOpenProfileEdit,
  onOpenSearch,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="app-header relative z-30 flex h-16 shrink-0 w-full items-center justify-between border-b border-white/[0.08] bg-[#0D0F1E]/90 px-3 sm:px-6 backdrop-blur-2xl shadow-lg shadow-black/20 select-none">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">

        <button type="button" onClick={onToggleMobileSidebar} aria-label={isMobileSidebarOpen?'Close navigation menu':'Open navigation menu'} aria-expanded={isMobileSidebarOpen} aria-controls="main-sidebar" className="inline-flex lg:hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-300 shadow-sm transition-all hover:bg-indigo-500/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"><Menu className="h-5 w-5" aria-hidden="true"/></button>
        <div onClick={() => onNavigate('dashboard')} className="cursor-pointer min-w-0">
          <Logo size="sm" />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <ThemeToggle />
        {/* Header Streak Counter Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-black shadow-sm" title="Streak Days">
          <Flame className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">{userProfile?.streakDays || 1}</span>
        </div>

        {/* Header Search Button (Directly right to Streak on PC & directly left of Menu on Mobile) */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition cursor-pointer min-h-[40px] min-w-[40px] sm:min-w-0 justify-center text-xs font-semibold"
            title="Search (Cmd + K)"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline font-bold">Search</span>
            <span className="hidden md:inline-block text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded border border-white/10 font-mono">
              ⌘K
            </span>
          </button>
        )}

        {/* Header Notifications Bell Button (Desktop/Tablet Only — Mobile in Sidebar) */}
        <button
          onClick={() => onNavigate('notifications')}
          className={`hidden sm:flex relative p-2 rounded-xl border transition cursor-pointer min-h-[40px] min-w-[40px] items-center justify-center ${
            currentScreen === 'notifications'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
          title="Notifications & Study Reminders"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </button>

        <div className="hidden sm:flex items-center">
          <PWAInstallButton />
        </div>

        {/* Desktop Profile Menu */}
        <div className="relative hidden sm:block">
          {userProfile?.isAuthenticated ? (
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-400/50 hover:bg-white/10 transition-all text-xs text-white cursor-pointer min-h-[44px]"
              title="Account Menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 font-bold text-white uppercase text-xs shadow-md">
                {userProfile.name.charAt(0)}
              </div>
              <span className="hidden md:inline font-bold pr-1">{userProfile.name}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenAuthModal('signin')}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white transition-all shadow-md cursor-pointer"
              title="Sign In / Profile"
            >
              <User className="w-5 h-5" />
            </button>
          )}

          {/* Profile Dropdown Menu */}
          {userProfile?.isAuthenticated && isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-[#161831]/95 p-2 shadow-2xl z-50 text-xs space-y-1 backdrop-blur-2xl">
              <div className="p-3 border-b border-white/10">
                <p className="font-bold text-white truncate">{userProfile.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{userProfile.email || 'A/L Scholar'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {userProfile.stream}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenProfileEdit();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-indigo-400" /> Edit Profile & Goals
              </button>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onNavigate('settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" /> Settings
              </button>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>


      </div>
    </header>
  );
};
