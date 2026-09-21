import { useState, useEffect, useCallback } from 'react';
import { ScreenId, StreamType, UserSettings, SyllabusTopic, TimetableEntry, DailyTask, MistakeItem, UserProfile } from './types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from './services/api';
import { getStoredTimetable, saveStoredTimetable, getUserSettings, saveUserSettings, getStoredSyllabusTopics, saveStoredSyllabusTopics } from './lib/storage';
import { getInitialTimetableForStream, INITIAL_SYLLABUS_TOPICS } from './data/alSyllabusData';
import { MOCK_QUESTIONS } from './data/mockData';

// Layout & Common Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomBar } from './components/MobileBottomBar';
import { MazeBackground } from './components/MazeBackground';
import { CelebrationModal, Celebration } from './components/common/CelebrationModal';

// Feature Components
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { StudyPlanner } from './components/planner/StudyPlanner';
import { TopicTracker } from './components/topics/TopicTracker';
import { CourseCatalogScreen } from './components/courses/CourseCatalogScreen';
import { AdminCourseManager } from './components/courses/AdminCourseManager';
import { PracticeQuizScreen } from './components/screens/PracticeQuizScreen';
import { MistakeNotebookScreen } from './components/screens/MistakeNotebookScreen';
import { PastPaperLibraryScreen } from './components/screens/PastPaperLibraryScreen';
import { Leaderboard } from './components/leaderboard/Leaderboard';
import { ProgressAnalytics } from './components/progress/ProgressAnalytics';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { AdminPanel } from './components/admin/AdminPanel';
import { ProfileEditModal } from './components/profile/ProfileEditModal';
import { LandingPage } from './components/screens/LandingPage';

import { Loader2, LogIn, UserPlus, X, Sparkles, BookOpen } from 'lucide-react';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // User State & Auth
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null);

  // Auth Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [streamInput, setStreamInput] = useState<StreamType>('Physical Science');
  const [electiveInput, setElectiveInput] = useState<'Chemistry' | 'ICT'>('Chemistry');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Profile Edit Modal State
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  // Syllabus & Planner State
  const [userSettings, setUserSettingsState] = useState<UserSettings>(() => getUserSettings() || DEFAULT_SETTINGS);
  const [syllabusTopics, setSyllabusTopics] = useState<SyllabusTopic[]>(() => getStoredSyllabusTopics() || INITIAL_SYLLABUS_TOPICS);
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => getStoredTimetable() || []);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  // Check auth on mount
  useEffect(() => {
    checkCurrentAuth();
  }, []);

  const checkCurrentAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    try {
      const res = await api.getProfile();
      setUser(res.user);
      if (res.user.stream) {
        setUserSettingsState((prev) => ({
          ...prev,
          stream: res.user.stream,
          physicalScienceElective: res.user.physicalScienceElective || 'Chemistry',
          studentName: res.user.name,
          targetExamYear: res.user.targetExamYear || '2026',
          targetExamDate: res.user.targetExamDate || '',
          targetZScore: res.user.targetZScore || '',
        }));
      }
    } catch (e) {
      removeAuthToken();
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthSubmitting(true);
      setAuthError(null);
      const res = await api.login({ email: emailInput, password: passwordInput });
      setAuthToken(res.token);
      setUser(res.user);
      setAuthModalMode(null);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Check your email and password.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthSubmitting(true);
      setAuthError(null);
      const res = await api.register({
        name: nameInput,
        email: emailInput,
        password: passwordInput,
        stream: streamInput,
        physicalScienceElective: electiveInput,
      });
      setAuthToken(res.token);
      setUser(res.user);
      setAuthModalMode(null);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = () => {
    removeAuthToken();
    setUser(null);
    setCurrentScreen('dashboard');
  };

  // Convert Mongoose / State to legacy UserProfile shape for components
  const userProfile: UserProfile = {
    name: user?.name || userSettings.studentName || 'A/L Scholar',
    email: user?.email || '',
    stream: user?.stream || userSettings.stream || 'Physical Science',
    xp: 0,
    streakDays: user?.streakDays || 1,
    targetYear: user?.targetExamYear || '2026',
    targetZScore: user?.targetZScore || '',
    examDate: user?.targetExamDate || '',
    dailyCompletedMCQs: 0,
    isAuthenticated: !!user,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Connecting to Mind Maze Server...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Background Animated Maze Grid */}
      <MazeBackground />

      {/* Top Navigation Bar */}
      <Navbar
        userProfile={userProfile}
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onOpenAuthModal={(mode) => setAuthModalMode(mode)}
        onSignOut={handleSignOut}
        onOpenProfileEdit={() => setIsProfileEditOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          userRole={user?.role || 'student'}
          onSignOut={handleSignOut}
        />

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Home / Dashboard Screen */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-6">
              {/* Pomodoro Study Timer on Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <PomodoroTimer
                    onSessionComplete={(type, mins) => {
                      if (type === 'work') {
                        setCelebration({
                          title: 'Pomodoro Completed! 🎯',
                          message: `Great job! You finished a ${mins}-minute focus study session. Keep building your streak!`,
                        });
                      }
                    }}
                  />
                </div>

                <div className="lg:col-span-2">
                  <DashboardOverview
                    stream={userSettings?.stream || 'Physical Science'}
                    physicalScienceElective={userSettings?.physicalScienceElective || 'Chemistry'}
                    timetableEntries={timetable || []}
                    dailyTasks={[]}
                    syllabusTopics={syllabusTopics || INITIAL_SYLLABUS_TOPICS}
                    streakData={{ currentStreak: userProfile?.streakDays || 1, bestStreak: userProfile?.streakDays || 1, isCompletedToday: false, completedDates: [] }}
                    onNavigate={setCurrentScreen}
                    onOpenProfileEdit={() => setIsProfileEditOpen(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Syllabus Progress Tracker */}
          {currentScreen === 'topics' && (
            <TopicTracker
              topics={syllabusTopics}
              stream={userSettings.stream}
              onUpdateSubtopicProgress={(topicId, subtopic, progress) => {
                const updated = syllabusTopics.map((t) => {
                  if (t.id === topicId) {
                    const map = t.subtopicProgress || {};
                    map[subtopic] = progress;
                    return { ...t, subtopicProgress: map };
                  }
                  return t;
                });
                setSyllabusTopics(updated);
                saveStoredSyllabusTopics(updated);
              }}
              onSaveCompletedPicker={(completedIds) => {
                const updated = syllabusTopics.map((t) =>
                  completedIds.includes(t.id) ? { ...t, status: 'completed' as const } : t
                );
                setSyllabusTopics(updated);
                saveStoredSyllabusTopics(updated);
              }}
            />
          )}

          {/* Timetable & Study Planner */}
          {currentScreen === 'planner' && (
            <StudyPlanner
              userSettings={userSettings}
              timetable={timetable}
              syllabusTopics={syllabusTopics}
              onSaveTimetable={(newSlots) => {
                setTimetable(newSlots);
                saveStoredTimetable(newSlots);
              }}
            />
          )}

          {/* Courses & Media Catalog */}
          {currentScreen === 'courses' && <CourseCatalogScreen />}

          {/* Practice Quiz */}
          {currentScreen === 'quiz' && (
            <PracticeQuizScreen
              userProfile={userProfile}
              onNavigate={setCurrentScreen}
              onSaveMistake={(m) => setMistakes((prev) => [m, ...prev])}
            />
          )}

          {/* Mistake Notebook */}
          {currentScreen === 'mistakes' && (
            <MistakeNotebookScreen
              mistakes={mistakes}
              onNavigate={setCurrentScreen}
              onToggleMastered={(id) => {
                setMistakes((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, isMastered: !m.isMastered, reviewStatus: 'Mastered' } : m))
                );
              }}
              onDeleteMistake={(id) => setMistakes((prev) => prev.filter((m) => m.id !== id))}
              onStartReviewSession={() => setCurrentScreen('quiz')}
            />
          )}

          {/* Past Papers */}
          {currentScreen === 'pastpapers' && (
            <PastPaperLibraryScreen
              userStream={userSettings.stream}
              onNavigate={setCurrentScreen}
            />
          )}

          {/* Leaderboard */}
          {currentScreen === 'leaderboard' && (
            <Leaderboard
              currentUserProfile={userProfile}
              onNavigate={setCurrentScreen}
            />
          )}

          {/* Analytics Progress */}
          {currentScreen === 'progress' && (
            <ProgressAnalytics
              userSettings={userSettings}
              syllabusTopics={syllabusTopics}
              timetable={timetable}
            />
          )}

          {/* Settings */}
          {currentScreen === 'settings' && (
            <SettingsScreen
              settings={userSettings}
              onSaveSettings={(s) => {
                setUserSettingsState(s);
                saveUserSettings(s);
              }}
              userRole={user?.role || 'student'}
              onOpenProfileEdit={() => setIsProfileEditOpen(true)}
            />
          )}

          {/* Admin Panel */}
          {currentScreen === 'admin' && (
            user?.role === 'admin' ? (
              <div className="space-y-8">
                <AdminPanel
                  userRole={user?.role || 'admin'}
                  profileLoaded={true}
                  onNavigateHome={() => setCurrentScreen('dashboard')}
                />
                <AdminCourseManager />
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-[#161831]/80 border border-white/10 text-center space-y-4 max-w-md mx-auto my-12">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-white">Access Restricted</h2>
                <p className="text-xs text-slate-400">
                  The Admin Control Panel is reserved for registered administrators. Please sign in with admin credentials to access this portal.
                </p>
                <button
                  onClick={() => setCurrentScreen('dashboard')}
                  className="px-5 py-2.5 rounded-xl bg-[#6B4EFF] text-white text-xs font-bold hover:bg-[#5b3eff] transition cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* Mobile Bottom Action Bar */}
      <MobileBottomBar currentScreen={currentScreen} onNavigate={setCurrentScreen} />

      {/* Auth Modal (Signin / Signup) */}
      {authModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setAuthModalMode(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {authModalMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                </h3>
                <p className="text-xs text-slate-400">
                  {authModalMode === 'signin' ? 'Sign in to access your study planner' : 'Join Mind Maze GCE A/L Community'}
                </p>
              </div>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={authModalMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
              {authModalMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Kasun Perera"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                  required
                />
              </div>

              {authModalMode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">A/L Stream</label>
                    <select
                      value={streamInput}
                      onChange={(e) => setStreamInput(e.target.value as StreamType)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                    >
                      <option value="Physical Science">Physical Science</option>
                      <option value="Biological Science">Biological Science</option>
                      <option value="Maths">Maths</option>
                      <option value="Bio">Bio</option>
                    </select>
                  </div>

                  {streamInput === 'Physical Science' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Elective</label>
                      <select
                        value={electiveInput}
                        onChange={(e) => setElectiveInput(e.target.value as 'Chemistry' | 'ICT')}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                      >
                        <option value="Chemistry">Chemistry</option>
                        <option value="ICT">ICT</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                {authSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authModalMode === 'signin' ? (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Create Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
              {authModalMode === 'signin' ? (
                <p>
                  Don't have an account?{' '}
                  <button onClick={() => setAuthModalMode('signup')} className="text-indigo-400 font-bold hover:underline">
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button onClick={() => setAuthModalMode('signin')} className="text-indigo-400 font-bold hover:underline">
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileEditOpen}
        onClose={() => setIsProfileEditOpen(false)}
        currentUser={user}
        onProfileUpdated={(updated) => {
          setUser(updated);
          setUserSettingsState((prev) => ({
            ...prev,
            studentName: updated.name,
            stream: updated.stream,
            physicalScienceElective: updated.physicalScienceElective,
            targetExamYear: updated.targetExamYear,
            targetExamDate: updated.targetExamDate,
            targetZScore: updated.targetZScore,
          }));
        }}
      />

      {/* Celebration Modal */}
      {celebration && (
        <CelebrationModal
          title={celebration.title}
          message={celebration.message}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

export default App;
