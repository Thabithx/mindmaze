import React, { useState, useEffect } from 'react';
import { SyllabusTopic, StreamType } from '../../types';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Minimize2,
  Maximize2,
  BookOpen,
  Clock,
  Flame,
  ChevronDown,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';

export interface PomodoroTimerProps {
  activeUnitTitle?: string;
  activeSubject?: string;
  subtopics?: string[];
  completedSubtopics?: string[];
  availableTopics?: SyllabusTopic[];
  userStream?: StreamType | string;
  physicalScienceElective?: 'Chemistry' | 'ICT' | string;
  onSelectTopic?: (topic: SyllabusTopic) => void;
  onToggleSubtopic?: (subtopic: string) => void;
  onSessionComplete?: (type: 'work' | 'break', minutes: number) => void;
  onMarkFinished?: () => void;
  onStartSession?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const MODE_CONFIGS: Record<TimerMode, { label: string; minutes: number; color: string; badge: string }> = {
  work: { label: 'Focus Study', minutes: 25, color: 'from-indigo-600 to-purple-600', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  shortBreak: { label: 'Short Break', minutes: 5, color: 'from-emerald-600 to-teal-600', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  longBreak: { label: 'Long Break', minutes: 15, color: 'from-blue-600 to-cyan-600', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  activeUnitTitle,
  activeSubject,
  subtopics = [],
  completedSubtopics = [],
  availableTopics = [],
  userStream = 'Physical Science',
  physicalScienceElective = 'Chemistry',
  onSelectTopic,
  onToggleSubtopic,
  onSessionComplete,
  onMarkFinished,
  onStartSession,
  isMinimized = false,
  onToggleMinimize,
  className = '',
}) => {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_CONFIGS.work.minutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  const [selectedSubject, setSelectedSubject] = useState<string>(() => activeSubject || '');
  // Track whether timer has been started at least once (controls Mark Finished visibility)
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  // Track the unit selected inside the timer (when no activeUnitTitle from timetable)
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  // Filter topics strictly according to user's stream and elective subject
  const allowedSubjectMetas = getSubjectsForStream(
    userStream,
    physicalScienceElective
  );
  const allowedSubjectNames = allowedSubjectMetas.map((s) => s.name);

  const userAllowedTopics = (availableTopics || []).filter((t) =>
    allowedSubjectNames.includes(t.subject)
  );

  const availableSubjects = allowedSubjectNames.filter((name) =>
    userAllowedTopics.some((t) => t.subject === name)
  );

  useEffect(() => {
    if (activeSubject) {
      setSelectedSubject(activeSubject);
    } else if (availableSubjects.length > 0 && !allowedSubjectNames.includes(selectedSubject)) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [activeSubject, userStream, physicalScienceElective]);

  const filteredTopics = selectedSubject
    ? userAllowedTopics.filter((t) => t.subject === selectedSubject)
    : userAllowedTopics;

  const totalTime = MODE_CONFIGS[mode].minutes * 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalTime - timeLeft) / totalTime) * 100));

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio chime:', e);
    }
  };

  const workSecondsRef = React.useRef<number>(0);
  const lastTickRef = React.useRef<number>(Date.now());

  // High-precision, zero-drift timer loop using timestamp deltas
  useEffect(() => {
    if (!isRunning) {
      // If student paused after studying >= 30 seconds that haven't been credited yet,
      // credit 1 full minute to their permanent record
      if (mode === 'work' && workSecondsRef.current >= 30) {
        workSecondsRef.current = 0;
        if (onSessionComplete) onSessionComplete('work', 1);
      }
      return;
    }

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = Math.floor((now - lastTickRef.current) / 1000);
      if (elapsedSec >= 1) {
        lastTickRef.current += elapsedSec * 1000;
        setTimeLeft((prev) => Math.max(0, prev - elapsedSec));

        if (mode === 'work') {
          workSecondsRef.current += elapsedSec;
          while (workSecondsRef.current >= 60) {
            workSecondsRef.current -= 60;
            if (onSessionComplete) onSessionComplete('work', 1);
          }
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [isRunning, mode]);

  // Handle completion when timeLeft reaches 0
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      playChime();
      setIsRunning(false);

      if (mode === 'work') {
        const newCount = completedSessions + 1;
        setCompletedSessions(newCount);
        if (workSecondsRef.current >= 20) {
          workSecondsRef.current = 0;
          if (onSessionComplete) onSessionComplete('work', 1);
        } else {
          workSecondsRef.current = 0;
        }

        if (newCount % 4 === 0) {
          switchMode('longBreak');
        } else {
          switchMode('shortBreak');
        }
      } else {
        if (onSessionComplete) onSessionComplete('break', MODE_CONFIGS[mode].minutes);
        switchMode('work');
      }
    }
  }, [timeLeft, isRunning, mode, completedSessions]);

  const switchMode = (newMode: TimerMode) => {
    // Credit any pending study time before switching modes
    if (mode === 'work' && workSecondsRef.current >= 30) {
      workSecondsRef.current = 0;
      if (onSessionComplete) onSessionComplete('work', 1);
    }
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(MODE_CONFIGS[newMode].minutes * 60);
  };

  // Curated soothing Lo-Fi & Study Music tracks (100% verified streams, no emojis in names)
  const LOFI_TRACKS = [
    {
      id: 'lofi-1',
      title: 'Sound 1',
      src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    },
    {
      id: 'lofi-2',
      title: 'Sound 2',
      src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lofi-chill-medium-version-159456.mp3',
    },
    {
      id: 'lofi-3',
      title: 'Sound 3',
      src: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=lofi-orchestral-125032.mp3',
    },
    {
      id: 'lofi-4',
      title: 'Sound 4',
      src: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=chill-abstract-intention-12099.mp3',
    },
    {
      id: 'lofi-5',
      title: 'Sound 5',
      src: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3?filename=soft-rain-ambient-111154.mp3',
    },
  ];

  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.45);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isAudioMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isAudioMuted]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isRunning && !isAudioMuted && mode === 'work') {
      audioRef.current.play().catch((err) => {
        console.warn('Lo-Fi audio auto-play:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isRunning, isAudioMuted, mode, selectedTrackIndex]);

  // A unit is considered "selected" if either the timetable auto-set one, or user picked one in the dropdown
  const hasUnitSelected = !!(activeUnitTitle || selectedUnitId);

  const toggleTimer = () => {
    // If no unit is currently chosen, auto-select the first unit in the stream
    if (!isRunning && !hasUnitSelected) {
      if (filteredTopics.length > 0) {
        const first = filteredTopics[0];
        setSelectedUnitId(first.id);
        if (onSelectTopic) onSelectTopic(first);
      }
    }
    if (!isRunning && mode === 'work' && onStartSession) {
      onStartSession();
    }
    if (!isRunning) setHasStarted(true);
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTimeLeft(MODE_CONFIGS[mode].minutes * 60);
  };

  // Called when user marks a unit finished — fully resets timer back to initial state
  const handleMarkFinished = () => {
    // Stop and reset audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Reset all internal state
    setIsRunning(false);
    setMode('work');
    setTimeLeft(MODE_CONFIGS.work.minutes * 60);
    setCompletedSessions(0);
    setHasStarted(false);
    setSelectedUnitId('');
    setSelectedSubject(activeSubject || '');
    // Then call the parent callback
    if (onMarkFinished) onMarkFinished();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Minimized Compact Bar View
  if (isMinimized) {
    return (
      <div id="pomodoro-timer-container" className={`glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xl border border-white/15 transition-all select-none ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-mono text-base font-black text-white block leading-none">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {activeUnitTitle || MODE_CONFIGS[mode].label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onMarkFinished && hasStarted && (
            <button
              onClick={handleMarkFinished}
              className="px-3 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border-2 border-emerald-400 text-emerald-200 text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5"
              title="Mark Unit as Finished"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mark Done</span>
            </button>
          )}

          <button
            onClick={toggleTimer}
            className={`p-2 rounded-xl text-white font-bold text-xs transition shadow cursor-pointer ${
              isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
            title={isRunning ? 'Pause' : 'Start'}
          >
            {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
              title="Expand Pomodoro Timer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full Expanded View
  return (
    <div id="pomodoro-timer-container" className={`glass-card relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/15 transition-all select-none scroll-mt-24 ${className}`}>
      {/* Background Gradient Glow */}
      <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${MODE_CONFIGS[mode].color} opacity-25 blur-3xl pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base truncate">Pomodoro Study Timer</h3>
            <p className="text-xs text-slate-400 truncate">Boost focus with timed intervals</p>
          </div>
        </div>

        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Minimize Timer to Dashboard"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {activeUnitTitle ? (
        <div className="mb-4 p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block tracking-wider truncate">
                Current Task {activeSubject ? `• ${activeSubject}` : ''}
              </span>
              <strong className="text-white font-bold block truncate text-xs sm:text-sm max-w-full" title={activeUnitTitle}>
                {activeUnitTitle}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap max-w-full">
            {userAllowedTopics.length > 0 && onSelectTopic && (
              <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none cursor-pointer max-w-[100px] truncate"
                >
                  <option value="">All</option>
                  {availableSubjects.map((s) => (
                    <option key={s} value={s} className="bg-[#161831] text-white">{s}</option>
                  ))}
                </select>

                <select
                  onChange={(e) => {
                    const found = userAllowedTopics.find((t) => t.id === e.target.value || t.topicTitle === e.target.value);
                    if (found) onSelectTopic(found);
                  }}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-indigo-200 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
                  defaultValue=""
                >
                  <option value="" disabled>Switch Unit...</option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#161831] text-white">
                      Unit {t.unitNumber} - {t.topicTitle}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onMarkFinished && hasStarted && (
              <button
                onClick={handleMarkFinished}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border-2 border-emerald-400 text-emerald-200 text-xs sm:text-sm font-black transition shrink-0 cursor-pointer shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 min-h-[44px]"
                title="Mark this unit/task as finished"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mark Finished</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        userAllowedTopics.length > 0 && onSelectTopic && (
          <div className={`mb-4 p-3.5 rounded-2xl border space-y-2.5 text-xs ${!hasUnitSelected ? 'bg-amber-500/10 border-amber-400/40' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-white font-bold">Select Study Topic</span>
                {!hasUnitSelected && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/40 px-1.5 py-0.5 rounded-full">
                    Required
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Subject → Unit</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Step 1: Subject Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  1. Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => { setSelectedSubject(e.target.value); setSelectedUnitId(''); }}
                  className="w-full bg-[#161831] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value="">All ({userStream})</option>
                  {availableSubjects.map((subj) => (
                    <option key={subj} value={subj} className="bg-[#161831] text-white">
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Syllabus Unit Dropdown */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${!selectedUnitId ? 'text-amber-300' : 'text-slate-300'}`}>
                  2. Syllabus Unit ({filteredTopics.length})
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedUnitId(id);
                    const found = userAllowedTopics.find((t) => t.id === id);
                    if (found) {
                      setSelectedSubject(found.subject);
                      onSelectTopic(found);
                    }
                  }}
                  className={`w-full bg-[#161831] border rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer truncate ${!selectedUnitId ? 'border-amber-400/50 focus:border-amber-400' : 'border-white/15 focus:border-indigo-400'}`}
                >
                  <option value="" disabled>Choose Syllabus Unit...</option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#161831] text-white">
                      Unit {t.unitNumber}: {t.topicTitle} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )
      )}

      {subtopics && subtopics.length > 0 && (
        <div className="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Target Subtopics ({subtopics.filter((s) => completedSubtopics?.includes(s)).length}/{subtopics.length} Done)
              </span>
            </span>
            <span className="text-[10px] text-cyan-300">Tick as you finish</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {subtopics.map((st) => {
              const isDone = completedSubtopics?.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onToggleSubtopic && onToggleSubtopic(st)}
                  className={`p-2 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                    isDone
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-400/40 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDone ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="truncate">{st}</span>
                  </div>
                  {isDone && <span className="text-[10px] font-bold text-emerald-400 shrink-0">Done</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode Selectors */}
      <div className="flex items-center gap-1.5 mb-5 p-1 bg-black/40 rounded-xl border border-white/10">
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === m ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {MODE_CONFIGS[m].label}
          </button>
        ))}
      </div>

      {/* Circular Timer Display */}
      <div className="relative flex flex-col items-center justify-center my-3">
        <div className="relative flex items-center justify-center w-44 h-44 sm:w-48 sm:h-48 rounded-full border-4 border-white/10 bg-slate-950/60 shadow-inner">
          {/* Progress Ring Overlay */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-indigo-500 transition-all duration-1000"
              strokeWidth="6"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="text-center z-10">
            <span className="font-mono text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow">
              {formatTime(timeLeft)}
            </span>
            <span className={`block mt-2 text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${MODE_CONFIGS[mode].badge}`}>
              {MODE_CONFIGS[mode].label}
            </span>
          </div>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex flex-col items-center gap-2 mt-5">
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            onClick={resetTimer}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`p-3 rounded-xl border transition cursor-pointer active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center ${
              !isAudioMuted
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'
            }`}
            title={isAudioMuted ? 'Unmute Focus Music' : 'Mute Focus Music'}
          >
            {!isAudioMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleTimer}
            title={isRunning ? 'Pause Timer' : 'Start Focus Session'}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform min-h-[44px] bg-gradient-to-r ${MODE_CONFIGS[mode].color} hover:brightness-110 active:scale-95 cursor-pointer`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" /> Start Focus
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={LOFI_TRACKS[selectedTrackIndex].src}
        loop
        preload="auto"
      />

      {/* Lo-Fi Music Control Bar (Mobile responsive, zero horizontal overflow) */}
      <div className="mt-5 p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs w-full max-w-full overflow-hidden box-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${!isAudioMuted && isRunning ? 'bg-purple-500/20 text-purple-300 animate-pulse' : 'bg-white/5 text-slate-400'}`}>
              <Music className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-300 truncate">Lo-Fi Study Music</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-1.5 rounded-lg border transition cursor-pointer shrink-0 ${
                !isAudioMuted
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                  : 'bg-white/5 text-slate-500 border-white/10'
              }`}
              title={isAudioMuted ? 'Unmute' : 'Mute'}
            >
              {!isAudioMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isAudioMuted ? 0 : audioVolume}
                onChange={(e) => {
                  setAudioVolume(Number(e.target.value));
                  if (isAudioMuted) setIsAudioMuted(false);
                }}
                className="w-16 sm:w-20 accent-[#6B4EFF] cursor-pointer"
                title="Volume"
              />
              <span className="text-[10px] text-slate-400 font-mono w-6 text-right">
                {isAudioMuted ? '0%' : `${Math.round(audioVolume * 100)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Dropdown with strict width constraints */}
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <select
            value={selectedTrackIndex}
            onChange={(e) => setSelectedTrackIndex(Number(e.target.value))}
            className="w-full min-w-0 max-w-full block truncate bg-[#161831] text-slate-200 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-purple-400 cursor-pointer"
            style={{ colorScheme: 'dark' }}
          >
            {LOFI_TRACKS.map((t, i) => (
              <option key={t.id} value={i} className="bg-[#161831] text-white">
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Focus Sessions
          <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/10 ml-1">{completedSessions} / 4</span>
        </span>
        {onMarkFinished && hasStarted && (
          <button
            onClick={handleMarkFinished}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border-2 border-emerald-400 text-sm font-black text-emerald-200 hover:text-white transition cursor-pointer hover:scale-105 active:scale-95 shadow-md shadow-emerald-900/30 min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mark Finished</span>
          </button>
        )}
      </div>
    </div>
  );
};
