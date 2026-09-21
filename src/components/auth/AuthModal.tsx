import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { StreamType, SyllabusType, MediumType, UserProfile } from '../../types';
import { SUBJECTS_BY_STREAM } from '../../data/mockData';
import {
  getRegisteredUsers,
  saveSession,
  DEMO_ACCOUNTS,
  StoredUserAccount,
} from '../../lib/authService';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Sparkles,
  Calculator,
  Dna,
  Award,
  Calendar,
  Layers,
  Globe,
  Target,
  ShieldCheck,
  Flame,
  BookOpen,
  Info,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  initialStream?: StreamType;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  initialStream = 'Maths',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [signUpStep, setSignUpStep] = useState<number>(1); // 1: Credentials, 2: Stream, 3: Subjects & Medium, 4: Goals & Preferences

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [provider, setProvider] = useState<'email' | 'google'>('email');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Preferences (Step 2 - 4)
  const [stream, setStream] = useState<StreamType>(initialStream);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    SUBJECTS_BY_STREAM[initialStream].slice(0, 3)
  );
  const [medium, setMedium] = useState<MediumType>('English');
  const [targetGrade, setTargetGrade] = useState<string>("3 A's");
  const [examDate, setExamDate] = useState<string>('2027-11-15');
  const [syllabus, setSyllabus] = useState<SyllabusType>('current');
  const [dailyGoalMCQs, setDailyGoalMCQs] = useState<number>(20);

  // Status & Validation
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [showGooglePicker, setShowGooglePicker] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSignUpStep(1);
      setErrorMsg(null);
      setInfoMsg(null);
      setIsCompleted(false);
      setShowGooglePicker(false);
      if (initialStream) {
        setStream(initialStream);
        setSelectedSubjects(SUBJECTS_BY_STREAM[initialStream].slice(0, 3));
      }
    }
  }, [isOpen, initialMode, initialStream]);

  if (!isOpen) return null;

  // Stream Change
  const handleStreamSelect = (newStream: StreamType) => {
    setStream(newStream);
    setSelectedSubjects(SUBJECTS_BY_STREAM[newStream].slice(0, 3));
  };

  // Toggle Subject
  const toggleSubject = (subj: string) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  // Simulated Google Sign-In/Up options
  const googleAccounts = [
    {
      name: 'Zara Riham',
      email: 'zararihamofficial@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
    {
      name: 'Kasun Perera',
      email: 'kasun.al@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    },
  ];

  const handleGoogleAccountSelect = (acc: typeof googleAccounts[0]) => {
    setName(acc.name);
    setEmail(acc.email);
    setAvatarUrl(acc.avatar);
    setProvider('google');
    setShowGooglePicker(false);

    if (mode === 'signin') {
      // Check if user has an existing account in storage
      const registered = getRegisteredUsers();
      const existing = registered.find((u) => u.email.toLowerCase() === acc.email.toLowerCase());

      const userProfile: UserProfile = {
        id: existing?.id || `usr-google-${Date.now()}`,
        name: acc.name,
        email: acc.email,
        avatar: acc.avatar,
        provider: 'google',
        isAuthenticated: true,
        stream: existing?.stream || stream,
        selectedSubjects: existing?.selectedSubjects || selectedSubjects,
        targetGrade: existing?.targetGrade || targetGrade,
        examDate: existing?.examDate || examDate,
        syllabus: existing?.syllabus || syllabus,
        medium: existing?.medium || medium,
        currentOnlyFilter: (existing?.syllabus || syllabus) === 'current',
        xp: existing?.xp || 1200,
        streakDays: existing?.streakDays || 5,
        streakFreezes: 2,
        dailyGoalMCQs: existing?.dailyGoalMCQs || 20,
        dailyCompletedMCQs: 4,
        level: 4,
      };

      saveSession(userProfile);
      onSuccess(userProfile);
      onClose();
    } else {
      // Sign Up: Advance to Step 2 (Stream & Preferences)
      setSignUpStep(2);
    }
  };

  // Quick Demo Account Sign-In
  const handleQuickDemoSignIn = (demo: StoredUserAccount) => {
    const userProfile: UserProfile = {
      id: demo.id,
      name: demo.name,
      email: demo.email,
      avatar: demo.avatar,
      provider: demo.provider,
      isAuthenticated: true,
      stream: demo.stream,
      selectedSubjects: demo.selectedSubjects,
      targetGrade: demo.targetGrade,
      examDate: demo.examDate,
      syllabus: demo.syllabus,
      medium: demo.medium,
      currentOnlyFilter: demo.syllabus === 'current',
      xp: demo.xp,
      streakDays: demo.streakDays,
      streakFreezes: 2,
      dailyGoalMCQs: demo.dailyGoalMCQs,
      dailyCompletedMCQs: 6,
      level: 5,
    };

    saveSession(userProfile);
    onSuccess(userProfile);
    onClose();
  };

  // Email Sign In Submit
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    // Find registered account or create authenticated session
    const registered = getRegisteredUsers();
    const match = registered.find((u) => u.email.toLowerCase() === email.toLowerCase());

    const profile: UserProfile = {
      id: match?.id || `usr-email-${Date.now()}`,
      name: match?.name || email.split('@')[0],
      email: email,
      avatar: match?.avatar,
      provider: 'email',
      isAuthenticated: true,
      stream: match?.stream || 'Maths',
      selectedSubjects: match?.selectedSubjects || ['Combined Maths', 'Physics', 'Chemistry'],
      targetGrade: match?.targetGrade || "3 A's",
      examDate: match?.examDate || '2027-11-15',
      syllabus: match?.syllabus || 'current',
      medium: match?.medium || 'English',
      currentOnlyFilter: (match?.syllabus || 'current') === 'current',
      xp: match?.xp || 1000,
      streakDays: match?.streakDays || 3,
      streakFreezes: 1,
      dailyGoalMCQs: match?.dailyGoalMCQs || 15,
      dailyCompletedMCQs: 3,
      level: 3,
    };

    saveSession(profile);
    onSuccess(profile);
    onClose();
  };

  // Step 1 to Step 2 Validation
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setProvider('email');
    setSignUpStep(2);
  };

  // Final Sign Up Submission
  const handleFinalSignUp = () => {
    const finalProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: name || 'A/L Scholar',
      email: email || 'student@alstudy.lk',
      avatar: avatarUrl,
      provider: provider,
      isAuthenticated: true,
      stream: stream,
      selectedSubjects: selectedSubjects,
      targetGrade: targetGrade,
      examDate: examDate,
      syllabus: syllabus,
      medium: medium,
      currentOnlyFilter: syllabus === 'current',
      xp: 1500, // +100 bonus for completing signup
      streakDays: 1,
      streakFreezes: 2,
      dailyGoalMCQs: dailyGoalMCQs,
      dailyCompletedMCQs: 0,
      level: 1,
    };

    setIsCompleted(true);

    // Confetti celebration
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6B4EFF', '#00F5FF', '#10B981', '#F59E0B'],
      });
    } catch (e) {
      // ignore
    }

    saveSession(finalProfile);

    setTimeout(() => {
      onSuccess(finalProfile);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in p-2 sm:p-4 flex min-h-dvh items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl max-h-[calc(100dvh-1rem)] sm:max-h-[88vh] rounded-3xl border border-white/15 bg-[#12142B] text-slate-100 shadow-[0_0_50px_rgba(107,78,255,0.25)] flex flex-col overflow-hidden m-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-[#6B4EFF] to-emerald-400 z-20" />

        {/* Pinned Top Header: Mode Switcher Tabs + Close Button */}
        <div className="shrink-0 px-5 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-white/10 relative z-10 flex items-center justify-between gap-3 bg-[#12142B]/95 backdrop-blur-md">
          {!isCompleted ? (
            <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 w-full max-w-xs">
              <button
                type="button"
                id="tab-auth-signin"
                onClick={() => {
                  setMode('signin');
                  setSignUpStep(1);
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[#6B4EFF] text-white shadow-[0_0_15px_rgba(107,78,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-auth-signup"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#6B4EFF] text-white shadow-[0_0_15px_rgba(107,78,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Registration Complete</span>
            </div>
          )}

          {/* Close Button */}
          <button
            id="btn-close-auth-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body: Ensures entire form & buttons are 100% visible on any screen */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* ========================================================= */}
          {/* GOOGLE ACCOUNT SELECTION MODAL POPUP                      */}
          {/* ========================================================= */}
          {showGooglePicker && (
            <div className="p-5 sm:p-7 space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/20 mb-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Continue with Google</h3>
              <p className="text-xs text-slate-400">
                Choose an account to continue to Mind Maze A/L Revision
              </p>
            </div>

            <div className="space-y-3">
              {googleAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleAccountSelect(acc)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 transition-all text-left group"
                >
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-10 h-10 rounded-full border border-white/20 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white group-hover:text-cyan-300">
                      {acc.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{acc.email}</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  const fallbackEmail = email.trim() || 'scholar@gmail.com';
                  const customName = fallbackEmail.split('@')[0];
                  handleGoogleAccountSelect({
                    name: customName.charAt(0).toUpperCase() + customName.slice(1),
                    email: fallbackEmail,
                    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                  });
                }}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-white/20 text-xs text-slate-400 hover:text-white hover:border-white/40 text-center transition-colors"
              >
                + Connect with active Google account
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGooglePicker(false)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* SIGN IN VIEW                                              */}
        {/* ========================================================= */}
        {mode === 'signin' && !showGooglePicker && (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-black text-white">Welcome Back</h2>
              <p className="text-xs text-slate-300">
                Sign in to resume your GCE A/L syllabus revision & timetable.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* One-Click Google Button */}
            <button
              type="button"
              onClick={() => setShowGooglePicker(true)}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#12142B] px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                or sign in with email
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    required
                    className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setInfoMsg(`Password reset link sent to ${email.trim() ? email.trim() : 'your email address'} (simulated).`);
                    }}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(107,78,255,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                Sign In to Dashboard
              </button>
            </form>

            {/* Quick Demo Student Accounts Strip */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Quick Student Accounts for Testing:</span>
                <span className="text-[10px] text-purple-300">1-Click Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleQuickDemoSignIn(demo)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors text-[11px]"
                  >
                    <img
                      src={demo.avatar}
                      alt={demo.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{demo.name}</div>
                      <div className="text-[9px] text-cyan-300">{demo.stream} • 3 A's</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setSignUpStep(1);
                  }}
                  className="font-bold text-cyan-300 hover:underline"
                >
                  Create account with Stream & Preferences
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SIGN UP VIEW (WITH STREAM & PREFERENCES IN THE PROCESS!)  */}
        {/* ========================================================= */}
        {mode === 'signup' && !showGooglePicker && !isCompleted && (
          <div className="p-5 sm:p-7 space-y-5">
            {/* Multi-Step Wizard Indicator */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-slate-400">
                  Step {signUpStep} of 4:{' '}
                  <strong className="text-white">
                    {signUpStep === 1 && 'Account Credentials'}
                    {signUpStep === 2 && 'Select A/L Stream'}
                    {signUpStep === 3 && 'Subjects & Medium'}
                    {signUpStep === 4 && 'Goals & Preferences'}
                  </strong>
                </span>
                <span className="text-[11px] font-bold text-purple-300">
                  {signUpStep === 1 ? '25%' : signUpStep === 2 ? '50%' : signUpStep === 3 ? '75%' : '100%'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-[#6B4EFF] to-emerald-400 transition-all duration-300"
                  style={{ width: `${(signUpStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* STEP 1: Account Credentials */}
            {signUpStep === 1 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-white">Create Your Account</h2>
                  <p className="text-xs text-slate-300">
                    Get started with your custom A/L study routine and past paper tracker.
                  </p>
                </div>

                {/* Google Sign-Up Button */}
                <button
                  type="button"
                  onClick={() => setShowGooglePicker(true)}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign up with Google (Fastest)</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#12142B] px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    or register with email
                  </span>
                </div>

                <form onSubmit={handleNextStep1} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Kasun Silva"
                        required
                        className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@example.com"
                        required
                        className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 chars"
                          required
                          className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          required
                          className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(107,78,255,0.4)] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>Next: Select Stream & Preferences</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="font-bold text-cyan-300 hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: Stream Selection */}
            {signUpStep === 2 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white">Select Your A/L Stream</h2>
                  <p className="text-xs text-slate-300">
                    Mind Maze adapts question banks and revision topics for your stream.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleStreamSelect('Maths')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      stream === 'Maths'
                        ? 'border-[#6B4EFF] bg-[#6B4EFF]/20 shadow-[0_0_15px_rgba(107,78,255,0.3)] ring-1 ring-[#6B4EFF]'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-2 rounded-xl border border-blue-500/40 bg-blue-950/40 text-blue-400">
                        <Calculator className="w-4 h-4" />
                      </div>
                      {stream === 'Maths' && (
                        <div className="w-4 h-4 rounded-full bg-[#6B4EFF] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-white text-xs sm:text-sm">Physical Science (Maths)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Combined Maths, Physics, Chemistry / ICT
                    </div>
                    <div className="mt-1.5 text-[10px] text-purple-300 font-semibold bg-purple-500/20 px-2 py-0.5 rounded inline-block">
                      Engineering & Computing
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStreamSelect('Bio')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      stream === 'Bio'
                        ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-400">
                        <Dna className="w-4 h-4" />
                      </div>
                      {stream === 'Bio' && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-white text-xs sm:text-sm">Biological Science</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Biology, Physics, Chemistry / Agri
                    </div>
                    <div className="mt-1.5 text-[10px] text-emerald-300 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded inline-block">
                      Medicine & Bioscience
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setSignUpStep(1)}
                    className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignUpStep(3)}
                    className="py-2.5 px-6 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(107,78,255,0.4)] flex items-center gap-2"
                  >
                    <span>Next: Subjects & Medium</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Subjects & Medium Preferences */}
            {signUpStep === 3 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white">Subjects & Language Medium</h2>
                  <p className="text-xs text-slate-300">
                    Confirm your 3 examination subjects and preferred medium.
                  </p>
                </div>

                {/* Subject picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">
                    Primary Subjects ({stream} Stream):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBJECTS_BY_STREAM[stream]?.map((subj) => {
                      const isSelected = selectedSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => toggleSubject(subj)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                            isSelected
                              ? 'border-cyan-400/50 bg-cyan-400/15 text-white shadow-sm'
                              : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{subj}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Medium picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Language Medium:</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['English', 'Sinhala', 'Tamil'] as MediumType[]).map((med) => (
                      <button
                        key={med}
                        type="button"
                        onClick={() => setMedium(med)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          medium === med
                            ? 'border-cyan-400 bg-cyan-400/20 text-white shadow-[0_0_10px_rgba(0,245,255,0.2)]'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {med}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setSignUpStep(2)}
                    className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignUpStep(4)}
                    className="py-2.5 px-6 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(107,78,255,0.4)] flex items-center gap-2"
                  >
                    <span>Next: Goals & Preferences</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Goals & Study Preferences */}
            {signUpStep === 4 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white">Goals & Study Preferences</h2>
                  <p className="text-xs text-slate-300">
                    Tailor your targets, exam sitting, and daily MCQ commitment.
                  </p>
                </div>

                {/* Target Grade */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Target Grade Goal:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["3 A's", "2 A's 1 B", "1 A 2 B's", "3 B's"].map((tg) => (
                      <button
                        key={tg}
                        type="button"
                        onClick={() => setTargetGrade(tg)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all ${
                          targetGrade === tg
                            ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-sm'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {tg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exam Sitting */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>A/L Sitting Year:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '2027 (Nov Sitting)', date: '2027-11-15' },
                      { label: '2028 (Nov Sitting)', date: '2028-11-15' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setExamDate(item.date)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          examDate === item.date
                            ? 'border-cyan-400 bg-cyan-400/20 text-white shadow-sm'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily MCQ Target */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-purple-400" />
                    <span>Daily MCQ Goal:</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 30].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setDailyGoalMCQs(count)}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          dailyGoalMCQs === count
                            ? 'border-[#6B4EFF] bg-[#6B4EFF]/30 text-white shadow-sm'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {count} / day
                      </button>
                    ))}
                  </div>
                </div>

                {/* Syllabus Preference */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Syllabus Track:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSyllabus('current')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                        syllabus === 'current'
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">✨ Current (2019+)</div>
                      <div className="text-[10px] text-slate-400">Standard syllabus</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyllabus('old')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                        syllabus === 'old'
                          ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">📜 Old Syllabus</div>
                      <div className="text-[10px] text-slate-400">Pre-2019 curriculum</div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setSignUpStep(3)}
                    className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSignUp}
                    className="py-3 px-8 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-cyan-500 hover:from-[#7C5DFA] hover:to-cyan-400 text-white text-xs font-black transition-all shadow-[0_0_20px_rgba(107,78,255,0.5)] flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Complete Sign Up (+100 XP)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* CELEBRATION / SUCCESS STATE                               */}
        {/* ========================================================= */}
        {isCompleted && (
          <div className="p-6 sm:p-8 text-center space-y-4 animate-scale-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl font-black text-white">Account Created Successfully!</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Welcome to Mind Maze, <strong>{name}</strong>! Your <strong>{stream} Stream</strong>{' '}
              routine, <strong>{medium} Medium</strong>, and <strong>{targetGrade}</strong> target have been saved.
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6B4EFF]/20 border border-[#6B4EFF]/40 text-xs font-bold text-cyan-300">
              <Sparkles className="w-4 h-4" />
              <span>+100 New Scholar Bonus XP Unlocked!</span>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
