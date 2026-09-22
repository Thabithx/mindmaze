import React, { useState, useEffect } from 'react';
import { StreamType, UserSettings, UserProfile, ScreenId } from '../../types';
import { api } from '../../services/api';
import {
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  Target,
  Sparkles,
  BookOpen,
  Clock,
  Bell,
  BellOff,
  Volume2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Save,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Flame,
  Eye,
  EyeOff,
} from 'lucide-react';
import { BrowserReenableSteps } from '../notifications/BrowserReenableSteps';

interface SettingsScreenProps {
  settings: UserSettings;
  userSettings?: UserSettings;
  onUpdateSettings?: (newSettings: Partial<UserSettings>) => void;
  onSaveSettings?: (newSettings: UserSettings) => void;
  currentUser?: any;
  userProfile?: UserProfile;
  userRole?: string;
  onProfileUpdated?: (updatedUser: any) => void;
  onSignOut?: () => void;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
  notificationPermission?: NotificationPermission | 'unsupported';
  onRequestNotificationPermission?: () => void;
  onSendTestNotification?: () => void;
  onNavigate?: (screen: ScreenId) => void;
  onOpenProfileEdit?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  userSettings,
  onUpdateSettings,
  onSaveSettings,
  currentUser,
  userProfile,
  userRole = 'student',
  onProfileUpdated,
  onSignOut,
  onOpenAuthModal,
  notificationPermission = 'default',
  onRequestNotificationPermission,
  onSendTestNotification,
  onNavigate,
}) => {
  const effectiveSettings = userSettings || settings || {
    stream: 'Physical Science',
    physicalScienceElective: 'Chemistry',
    studentName: '',
    targetExamYear: '2026',
    targetExamDate: '',
    targetZScore: '',
    motivationNote: '',
    mobileNumber: '',
    dailyHoursGoal: 4,
    weeklyHoursGoal: 28,
  };

  // Form State
  const [name, setName] = useState(currentUser?.name || userProfile?.name || effectiveSettings.studentName || '');
  const [email, setEmail] = useState(currentUser?.email || userProfile?.email || '');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.mobileNumber || effectiveSettings.mobileNumber || '');
  const [stream, setStream] = useState<StreamType>(currentUser?.stream || userProfile?.stream || effectiveSettings.stream || 'Physical Science');
  const [elective, setElective] = useState<'Chemistry' | 'ICT'>(
    currentUser?.physicalScienceElective || effectiveSettings.physicalScienceElective || 'Chemistry'
  );
  const [targetExamYear, setTargetExamYear] = useState(currentUser?.targetExamYear || userProfile?.targetYear || effectiveSettings.targetExamYear || '2026');
  const [targetExamDate, setTargetExamDate] = useState(currentUser?.targetExamDate || userProfile?.examDate || effectiveSettings.targetExamDate || '');
  const [targetZScore, setTargetZScore] = useState(currentUser?.targetZScore || userProfile?.targetZScore || effectiveSettings.targetZScore || '');
  const [motivationNote, setMotivationNote] = useState(currentUser?.motivationNote || effectiveSettings.motivationNote || '');
  const [dailyHoursGoal, setDailyHoursGoal] = useState<number>(currentUser?.dailyHoursGoal || effectiveSettings.dailyHoursGoal || 4);
  const [weeklyHoursGoal, setWeeklyHoursGoal] = useState<number>(currentUser?.weeklyHoursGoal || effectiveSettings.weeklyHoursGoal || 28);

  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status feedback
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testSent, setTestSent] = useState(false);

  // Sync state when currentUser / settings change
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setMobileNumber(currentUser.mobileNumber || '');
      setStream(currentUser.stream || 'Physical Science');
      setElective(currentUser.physicalScienceElective || 'Chemistry');
      setTargetExamYear(currentUser.targetExamYear || '2026');
      setTargetExamDate(currentUser.targetExamDate || '');
      setTargetZScore(currentUser.targetZScore || '');
      setMotivationNote(currentUser.motivationNote || '');
      setDailyHoursGoal(currentUser.dailyHoursGoal || 4);
      setWeeklyHoursGoal(currentUser.weeklyHoursGoal || 28);
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Password validation if attempting to change password
    if (showPasswordSection && newPassword) {
      if (newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirm password do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
        stream,
        physicalScienceElective: stream === 'Physical Science' ? elective : undefined,
        targetExamYear: targetExamYear.trim(),
        targetExamDate: targetExamDate.trim(),
        targetZScore: targetZScore.trim(),
        motivationNote: motivationNote.trim(),
        dailyHoursGoal: Number(dailyHoursGoal) || 4,
        weeklyHoursGoal: Number(weeklyHoursGoal) || 28,
      };

      if (showPasswordSection && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      // 1. If user is logged in, sync to server backend
      if (currentUser || userProfile?.isAuthenticated) {
        const res = await api.updateProfile(payload);
        if (onProfileUpdated && res?.user) {
          onProfileUpdated(res.user);
        }
      }

      // 2. Update local settings state
      const updatedLocal: UserSettings = {
        ...effectiveSettings,
        studentName: name.trim(),
        mobileNumber: mobileNumber.trim(),
        stream,
        physicalScienceElective: elective,
        targetExamYear,
        targetExamDate,
        targetZScore,
        motivationNote,
        dailyHoursGoal: Number(dailyHoursGoal) || 4,
        weeklyHoursGoal: Number(weeklyHoursGoal) || 28,
      };

      if (onSaveSettings) {
        onSaveSettings(updatedLocal);
      }
      if (onUpdateSettings) {
        onUpdateSettings(updatedLocal);
      }

      setSuccessMessage('Profile & settings saved successfully!');
      if (showPasswordSection && newPassword) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = () => {
    if (onSendTestNotification) {
      onSendTestNotification();
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Mind Maze Study Reminder', {
          body: 'Test notification working! Your study alerts are properly enabled.',
          icon: '/icon-192.png',
        });
      } catch {}
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-4xl mx-auto pb-16 select-none">
      {/* Profile Header Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1B163B] via-[#14162E] to-[#0D0F1E] p-5 sm:p-7 backdrop-blur-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg flex-shrink-0">
            <div className="w-full h-full bg-[#111326] rounded-[14px] flex items-center justify-center">
              <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 to-cyan-300 uppercase">
                {(name || 'Student').charAt(0)}
              </span>
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate max-w-xs sm:max-w-md">
                {name || 'Student Profile'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {userRole === 'admin' ? 'Admin' : 'Student'}
              </span>
            </div>

            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              {email || 'A/L Examination Scholar'}
            </p>

            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 flex-wrap pt-1">
              <span className="inline-flex items-center gap-1 text-cyan-300">
                <BookOpen className="w-3.5 h-3.5" />
                {stream} {stream === 'Physical Science' ? `(${elective})` : ''}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                {userProfile?.streakDays || 1} Day Streak
              </span>
            </div>
          </div>
        </div>

        {onSignOut && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) {
                onSignOut();
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition cursor-pointer self-start sm:self-center shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Success / Error Feedback Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Profile & Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Personal & Contact Information */}
        <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-7 backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Personal & Contact Details</h2>
              <p className="text-[11px] text-slate-400">Update your identity and reachability information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="username email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                WhatsApp / Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="0771234567 or +94 77 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Account Security
              </label>
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>{showPasswordSection ? 'Hide Password Fields' : 'Change Account Password'}</span>
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showPasswordSection ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>

          {/* Change Password Dropdown */}
          {showPasswordSection && (
            <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-3 mt-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">Set New Password</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Current Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">New Password (6+ chars)</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: A/L Stream & Subject Choice */}
        <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-7 backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">A/L Stream & Subject Combination</h2>
              <p className="text-[11px] text-slate-400">Controls your syllabus topics, progress tracking, and timetable</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Selected Stream <span className="text-rose-400">*</span>
              </label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value as StreamType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="Physical Science" className="bg-slate-900 text-white">Physical Science (Maths)</option>
                <option value="Biological Science" className="bg-slate-900 text-white">Biological Science (Bio)</option>
              </select>
            </div>

            {stream === 'Physical Science' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Physical Science Elective
                </label>
                <select
                  value={elective}
                  onChange={(e) => setElective(e.target.value as 'Chemistry' | 'ICT')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="Chemistry" className="bg-slate-900 text-white">Chemistry</option>
                  <option value="ICT" className="bg-slate-900 text-white">ICT (Information & Communication Tech)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Exam Target & Academic Goals */}
        <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-7 backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Exam Targets & Study Ambition</h2>
              <p className="text-[11px] text-slate-400">Set your exam timeline and target Z-Score</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Target Exam Year
              </label>
              <input
                type="text"
                value={targetExamYear}
                onChange={(e) => setTargetExamYear(e.target.value)}
                placeholder="2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Expected Exam Date
              </label>
              <input
                type="date"
                value={targetExamDate}
                onChange={(e) => setTargetExamDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Target Z-Score
              </label>
              <input
                type="text"
                value={targetZScore}
                onChange={(e) => setTargetZScore(e.target.value)}
                placeholder="e.g. 2.1500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Daily Study Target (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={dailyHoursGoal}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDailyHoursGoal(val);
                  setWeeklyHoursGoal(Math.round(val * 7 * 10) / 10);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Weekly Study Target (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={168}
                value={weeklyHoursGoal}
                onChange={(e) => setWeeklyHoursGoal(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Personal Motivation Note
            </label>
            <input
              type="text"
              value={motivationNote}
              onChange={(e) => setMotivationNote(e.target.value)}
              placeholder="e.g. Aiming for University of Moratuwa Engineering / Medical Faculty!"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Section 4: Device & OS Notification Settings */}
        <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-7 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Device & Push Notifications</h2>
              <p className="text-[11px] text-slate-400">Manage OS-level alerts when study sessions start</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Browser Permission:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {notificationPermission === 'granted' ? 'Enabled' : notificationPermission === 'denied' ? 'Blocked' : 'Action Required'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {notificationPermission === 'granted'
                  ? 'OS notifications active. You will get alerted when timetable sessions begin.'
                  : 'Enable device notifications to receive automated study alerts.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {notificationPermission !== 'granted' && onRequestNotificationPermission && (
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow cursor-pointer"
                >
                  Enable Notifications
                </button>
              )}

              <button
                type="button"
                onClick={handleTestNotification}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                <span>{testSent ? 'Sent!' : 'Send Test Alert'}</span>
              </button>
            </div>
          </div>

          {notificationPermission === 'denied' && (
            <div className="pt-2">
              <BrowserReenableSteps />
            </div>
          )}
        </div>

        {/* Submit Save Button */}
        <div className="sticky bottom-4 z-20 flex items-center justify-end gap-3 p-4 rounded-2xl bg-[#0F1123]/95 border border-white/15 backdrop-blur-2xl shadow-2xl">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-purple-500/30 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
