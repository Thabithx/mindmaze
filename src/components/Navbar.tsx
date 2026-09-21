import React, { useState } from 'react';
import { ScreenId } from '../types';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  CalendarCheck2,
  BookOpen,
  BarChart3,
  Bell,
  BellRing,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Volume2,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { sendStudyNotification, playStudyChime } from '../lib/notificationService';

interface NavbarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotificationPermission: () => void;
  currentStreak?: number;
  /** When true, an admin-only nav item is shown. Never true for students. */
  isAdmin?: boolean;
  /** Signed-in student's username (shown in the profile menu). Null in local-only mode. */
  username?: string | null;
  /** Signs out via Supabase and returns to the landing page. Omit to hide Sign Out. */
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  notificationPermission,
  onRequestNotificationPermission,
  currentStreak = 0,
  isAdmin = false,
  username = null,
  onSignOut,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showTestBanner, setShowTestBanner] = useState(false);

  const navItems: { id: ScreenId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'Planner', icon: CalendarCheck2 },
    { id: 'topics', label: 'Topics', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    // Admin-only: rendered exclusively when the signed-in profile has role='admin'.
    ...(isAdmin ? [{ id: 'admin' as ScreenId, label: 'Admin', icon: ShieldCheck }] : []),
  ];

  const handleTestReminder = () => {
    playStudyChime();
    sendStudyNotification(
      '🔔 Test Study Reminder',
      'This is how your Mind Maze GCE A/L timetable reminders will look and sound!'
    );
    setShowTestBanner(true);
    setTimeout(() => setShowTestBanner(false), 4000);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0F1023]/90 backdrop-blur-xl">
      {/* Test reminder confirmation toast */}
      {showTestBanner && (
        <div className="bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 border-b border-cyan-400/30 px-4 py-2 text-center text-xs text-cyan-300 animate-fadeIn flex items-center justify-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400 animate-bounce" />
          <span>Reminder triggered! Audio chime played & notification dispatched.</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Logo size="sm" onClick={() => onNavigate('dashboard')} />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#6B4EFF] text-white shadow-[0_0_12px_rgba(107,78,255,0.4)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Study Streak Pill */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                currentStreak > 0
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
              title={`Study Streak: ${currentStreak} days`}
              onClick={() => onNavigate('planner')}
            >
              <span className="text-sm leading-none">🔥</span>
              <span>{currentStreak}d</span>
            </div>

            {/* Notification & Reminder Bell */}
            <button
              onClick={
                notificationPermission === 'granted'
                  ? handleTestReminder
                  : onRequestNotificationPermission
              }
              id="btn-navbar-reminders"
              title={
                notificationPermission === 'granted'
                  ? 'Notifications active! Click to test reminder sound'
                  : 'Enable browser study reminders'
              }
              className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {notificationPermission === 'granted' ? (
                <BellRing className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton variant="nav" />

            {/* Profile Menu (username + Settings + Sign Out) */}
            <div className="relative">
              <button
                type="button"
                id="btn-profile-menu"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title={username ? `Signed in as @${username}` : 'Account menu'}
                className="flex items-center justify-center w-[44px] h-[44px] rounded-full bg-gradient-to-br from-[#6B4EFF] to-cyan-500 hover:scale-105 active:scale-95 text-sm font-black text-white shadow-[0_0_12px_rgba(107,78,255,0.4)] transition cursor-pointer shrink-0"
              >
                {username ? username.trim().charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </button>

              {isProfileMenuOpen && (
                <>
                  {/* Invisible overlay: clicking anywhere outside closes the menu */}
                  <button
                    type="button"
                    aria-label="Close account menu"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                  />
                  <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/15 bg-[#161831] p-2 shadow-2xl z-50 animate-fadeIn text-xs">
                    <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {username ? 'Signed in as' : 'Not signed in'}
                      </div>
                      <div className="text-sm font-black text-white truncate">
                        {username ? `@${username}` : 'Guest'}
                      </div>
                    </div>

                    <button
                      type="button"
                      id="profile-menu-settings"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-slate-200 hover:bg-white/5 hover:text-white transition cursor-pointer min-h-[44px]"
                    >
                      <Settings className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold">Settings</span>
                    </button>

                    {onSignOut && (
                      <button
                        type="button"
                        id="profile-menu-signout"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (window.confirm('Sign out of Mind Maze on this device? Your synced data stays safe in the cloud.')) {
                            onSignOut();
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-rose-300 hover:bg-rose-500/10 transition cursor-pointer min-h-[44px]"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-semibold">Sign Out</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
