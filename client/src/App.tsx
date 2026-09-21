import { useState, useEffect, useCallback } from 'react';
import { ScreenId, StreamType, UserSettings, SyllabusTopic, TimetableEntry, DailyTask, MistakeItem, UserProfile } from './types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from './services/api';
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
  getDayOfWeekFromDate,
  calculateMinutesBetween,
} from './lib/storage';
import { getInitialTimetableForStream, INITIAL_SYLLABUS_TOPICS } from './data/alSyllabusData';
import { MOCK_QUESTIONS } from './data/mockData';

// Layout & Common Components
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomBar } from './components/MobileBottomBar';
import { MazeBackground } from './components/MazeBackground';
import { CelebrationModal, Celebration } from './components/common/CelebrationModal';
import { WhatsAppCommunityBanner } from './components/common/WhatsAppCommunityBanner';

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
        whatsappNumber: whatsappInput,
        stream: streamInput,
        physicalScienceElective: streamInput === 'Physical Science' ? electiveInput : undefined,
      } as any);
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

  // Active timetable session detection
  const [activePomodoroTopic, setActivePomodoroTopic] = useState<{ title: string; subject: string; id?: string } | null>(null);
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

      if (currentBlock && (!activePomodoroTopic || activePomodoroTopic.id !== currentBlock.id)) {
        setActivePomodoroTopic({
          title: currentBlock.topic,
          subject: currentBlock.subject,
          id: currentBlock.id,
        });

        // Automatically redirect to home page timer when scheduled time arrives
        setCurrentScreen('dashboard');
        setIsPomodoroMinimized(false);

        if (!hasPromptedActiveBlock && typeof Notification !== 'undefined') {
          if (Notification.permission === 'granted') {
            try {
              new Notification(`Study Session Starting!`, {
                body: `Your scheduled study block "${currentBlock.topic}" (${currentBlock.subject}) has started!`,
                icon: '/icon-192.png',
              });
            } catch {}
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
          setHasPromptedActiveBlock(true);
        }
      }
    };

    checkActiveBlock();
    const interval = setInterval(checkActiveBlock, 30000);
    return () => clearInterval(interval);
  }, [timetable, activePomodoroTopic, hasPromptedActiveBlock]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Connecting to Mind Maze Server...</p>
      </div>
    );
  }

  // Find matching syllabus topic and subtopics for active timer
  const activeSyllabusTopic = activePomodoroTopic
    ? syllabusTopics.find(
        (t) =>
          t.id === activePomodoroTopic.id ||
          t.topicTitle.toLowerCase() === activePomodoroTopic.title.toLowerCase() ||
          (activePomodoroTopic.subject && t.subject.toLowerCase() === activePomodoroTopic.subject.toLowerCase() && t.topicTitle.toLowerCase().includes(activePomodoroTopic.title.toLowerCase()))
      )
    : null;
  const activeSubtopics = activeSyllabusTopic?.subtopics || [];
  const activeCompletedSubtopics = activeSyllabusTopic?.completedSubtopics || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Background Animated Maze Grid */}
      <MazeBackground />

      {/* WhatsApp Community Banner */}
      <WhatsAppCommunityBanner />

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
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Home / Dashboard Screen */}
          {currentScreen === 'dashboard' && (
            <div className="space-y-6">
              {/* Active Timetable Prompt Banner if block is happening now */}
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
                      onClick={() => setIsPomodoroMinimized(false)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      Focus With Pomodoro
                    </button>
                  </div>
                </div>
              )}

              {/* Dashboard with embedded PomodoroTimer slot right after Welcome Banner */}
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
                    onSelectTopic={(topic) => {
                      setActivePomodoroTopic({
                        title: topic.topicTitle,
                        subject: topic.subject,
                        id: topic.id,
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
                      const currentTopic = activeSyllabusTopic || (activePomodoroTopic?.title ? syllabusTopics.find(t => t.topicTitle.toLowerCase() === activePomodoroTopic.title.toLowerCase()) : null);
                      if (currentTopic) {
                        const subs = currentTopic.subtopics || [];
                        const newMap: Record<string, number> = {};
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

                        // Also mark matching daily task completed
                        const updatedTasks = tasks.map((tk) => {
                          if (tk.topicId === currentTopic.id || (tk.title && tk.title.toLowerCase().includes(currentTopic.topicTitle.toLowerCase()))) {
                            return { ...tk, isCompleted: true };
                          }
                          return tk;
                        });
                        setTasks(updatedTasks);
                        saveStoredDailyTasks(updatedTasks);

                        setCelebration({
                          title: 'Unit Completed!',
                          message: `Awesome job! You finished "${currentTopic.topicTitle}". Keep up the great streak!`,
                        });
                        setActivePomodoroTopic(null);
                      }
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
                setTimetable(newSlots);
                saveStoredTimetable(newSlots);
              }}
              onAddEntry={(entry) => {
                const newEntries = [...timetable, { ...entry, id: `tt-${Date.now()}` }];
                setTimetable(newEntries);
                saveStoredTimetable(newEntries);
              }}
              onUpdateEntry={(entry) => {
                const updated = timetable.map((e) => (e.id === entry.id ? entry : e));
                setTimetable(updated);
                saveStoredTimetable(updated);
              }}
              onDeleteEntry={(id) => {
                const updated = timetable.filter((e) => e.id !== id);
                setTimetable(updated);
                saveStoredTimetable(updated);
              }}
              onResetTimetable={() => {
                const reset = getInitialTimetableForStream(userSettings.stream, userSettings.physicalScienceElective);
                setTimetable(reset);
                saveStoredTimetable(reset);
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
              dailyTasks={tasks}
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

          {/* Notifications Center */}
          {currentScreen === 'notifications' && (
            <NotificationsScreen
              settings={userSettings}
              userSettings={userSettings}
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
