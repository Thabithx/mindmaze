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
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  userProfile?: UserProfile;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onToggleMobileSidebar: () => void;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onOpenProfileEdit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  currentScreen,
  onNavigate,
  onToggleMobileSidebar,
  onOpenAuthModal,
  onSignOut,
  onOpenProfileEdit,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#0D0F1E]/90 px-3 sm:px-6 backdrop-blur-2xl shadow-lg shadow-black/20 select-none">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div onClick={() => onNavigate('dashboard')} className="cursor-pointer min-w-0">
          <Logo size="sm" />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Header Streak Counter Badge (ONLY NUMBER) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-black shadow-sm" title="Streak Days">
          <Flame className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">{userProfile?.streakDays || 1}</span>
        </div>

        {/* Header Notifications Bell Button */}
        <button
          onClick={() => onNavigate('notifications')}
          className={`relative p-2 rounded-xl border transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
            currentScreen === 'notifications'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
          title="Notifications & Study Reminders"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </button>

        <PWAInstallButton />

        {/* Single Profile Icon Button */}
        <div className="relative">
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

        {/* Mobile Sidebar Menu Toggle Button on Right */}
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white lg:hidden transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 border border-white/10"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
