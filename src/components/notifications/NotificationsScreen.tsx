import React, { useState } from 'react';
import { ScreenId, UserSettings, TimetableEntry, SyllabusTopic } from '../../types';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  Sparkles,
  AlertCircle,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { BrowserReenableSteps } from './BrowserReenableSteps';

interface NotificationsScreenProps {
  settings: UserSettings;
  userSettings?: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  notificationPermission?: NotificationPermission | 'unsupported';
  onRequestNotificationPermission?: () => void;
  onSendTestNotification?: () => void;
  onNavigate: (screen: ScreenId) => void;
  timetableEntries?: TimetableEntry[];
  syllabusTopics?: SyllabusTopic[];
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  settings,
  userSettings,
  onUpdateSettings,
  notificationPermission = 'default',
  onRequestNotificationPermission,
  onSendTestNotification,
  onNavigate,
  timetableEntries = [],
  syllabusTopics = [],
}) => {
  const effectiveSettings = settings || userSettings || {};
  const [testSent, setTestSent] = useState(false);

  const handleTestNotification = () => {
    if (onSendTestNotification) {
      onSendTestNotification();
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Mind Maze Study Reminder', {
          body: 'This is a test notification! Your study reminders are working perfectly.',
          icon: '/icon-192.png',
        });
      } catch {}
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div id="mind-maze-notifications-screen" className="space-y-8 pb-16 max-w-5xl mx-auto select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2 backdrop-blur-md">
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span>Study Alerts & Reminders</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Notifications Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your daily A/L exam countdowns, scheduled session start reminders, and streak protection alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestNotification}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{testSent ? 'Notification Sent!' : 'Send Test Notification'}</span>
          </button>
        </div>
      </div>

      {/* Permission Status Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={}>
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Browser Notifications Status</h3>
                <span className={}>
                  {notificationPermission === 'granted' ? 'Enabled' : notificationPermission === 'denied' ? 'Blocked' : 'Action Required'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {notificationPermission === 'granted'
                  ? 'Reminders are active on this device. You will be automatically notified when study sessions begin.'
                  : notificationPermission === 'denied'
                  ? 'Notifications are blocked in your browser settings. Follow the steps below to re-enable them.'
                  : 'Enable notifications to receive daily exam countdowns and study block alerts.'}
              </p>
            </div>
          </div>

          {notificationPermission !== 'granted' && (
            <button
              onClick={onRequestNotificationPermission}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold transition shadow-lg cursor-pointer shrink-0"
            >
              Enable Notifications
            </button>
          )}
        </div>

        {notificationPermission === 'denied' && (
          <div className="pt-3 border-t border-white/10">
            <BrowserReenableSteps />
          </div>
        )}
      </div>

      {/* Preferences Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Study Session Start Alerts</div>
              <div className="text-xs text-slate-400">Notifies when your timetable block starts</div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ reminderSoundEnabled: !effectiveSettings.reminderSoundEnabled })}
            className={}
          >
            <span
              className={}
            />
          </button>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Streak Protection Nudges</div>
              <div className="text-xs text-slate-400">Gentle reminders in the evening to protect your streak</div>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ dailyHoursGoal: (effectiveSettings.dailyHoursGoal || 4) })}
            className="w-11 h-6 rounded-full bg-indigo-600 transition-colors relative cursor-pointer"
          >
            <span className="w-4 h-4 rounded-full bg-white absolute top-1 left-6 transition-transform" />
          </button>
        </div>
      </div>

      {/* Recent Activity & Scheduled Reminders Feed */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Upcoming Scheduled Reminders</h3>
          </div>
          <button
            onClick={() => onNavigate('planner')}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
          >
            Manage Timetable →
          </button>
        </div>

        {timetableEntries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs">No scheduled study blocks yet. Add study slots in your timetable to get automated alerts!</p>
            <button
              onClick={() => onNavigate('planner')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Add Study Block
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {timetableEntries.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate">{entry.topic}</span>
                    <span className="text-[11px] text-slate-400">{entry.subject} • {entry.dayOfWeek}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-cyan-300 font-bold block">{entry.startTime} - {entry.endTime}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Scheduled Alert</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
