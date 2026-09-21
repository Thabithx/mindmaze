import React, { useState } from 'react';
import { ScreenId, UserProfile } from '../types';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  CalendarCheck2,
  BookOpen,
  GraduationCap,
  Sparkles,
  User,
  Settings,
  LogOut,
  Menu,
  Flame,
  Zap,
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 md:px-6 backdrop-blur-xl">
      {/* Left: Mobile Toggle & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div onClick={() => onNavigate('dashboard')} className="cursor-pointer">
          <Logo />
        </div>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-3">
        {/* Streak Counter Badge */}
        {userProfile && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shadow-sm">
            <Flame className="w-4 h-4 fill-current text-amber-400" />
            <span>{userProfile.streakDays || 1} Day Streak</span>
          </div>
        )}

        <PWAInstallButton />

        {/* Profile Dropdown */}
        {userProfile?.isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-all text-xs text-white"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white uppercase">
                {userProfile.name.charAt(0)}
              </div>
              <span className="hidden md:inline font-semibold">{userProfile.name}</span>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 text-xs space-y-1">
                <div className="p-3 border-b border-slate-800">
                  <p className="font-bold text-white">{userProfile.name}</p>
                  <p className="text-[11px] text-slate-400">{userProfile.email || 'A/L Student'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400">
                    {userProfile.stream}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenProfileEdit();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4 text-indigo-400" /> Edit Profile & Goals
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAuthModal('signin')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuthModal('signup')}
              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition-all"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
