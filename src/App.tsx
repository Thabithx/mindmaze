import { useState, useEffect, useCallback } from 'react';
import { ScreenId, StreamType, UserSettings, SyllabusTopic, TimetableEntry, DailyTask, MistakeItem, UserProfile, PastPaper, Question } from './types';
import { api, getAuthToken, setAuthToken, removeAuthToken, getStoredUser, setStoredUser, removeStoredUser } from './services/api';
import {
  getStoredTimetable,
  saveStoredTimetable,
  getUserSettings,
  saveUserSettings,
  getStoredSyllabusTopics,
  saveStoredSyllabusTopics,
  getStoredDailyTasks,
  saveStoredDailyTasks,
  getStoredMistakes,
  saveStoredMistakes,
  getStoredPastPapers,
  saveStoredPastPapers,
  getStoredQuizQuestions,
  saveStoredQuizQuestions,
  getDayOfWeekFromDate,
  calculateMinutesBetween,
  DEFAULT_SETTINGS,
} from './lib/storage';
import { getInitialTimetableForStream, INITIAL_SYLLABUS_TOPICS } from './data/alSyllabusData';
import { MOCK_QUESTIONS } from './data/mockData';
import { recordDailyVisit, calculateStreak, recordTaskCompletionAndRefreshStreak } from './lib/streakService';

// Layout & Common Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomBar } from './components/MobileBottomBar';
import { MazeBackground } from './components/MazeBackground';
import { CelebrationModal, Celebration } from './components/common/CelebrationModal';
import { WhatsAppCommunityBanner } from './components/common/WhatsAppCommunityBanner';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';

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
import { NotificationsScreen } from './components/notifications/NotificationsScreen';
import { LandingPage } from './components/screens/LandingPage';
import { useNotifications } from './hooks/useNotifications';

import { Loader2, LogIn, UserPlus, X, Sparkles, BookOpen, Zap } from 'lucide-react';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // User State & Auth
  const [user, setUser] = useState<any>(() => getStoredUser());
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null);

  // Auth Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
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
  const [tasks, setTasks] = useState<DailyTask[]>(() => getStoredDailyTasks() || []);
  const [mistakes, setMistakes] = useState<MistakeItem[]>(() => getStoredMistakes());
  const [pastPapers, setPastPapers] = useState<PastPaper[]>(() => getStoredPastPapers());
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(() => getStoredQuizQuestions());
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  // Block lifecycle trackers
  const [dismissedBlockIds, setDismissedBlockIds] = useState<string[]>([]);
  const [streakDays, setStreakDays] = useState<number>(() => calculateStreak(getStoredDailyTasks() || []).currentStreak || 1);

  const handleAddPastPaper = (newPaper: PastPaper) => {
    const updated = [newPaper, ...pastPapers];
    setPastPapers(updated);
    saveStoredPastPapers(updated);
  };

  const handleDeletePastPaper = (paperId: string) => {
    const updated = pastPapers.filter((p) => p.id !== paperId);
    setPastPapers(updated);
    saveStoredPastPapers(updated);
  };

  const handleAddQuizQuestion = (newQ: Question) => {
    const updated = [newQ, ...quizQuestions];
    setQuizQuestions(updated);
    saveStoredQuizQuestions(updated);
  };

  const handleDeleteQuizQuestion = (qId: string) => {
    const updated = quizQuestions.filter((q) => q.id !== qId);
    setQuizQuestions(updated);
    saveStoredQuizQuestions(updated);
  };

  useEffect(() => {
    checkCurrentAuth();
    const streakState = recordDailyVisit();
    setStreakDays(streakState.currentStreak);
    const token = getAuthToken();
    if (token) {
      api.updateProfile({ streakDays: streakState.currentStreak, bestStreak: streakState.bestStreak }).catch(() => {});
    }
  }, []);

  const checkCurrentAuth = async () => {
    const token = getAuthToken();
    const cachedUser = getStoredUser();
    if (cachedUser) {
      setUser(cachedUser);
      if (cachedUser.role === 'admin') {
        setCurrentScreen('admin');
      }
    }

    if (!token) {
      setAuthLoading(false);
      return;
    }
    try {
      const res = await api.getProfile();
      if (res?.user) {
        setUser(res.user);
        setStoredUser(res.user);
        if (res.user.role === 'admin') {
          setCurrentScreen('admin');
        }
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

        // Sync timetable with backend database
        try {
          const ttRes = await api.getTimetable();
          if (ttRes?.timetable && ttRes.timetable.length > 0) {
            const mapped: TimetableEntry[] = ttRes.timetable.map((s: any) => ({
              id: s._id || s.id,
              dayOfWeek: s.dayOfWeek,
              subject: s.subject,
              topic: s.topic,
              blockType: s.blockType || 'study',
              topicId: s.topicId || '',
              subtopicTargets: s.subtopicTargets || [],
              isCompleted: Boolean(s.isCompleted),
              startTime: s.startTime,
              endTime: s.endTime,
              color: s.color || 'blue',
              reminderEnabled: s.reminderEnabled !== undefined ? Boolean(s.reminderEnabled) : true,
              reminderOffsetMinutes: s.reminderOffsetMinutes || 15,
              notes: s.notes || '',
            }));
            setTimetable(mapped);
            saveStoredTimetable(mapped);
          } else {
            const local = getStoredTimetable() || [];
            if (local.length > 0) {
              await api.syncTimetable(local);
            }
          }
        } catch (ttErr) {
          console.warn('[Timetable] Initial fetch/sync notice:', ttErr);
        }
      }
    } catch (e: any) {
      console.warn('[Auth] checkCurrentAuth warning:', e?.message || e);
      if (
        e?.message?.includes('401') ||
        e?.message?.toLowerCase().includes('unauthorized') ||
        e?.message?.toLowerCase().includes('invalid token')
      ) {
        removeAuthToken();
        removeStoredUser();
        setUser(null);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const syncTimetableToCloud = async (slots: TimetableEntry[]) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      await api.syncTimetable(slots);
    } catch (err: any) {
      console.warn('[Timetable] Cloud sync notice:', err?.message || err);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const res = await api.login({ email: emailInput.trim(), password: passwordInput });
      if (!res?.token) {
        throw new Error(res?.message || 'Invalid credentials');
      }
      setAuthToken(res.token);
      setUser(res.user);
      setStoredUser(res.user);
      setAuthModalMode(null);
      if (res.user?.role === 'admin') {
        setCurrentScreen('admin');
      }

      const local = getStoredTimetable() || [];
      if (local.length > 0) {
        api.syncTimetable(local).catch(() => {});
      }
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      setAuthError(err.message || 'Invalid email or password. Please try again.');
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
        whatsappNumber: whatsappInput,
        stream: streamInput,
        physicalScienceElective: streamInput === 'Physical Science' ? electiveInput : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Colombo',
      } as any);
      setAuthToken(res.token);
      setUser(res.user);
      setStoredUser(res.user);
      setAuthModalMode(null);
      if (res.user?.role === 'admin') {
        setCurrentScreen('admin');
      }

      const local = getStoredTimetable() || [];
      if (local.length > 0) {
        api.syncTimetable(local).catch(() => {});
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = () => {
    removeAuthToken();
    removeStoredUser();
    setUser(null);
    setCurrentScreen('dashboard');
  };

  const globalExamDate = (() => {
    try {
      return localStorage.getItem('mindmaze_global_exam_date') || '';
    } catch {
      return '';
    }
  })();

  const userProfile: UserProfile = {
    name: user?.name || userSettings.studentName || 'A/L Scholar',
    email: user?.email || '',
    stream: user?.stream || userSettings.stream || 'Physical Science',
    xp: 0,
    streakDays: streakDays || user?.streakDays || 1,
    targetYear: user?.targetExamYear || '2026',
    targetZScore: user?.targetZScore || '',
    examDate: globalExamDate || user?.targetExamDate || '2026-11-25',
    dailyCompletedMCQs: 0,
    isAuthenticated: !!user,
  };

  const { permission: notificationPermission, requestPermission, sendNotification } = useNotifications();

  // Active timetable session detection
  const [activePomodoroTopic, setActivePomodoroTopic] = useState<{
    title: string;
    subject: string;
    id?: string;
    topicId?: string;
    subtopics?: string[];
  } | null>(null);
  const [isPomodoroMinimized, setIsPomodoroMinimized] = useState(false);
  const [hasPromptedActiveBlock, setHasPromptedActiveBlock] = useState(false);

  useEffect(() => {
    const checkActiveBlock = () => {
      const now = new Date();
      const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;

      const currentBlock = timetable.find((entry) => {
        if (entry.dayOfWeek !== currentDay) return false;
        return entry.startTime <= currentTimeStr && currentTimeStr <= entry.endTime;
      });

      if (
        currentBlock &&
        !dismissedBlockIds.includes(currentBlock.id) &&
        (!activePomodoroTopic || activePomodoroTopic.id !== currentBlock.id)
      ) {
        // Find matching syllabus topic for the study block
        let matchedTopic: SyllabusTopic | undefined;
        if (currentBlock.topicId) {
          matchedTopic = syllabusTopics.find((t) => t.id === currentBlock.topicId);
        }
        if (!matchedTopic && currentBlock.topic) {
          matchedTopic = syllabusTopics.find(
            (t) =>
              t.topicTitle.toLowerCase() === currentBlock.topic.toLowerCase() ||
              (currentBlock.subject &&
                t.subject.toLowerCase() === currentBlock.subject.toLowerCase() &&
                t.topicTitle.toLowerCase().includes(currentBlock.topic.toLowerCase()))
          );
        }

        const subtopicList = currentBlock.subtopicTargets && currentBlock.subtopicTargets.length > 0
          ? currentBlock.subtopicTargets.map((st) => st.subtopic)
          : matchedTopic?.subtopics || [];

        setActivePomodoroTopic({
          title: matchedTopic?.topicTitle || currentBlock.topic,
          subject: currentBlock.subject || matchedTopic?.subject || '',
          id: currentBlock.id,
          topicId: matchedTopic?.id || currentBlock.topicId,
          subtopics: subtopicList,
        });

        setCurrentScreen('dashboard');
        setIsPomodoroMinimized(false);

        if (!hasPromptedActiveBlock) {
          sendNotification(
            'Study Session Starting!',
            `Your scheduled study block "${currentBlock.topic}" (${currentBlock.subject}) has started!`,
            `study-block-${currentBlock.id}`
          );
          setHasPromptedActiveBlock(true);
        }
      }
    };

    checkActiveBlock();
    const interval = setInterval(checkActiveBlock, 30000);
    return () => clearInterval(interval);
  }, [timetable, activePomodoroTopic, hasPromptedActiveBlock, dismissedBlockIds, sendNotification]);


  const activeSyllabusTopic = activePomodoroTopic
    ? (activePomodoroTopic.topicId ? syllabusTopics.find((t) => t.id === activePomodoroTopic.topicId) : null) ||
      syllabusTopics.find(
        (t) =>
          t.id === activePomodoroTopic.id ||
          t.topicTitle.toLowerCase() === activePomodoroTopic.title.toLowerCase() ||
          (activePomodoroTopic.subject &&
            t.subject.toLowerCase() === activePomodoroTopic.subject.toLowerCase() &&
            t.topicTitle.toLowerCase().includes(activePomodoroTopic.title.toLowerCase()))
      )
    : null;
  const activeSubtopics = activePomodoroTopic?.subtopics && activePomodoroTopic.subtopics.length > 0
    ? activePomodoroTopic.subtopics
    : activeSyllabusTopic?.subtopics || [];
  const activeCompletedSubtopics = activeSyllabusTopic?.completedSubtopics || [];

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleFocusWithPomodoro = () => {
    setIsPomodoroMinimized(false);
    setCurrentScreen('dashboard');
    setTimeout(() => {
      const el = document.getElementById('pomodoro-timer-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-indigo-500/50');
        setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500/50'), 2500);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Background Animated Maze Grid */}
      <MazeBackground />

      {/* WhatsApp Community Banner */}
      <WhatsAppCommunityBanner />

      {/* Global Cmd+K Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={setCurrentScreen}
        syllabusTopics={syllabusTopics}
        pastPapers={pastPapers}
        quizQuestions={quizQuestions}
        tasks={tasks}
      />

      {/* Top Navigation Bar */}
      <Navbar
        userProfile={userProfile}
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onOpenSearch={() => setIsSearchOpen(true)}
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
          isAuthenticated={!!user}
          onOpenAuthModal={(mode) => setAuthModalMode(mode)}
          onSignOut={handleSignOut}
        />

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 pb-28 sm:pb-8 md:pb-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Home / Dashboard Screen */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-6">
              {activePomodoroTopic && (
                <div className="glass-card p-4 rounded-2xl border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-slate-900/70 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 block">
                        Scheduled Study Block Active Now
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {activePomodoroTopic.title} • <span className="text-slate-400">{activePomodoroTopic.subject}</span>
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleFocusWithPomodoro}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      Focus With Pomodoro
                    </button>
                  </div>
                </div>
              )}

              <DashboardOverview
                stream={userSettings?.stream || 'Physical Science'}
                physicalScienceElective={userSettings?.physicalScienceElective || 'Chemistry'}
                timetableEntries={timetable || []}
                dailyTasks={tasks || []}
                syllabusTopics={syllabusTopics || INITIAL_SYLLABUS_TOPICS}
                userProfile={userProfile}
                userSettings={userSettings}
                onNavigate={setCurrentScreen}
                onOpenProfileEdit={() => setIsProfileEditOpen(true)}
                pomodoroSlot={
                  <PomodoroTimer
                    activeUnitTitle={activePomodoroTopic?.title}
                    activeSubject={activePomodoroTopic?.subject}
                    subtopics={activeSubtopics}
                    completedSubtopics={activeCompletedSubtopics}
                    availableTopics={syllabusTopics}
                    userStream={userSettings?.stream || 'Physical Science'}
                    physicalScienceElective={userSettings?.physicalScienceElective || 'Chemistry'}
                    onSelectTopic={(topic) => {
                      setActivePomodoroTopic({
                        title: topic.topicTitle,
                        subject: topic.subject,
                        id: topic.id,
                        topicId: topic.id,
                        subtopics: topic.subtopics || [],
                      });
                    }}
                    onToggleSubtopic={(subtopicTitle) => {
                      const topicToUpdate = activeSyllabusTopic || (activePomodoroTopic?.title ? syllabusTopics.find(t => t.topicTitle.toLowerCase() === activePomodoroTopic.title.toLowerCase()) : null);
                      if (topicToUpdate) {
                        const updated = syllabusTopics.map((t) => {
                          if (t.id === topicToUpdate.id || t.topicTitle.toLowerCase() === topicToUpdate.topicTitle.toLowerCase()) {
                            const map = { ...(t.subtopicProgress || {}) };
                            const current = map[subtopicTitle] || (t.completedSubtopics?.includes(subtopicTitle) ? 100 : 0);
                            const targetVal = current >= 100 ? 0 : 100;
                            map[subtopicTitle] = targetVal;

                            const subs = t.subtopics || [];
                            let completed = [...(t.completedSubtopics || [])].filter((s) => s !== subtopicTitle);
                            if (targetVal === 100) completed.push(subtopicTitle);

                            let newStatus: any = 'not_started';
                            if (subs.length > 0) {
                              const totalPoints = subs.reduce((sum, s) => sum + (map[s] !== undefined ? map[s] : (completed.includes(s) ? 100 : 0)), 0);
                              if (totalPoints >= subs.length * 100) newStatus = 'completed';
                              else if (totalPoints > 0) newStatus = 'in_progress';
                            }
                            return {
                              ...t,
                              subtopicProgress: map,
                              completedSubtopics: completed,
                              status: newStatus,
                            };
                          }
                          return t;
                        });
                        setSyllabusTopics(updated);
                        saveStoredSyllabusTopics(updated);
                      }
                    }}
                    isMinimized={isPomodoroMinimized}
                    onToggleMinimize={() => setIsPomodoroMinimized(!isPomodoroMinimized)}
                    onStartSession={() => {
                      const topicToStart = activeSyllabusTopic || (activePomodoroTopic?.title ? syllabusTopics.find(t => t.topicTitle.toLowerCase() === activePomodoroTopic.title.toLowerCase()) : null);
                      if (topicToStart) {
                        const updated = syllabusTopics.map((t) => {
                          if (t.id === topicToStart.id || t.topicTitle.toLowerCase() === topicToStart.topicTitle.toLowerCase()) {
                            return { ...t, status: 'in_progress' as const };
                          }
                          return t;
                        });
                        setSyllabusTopics(updated);
                        saveStoredSyllabusTopics(updated);
                      }
                    }}
                    onMarkFinished={() => {
                      const title = activePomodoroTopic?.title || activeSyllabusTopic?.topicTitle || 'this study unit';
                      if (!window.confirm(`Are you sure you want to mark "${title}" as finished?`)) {
                        return;
                      }

                      // Find matching timetable block if any
                      const matchedTimetableEntry = activePomodoroTopic?.id
                        ? timetable.find(e => e.id === activePomodoroTopic.id)
                        : null;

                      const currentTopic =
                        activeSyllabusTopic ||
                        (matchedTimetableEntry?.topicId ? syllabusTopics.find(t => t.id === matchedTimetableEntry.topicId) : null) ||
                        (activePomodoroTopic?.id ? syllabusTopics.find(t => t.id === activePomodoroTopic.id) : null) ||
                        (activePomodoroTopic?.title ? syllabusTopics.find(t =>
                          t.topicTitle.toLowerCase() === activePomodoroTopic.title.toLowerCase() ||
                          t.topicTitle.toLowerCase().includes(activePomodoroTopic.title.toLowerCase()) ||
                          activePomodoroTopic.title.toLowerCase().includes(t.topicTitle.toLowerCase())
                        ) : null);

                      if (currentTopic) {
                        const subs = currentTopic.subtopics || [];
                        const newMap: Record<string, number> = { ...(currentTopic.subtopicProgress || {}) };
                        subs.forEach((s) => { newMap[s] = 100; });
                        const updated = syllabusTopics.map((t) => {
                          if (t.id === currentTopic.id || t.topicTitle.toLowerCase() === currentTopic.topicTitle.toLowerCase()) {
                            return {
                              ...t,
                              status: 'completed' as const,
                              subtopicProgress: newMap,
                              completedSubtopics: [...subs],
                            };
                          }
                          return t;
                        });
                        setSyllabusTopics(updated);
                        saveStoredSyllabusTopics(updated);
                      }

                      if (activePomodoroTopic?.id) {
                        const updatedTimetable = timetable.map(entry => {
                          if (entry.id === activePomodoroTopic.id) {
                            return { ...entry, isCompleted: true };
                          }
                          return entry;
                        });
                        setTimetable(updatedTimetable);
                        saveStoredTimetable(updatedTimetable);
                      }

                      // Also mark matching daily task completed
                      const updatedTasks = tasks.map((tk) => {
                        if (
                          (currentTopic && tk.topicId === currentTopic.id) ||
                          (activePomodoroTopic && tk.title && tk.title.toLowerCase().includes(activePomodoroTopic.title.toLowerCase()))
                        ) {
                          return { ...tk, isCompleted: true };
                        }
                        return tk;
                      });
                      setTasks(updatedTasks);
                      saveStoredDailyTasks(updatedTasks);

                      // Refresh streak
                      const refreshedStreak = recordTaskCompletionAndRefreshStreak(updatedTasks, true);
                      setStreakDays(refreshedStreak.currentStreak);

                      setCelebration({
                        title: 'Study Task Completed! 🎉',
                        message: `Awesome job! You finished "${title}". Keep up the great streak!`,
                      });
                      if (activePomodoroTopic?.id) {
                        setDismissedBlockIds((prev) => [...prev, activePomodoroTopic.id!]);
                      }
                      setActivePomodoroTopic(null);
                    }}
                    onSessionComplete={(type, mins) => {
                      if (type === 'work') {
                        setCelebration({
                          title: 'Pomodoro Completed!',
                          message: `Great job! You finished a ${mins}-minute focus study session. Keep building your streak!`,
                        });
                      }
                    }}
                  />
                }
              />
            </div>
          )}

          {/* Syllabus Progress Tracker */}
          {currentScreen === 'topics' && (
            !user ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-[#161831]/90 border border-white/10 text-center space-y-5 max-w-lg mx-auto my-12 shadow-2xl backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    Student Account Required
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">Unlock Syllabus Tracker</h2>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                    Sign in or create a free account to track your GCE A/L syllabus progress across all units, tick off subtopics, and monitor your mastery breakdown.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setAuthModalMode('signup')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25 cursor-pointer"
                  >
                    Create Free Account
                  </button>
                  <button
                    onClick={() => setAuthModalMode('signin')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            ) : (
              <TopicTracker
                topics={syllabusTopics}
                stream={userSettings.stream}
                physicalScienceElective={userSettings.physicalScienceElective}
                dailyTasks={tasks}
                userId={user?.id || userProfile?.id}
                onUpdateTopicStatus={(topicId, status) => {
                  const updated = syllabusTopics.map((t) => {
                    if (t.id === topicId) {
                      const allSubtopics = t.subtopics || [];
                      const isCompleted = status === 'completed';
                      const newProgress: Record<string, number> = {};
                      allSubtopics.forEach(s => { newProgress[s] = isCompleted ? 100 : 0; });
                      return {
                        ...t,
                        status,
                        subtopicProgress: newProgress,
                        completedSubtopics: isCompleted ? [...allSubtopics] : []
                      };
                    }
                    return t;
                  });
                  setSyllabusTopics(updated);
                  saveStoredSyllabusTopics(updated);
                }}
                onToggleSubtopic={(topicId, subtopicTitle) => {
                  const updated = syllabusTopics.map((t) => {
                    if (t.id === topicId) {
                      const map = { ...(t.subtopicProgress || {}) };
                      const current = map[subtopicTitle] || (t.completedSubtopics?.includes(subtopicTitle) ? 100 : 0);
                      const targetVal = current >= 100 ? 0 : 100;
                      map[subtopicTitle] = targetVal;
                      
                      const subs = t.subtopics || [];
                      let completed = [...(t.completedSubtopics || [])].filter(s => s !== subtopicTitle);
                      if (targetVal === 100) completed.push(subtopicTitle);
                      
                      let newStatus: any = 'not_started';
                      if (subs.length > 0) {
                        const totalPoints = subs.reduce((sum, s) => sum + (map[s] !== undefined ? map[s] : (completed.includes(s) ? 100 : 0)), 0);
                        if (totalPoints >= subs.length * 100) newStatus = 'completed';
                        else if (totalPoints > 0) newStatus = 'in_progress';
                      }
                      return {
                        ...t,
                        subtopicProgress: map,
                        completedSubtopics: completed,
                        status: newStatus,
                      };
                    }
                    return t;
                  });
                  setSyllabusTopics(updated);
                  saveStoredSyllabusTopics(updated);
                }}
                onBulkOnboardingComplete={(completedTopicIds, subtopicKeys) => {
                  const topicIdSet = new Set(completedTopicIds);
                  const partialSubtopicMap = new Map<string, Set<string>>();
                  subtopicKeys.forEach((key) => {
                    const [topicId, subtopic] = key.split('|||');
                    if (!topicId || !subtopic) return;
                    if (!partialSubtopicMap.has(topicId)) partialSubtopicMap.set(topicId, new Set());
                    partialSubtopicMap.get(topicId)!.add(subtopic);
                  });

                  const updated = syllabusTopics.map((t) => {
                    const isFullyCompleted = topicIdSet.has(t.id);
                    const partialSubtopics = partialSubtopicMap.get(t.id);

                    if (isFullyCompleted) {
                      const allSubs = t.subtopics || [];
                      const newProgress: Record<string, number> = {};
                      allSubs.forEach(s => { newProgress[s] = 100; });
                      return {
                        ...t,
                        status: 'completed' as const,
                        subtopicProgress: newProgress,
                        completedSubtopics: [...allSubs],
                      };
                    }

                    if (partialSubtopics && partialSubtopics.size > 0) {
                      const map: Record<string, number> = {};
                      const subs = t.subtopics || [];
                      partialSubtopics.forEach((sub) => {
                        map[sub] = 100;
                      });
                      const completed = subs.filter(s => (map[s] || 0) >= 100);
                      let newStatus: any = 'not_started';
                      const totalPoints = subs.reduce((sum, s) => sum + (map[s] || 0), 0);
                      if (subs.length > 0 && totalPoints >= subs.length * 100) newStatus = 'completed';
                      else if (totalPoints > 0) newStatus = 'in_progress';
                      return {
                        ...t,
                        subtopicProgress: map,
                        completedSubtopics: completed,
                        status: newStatus,
                      };
                    }

                    return {
                      ...t,
                      status: 'not_started' as const,
                      subtopicProgress: {},
                      completedSubtopics: [],
                    };
                  });

                  setSyllabusTopics(updated);
                  saveStoredSyllabusTopics(updated);

                  if (getAuthToken()) {
                    api.saveCompletedTopicsPicker(updated).catch(() => {});
                  }
                }}
                onAddCustomTopic={(customTopic) => {
                  const newTopic: SyllabusTopic = {
                    ...customTopic,
                    id: `custom-${Date.now()}`,
                    status: 'not_started',
                  };
                  const updated = [...syllabusTopics, newTopic];
                  setSyllabusTopics(updated);
                  saveStoredSyllabusTopics(updated);
                }}
              />
            )
          )}

          {/* Timetable & Study Planner */}
          {currentScreen === 'planner' && (
            <StudyPlanner
              userSettings={userSettings}
              timetable={timetable}
              syllabusTopics={syllabusTopics}
              tasks={tasks}
              dailyTasks={tasks}
              onSaveTimetable={(newSlots) => {
                if (!user) {
                  setAuthModalMode('signup');
                  return;
                }
                setTimetable(newSlots);
                saveStoredTimetable(newSlots);
                syncTimetableToCloud(newSlots);
              }}
              onAddEntry={(entry) => {
                if (!user) {
                  setAuthModalMode('signup');
                  return;
                }
                const newEntries = [...timetable, { ...entry, id: `tt-${Date.now()}` }];
                setTimetable(newEntries);
                saveStoredTimetable(newEntries);
                syncTimetableToCloud(newEntries);
              }}
              onUpdateEntry={(entry) => {
                if (!user) {
                  setAuthModalMode('signup');
                  return;
                }
                const updated = timetable.map((e) => (e.id === entry.id ? entry : e));
                setTimetable(updated);
                saveStoredTimetable(updated);
                syncTimetableToCloud(updated);
              }}
              onDeleteEntry={(id) => {
                const updated = timetable.filter((e) => e.id !== id);
                setTimetable(updated);
                saveStoredTimetable(updated);
                syncTimetableToCloud(updated);
              }}
              onResetTimetable={() => {
                const reset = getInitialTimetableForStream(userSettings.stream, userSettings.physicalScienceElective);
                setTimetable(reset);
                saveStoredTimetable(reset);
                syncTimetableToCloud(reset);
              }}
              onSyncFromTimetable={(dateStr) => {
                const dayOfWeek = getDayOfWeekFromDate(dateStr);
                const dayEntries = timetable.filter((e) => e.dayOfWeek === dayOfWeek);
                if (dayEntries.length === 0) return;

                const existingTaskTimetableIds = new Set(
                  tasks.filter((t) => t.date === dateStr && t.fromTimetableId).map((t) => t.fromTimetableId)
                );

                const newDailyTasks: DailyTask[] = [];
                dayEntries.forEach((entry) => {
                  if (!existingTaskTimetableIds.has(entry.id)) {
                    newDailyTasks.push({
                      id: `task-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                      date: dateStr,
                      title: entry.topic,
                      subject: entry.subject,
                      blockType: entry.blockType || 'study',
                      topicId: entry.topicId,
                      subtopic: entry.subtopic,
                      targetProgress: entry.targetProgress,
                      subtopicTargets: entry.subtopicTargets,
                      isCompleted: false,
                      timeSlot: `${entry.startTime} - ${entry.endTime}`,
                      startTime: entry.startTime,
                      endTime: entry.endTime,
                      estimatedMinutes: calculateMinutesBetween(entry.startTime, entry.endTime) || 60,
                      priority: 'Medium',
                      fromTimetableId: entry.id,
                    });
                  }
                });

                if (newDailyTasks.length > 0) {
                  const updatedTasks = [...tasks, ...newDailyTasks];
                  setTasks(updatedTasks);
                  saveStoredDailyTasks(updatedTasks);
                }
              }}
              onAddTask={(task) => {
                if (!user) {
                  setAuthModalMode('signup');
                  return;
                }
                const newTasks = [...tasks, { ...task, id: `t-${Date.now()}` }];
                setTasks(newTasks);
                saveStoredDailyTasks(newTasks);
              }}
              onDeleteTask={(taskId) => {
                const newTasks = tasks.filter(t => t.id !== taskId);
                setTasks(newTasks);
                saveStoredDailyTasks(newTasks);
              }}
              onToggleTask={(taskId) => {
                const newTasks = tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t);
                setTasks(newTasks);
                saveStoredDailyTasks(newTasks);
                const isDone = newTasks.find(t => t.id === taskId)?.isCompleted ?? false;
                const refreshed = recordTaskCompletionAndRefreshStreak(newTasks, isDone);
                setStreakDays(refreshed.currentStreak);
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
              onSaveMistake={(m) => {
                const updated = [m, ...mistakes.filter((x) => x.id !== m.id)];
                setMistakes(updated);
                saveStoredMistakes(updated);
              }}
              quizQuestions={quizQuestions}
            />
          )}

          {/* Mistake Notebook */}
          {currentScreen === 'mistakes' && (
            <MistakeNotebookScreen
              mistakes={mistakes}
              onNavigate={setCurrentScreen}
              onToggleMastered={(id) => {
                const updated = mistakes.map((m) =>
                  m.id === id ? { ...m, isMastered: !m.isMastered, reviewStatus: m.isMastered ? 'Needs Review' : 'Mastered' } : m
                );
                setMistakes(updated);
                saveStoredMistakes(updated);
              }}
              onDeleteMistake={(id) => {
                const updated = mistakes.filter((m) => m.id !== id);
                setMistakes(updated);
                saveStoredMistakes(updated);
              }}
              onStartReviewSession={() => setCurrentScreen('quiz')}
            />
          )}

          {/* Past Papers */}
          {currentScreen === 'pastpapers' && (
            <PastPaperLibraryScreen
              onNavigate={setCurrentScreen}
              pastPapers={pastPapers}
            />
          )}

          {/* Leaderboard */}
          {currentScreen === 'leaderboard' && (
            <Leaderboard
              currentUserId={user?.id || user?._id || userProfile.email || 'current-user'}
              currentUserProfile={userProfile}
              syllabusTopics={syllabusTopics}
              timetable={timetable}
              dailyTasks={tasks}
              streakDays={streakDays}
              stream={user?.stream || userSettings.stream}
              physicalScienceElective={user?.physicalScienceElective || userSettings.physicalScienceElective}
              onNavigate={setCurrentScreen}
            />
          )}

          {/* Analytics Progress */}
          {currentScreen === 'progress' && (
            <ProgressAnalytics
              currentUserId={user?.id || user?._id || userProfile.email || 'current-user'}
              currentUserProfile={userProfile}
              userProfile={userProfile}
              streakDays={streakDays}
              userSettings={userSettings}
              stream={user?.stream || userSettings.stream}
              physicalScienceElective={user?.physicalScienceElective || userSettings.physicalScienceElective || 'Chemistry'}
              syllabusTopics={syllabusTopics}
              timetable={timetable}
              dailyTasks={tasks}
            />
          )}

          {/* Settings / Profile */}
          {currentScreen === 'settings' && (
            <SettingsScreen
              settings={userSettings}
              userSettings={userSettings}
              currentUser={user}
              userProfile={userProfile}
              userRole={user?.role || 'student'}
              onSaveSettings={(s) => {
                setUserSettingsState(s);
                saveUserSettings(s);
              }}
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
                  mobileNumber: updated.mobileNumber,
                  motivationNote: updated.motivationNote,
                  dailyHoursGoal: updated.dailyHoursGoal,
                  weeklyHoursGoal: updated.weeklyHoursGoal,
                }));
              }}
              onSignOut={handleSignOut}
              onOpenAuthModal={(mode) => setAuthModalMode(mode)}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={async () => {
                await requestPermission();
              }}
              onSendTestNotification={() => {
                sendNotification(
                  'Mind Maze Study Reminder',
                  'This is a test notification! Your study reminders are working perfectly.',
                  'test-notification'
                );
              }}
              onNavigate={setCurrentScreen}
              onOpenProfileEdit={() => setIsProfileEditOpen(true)}
            />
          )}

          {/* Notifications Center */}
          {currentScreen === 'notifications' && (
            <NotificationsScreen
              settings={userSettings}
              userSettings={userSettings}
              userProfile={userProfile}
              onUpdateSettings={(newS) => {
                const merged = { ...userSettings, ...newS };
                setUserSettingsState(merged);
                saveUserSettings(merged);
              }}
              onNavigate={setCurrentScreen}
              timetableEntries={timetable}
              syllabusTopics={syllabusTopics}
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
                  pastPapers={pastPapers}
                  onAddPastPaper={handleAddPastPaper}
                  onDeletePastPaper={handleDeletePastPaper}
                  quizQuestions={quizQuestions}
                  onAddQuizQuestion={handleAddQuizQuestion}
                  onDeleteQuizQuestion={handleDeleteQuizQuestion}
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

            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0 flex items-center justify-center bg-transparent">
                <img src="/logo.png" alt="Mind Maze Logo" className="w-10 h-10 object-contain bg-transparent drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
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
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Kasun Perera"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WhatsApp Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  autoComplete="username email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password <span className="text-rose-400">*</span></label>
                <input
                  type="password"
                  autoComplete={authModalMode === 'signin' ? 'current-password' : 'new-password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                  required
                />
              </div>

              {authModalMode === 'signup' && (
                <div className={streamInput === 'Physical Science' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">A/L Stream <span className="text-rose-400">*</span></label>
                    <select
                      value={streamInput}
                      onChange={(e) => setStreamInput(e.target.value as StreamType)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none cursor-pointer"
                    >
                      <option value="Physical Science">Physical Science</option>
                      <option value="Biological Science">Biological Science</option>
                    </select>
                  </div>

                  {streamInput === 'Physical Science' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Elective Subject</label>
                      <select
                        value={electiveInput}
                        onChange={(e) => setElectiveInput(e.target.value as 'Chemistry' | 'ICT')}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none cursor-pointer"
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
