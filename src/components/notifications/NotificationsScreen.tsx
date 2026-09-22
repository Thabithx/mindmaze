import React, { useState } from 'react';
import { ScreenId, UserSettings, TimetableEntry, SyllabusTopic, UserProfile } from '../../types';
import { api } from '../../services/api';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  Sparkles,
  BookOpen,
  Inbox,
  AlertCircle,
  Check,
} from 'lucide-react';

interface NotificationsScreenProps {
  settings: UserSettings;
  userSettings?: UserSettings;
  userProfile?: UserProfile;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onNavigate: (screen: ScreenId) => void;
  timetableEntries?: TimetableEntry[];
  syllabusTopics?: SyllabusTopic[];
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  settings,
  userSettings,
  userProfile,
  onUpdateSettings,
  onNavigate,
  timetableEntries = [],
  syllabusTopics = [],
}) => {
  const effectiveSettings = settings || userSettings || {};
  const isEmailEnabled = effectiveSettings.emailNotificationsEnabled !== false; // Enabled by default

  const [testSending, setTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const studentEmail = userProfile?.email || '';

  const handleSendTestEmail = async () => {
    if (!studentEmail) {
      setTestError('Please sign in with your email account to receive study alerts.');
      return;
    }

    setTestSending(true);
    setTestStatus(null);
    setTestError(null);

    try {
      const firstEntry = timetableEntries[0];
      await api.sendTimetableReminder({
        subject: firstEntry?.subject || 'Physics',
        topic: firstEntry?.topic || 'Mechanics & Vector Calculus',
        startTime: firstEntry?.startTime || 'Now',
        notes: 'Test study session reminder from Mind Maze notification center.',
      });
      setTestStatus(`Test study alert email dispatched successfully to ${studentEmail}! Check your inbox.`);
    } catch (err: any) {
      setTestError(err.message || 'Failed to send test email. Ensure the backend server is reachable.');
    } finally {
      setTestSending(false);
    }
  };

  const handleToggleEmailNotifications = () => {
    onUpdateSettings({ emailNotificationsEnabled: !isEmailEnabled });
  };

  return (
    <div id="mind-maze-notifications-screen" className="space-y-8 pb-16 max-w-5xl mx-auto select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2 backdrop-blur-md">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span>Email & In-App Study Notification System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Notifications Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated study block alerts, timetable session triggers, and exam reminders sent directly to your email inbox.
          </p>
        </div>

        {studentEmail && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSendTestEmail}
              disabled={testSending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{testSending ? 'Sending...' : 'Send Test Alert to My Email'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Test feedback banner */}
      {testStatus && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{testStatus}</span>
        </div>
      )}

      {testError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{testError}</span>
        </div>
      )}

      {/* Notification Preferences with Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Notification Master Switch */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
              isEmailEnabled ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
            }`}>
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Study Block Email Reminders</div>
              <div className="text-xs text-slate-400">
                {isEmailEnabled
                  ? `Active & sending to ${studentEmail || 'your email'}`
                  : 'Email reminders currently disabled'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleEmailNotifications}
            aria-label="Toggle email notifications"
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none ${
              isEmailEnabled ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                isEmailEnabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Streak Alerts */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Daily Streak & Target Alerts</div>
              <div className="text-xs text-slate-400">Evening nudges to maintain your daily study streak</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <Check className="w-3.5 h-3.5" />
            <span>Enabled</span>
          </div>
        </div>
      </div>

      {/* Scheduled Study Alerts Timeline */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Inbox className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Automated Study Alerts Feed</h3>
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
            <p className="text-xs">No scheduled study blocks found in your timetable. Add study slots in your timetable to get automated email alerts!</p>
            <button
              onClick={() => onNavigate('planner')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Add Study Block
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {timetableEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.08] transition"
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
                  <span className={`text-[10px] font-semibold flex items-center gap-1 justify-end ${
                    isEmailEnabled ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    <Mail className="w-3 h-3" /> {isEmailEnabled ? 'Email Alert Active' : 'Email Muted'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
