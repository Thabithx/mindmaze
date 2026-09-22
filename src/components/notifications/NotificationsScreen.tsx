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
  ShieldCheck,
  Check,
  BellRing,
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

      {/* Email Delivery Guarantee Banner */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Direct Email Delivery Active</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Reliable Cloud SMTP
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {studentEmail ? (
                  <>
                    Study session alerts are automatically delivered to{' '}
                    <strong className="text-indigo-300 font-mono">{studentEmail}</strong> as soon as your scheduled timetable slots arrive. You don't need the browser open to receive them.
                  </>
                ) : (
                  'Sign in with your student account so Mind Maze can dispatch automatic study block reminders and countdowns to your email address.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Study Block Email Reminders</div>
              <div className="text-xs text-slate-400">Receive an email when your scheduled timetable session starts</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <Check className="w-4 h-4" />
            <span>Active</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Streak & Daily Target Alerts</div>
              <div className="text-xs text-slate-400">Evening reminders to keep up your daily GCE A/L streak</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <Check className="w-4 h-4" />
            <span>Active</span>
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
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                    <Mail className="w-3 h-3" /> Email Reminder
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
