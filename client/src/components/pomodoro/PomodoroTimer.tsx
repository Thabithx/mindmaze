import React, { useState, useEffect } from 'react';
import { SyllabusTopic } from '../../types';
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
} from 'lucide-react';

export interface PomodoroTimerProps {
  activeUnitTitle?: string;
  activeSubject?: string;
  subtopics?: string[];
  completedSubtopics?: string[];
  availableTopics?: SyllabusTopic[];
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

  useEffect(() => {
    if (activeSubject) {
      setSelectedSubject(activeSubject);
    }
  }, [activeSubject]);

  const availableSubjects = Array.from(new Set(availableTopics.map((t) => t.subject))).filter(Boolean);
  const filteredTopics = selectedSubject
    ? availableTopics.filter((t) => t.subject === selectedSubject)
    : availableTopics;

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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      playChime();
      setIsRunning(false);

      if (mode === 'work') {
        const newCount = completedSessions + 1;
        setCompletedSessions(newCount);
        if (onSessionComplete) onSessionComplete('work', MODE_CONFIGS.work.minutes);

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

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode]);

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(MODE_CONFIGS[newMode].minutes * 60);
  };

  // Lo-Fi Study Music Player
  const LOFI_TRACKS = [
    {
      id: 'lofi-1',
      title: '1 A.M. Study Session (Chill Lo-Fi Beats)',
      src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    },
    {
      id: 'lofi-2',
      title: 'Midnight Rain & Soft Beats',
      src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lofi-chill-medium-version-159456.mp3',
    },
    {
      id: 'lofi-3',
      title: 'Warm Study Glow (Ambient Piano)',
      src: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=lofi-orchestral-125032.mp3',
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

  const toggleTimer = () => {
    if (!isRunning && mode === 'work' && onStartSession) {
      onStartSession();
    }
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Minimized Compact Bar View
  if (isMinimized) {
    return (
      <div className={`glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xl border border-white/15 transition-all select-none ${className}`}>
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
          {onMarkFinished && (
            <button
              onClick={onMarkFinished}
              className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold transition cursor-pointer"
              title="Mark Unit as Finished"
            >
              <CheckCircle2 className="w-4 h-4" />
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
    <div className={`glass-card relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/15 transition-all select-none ${className}`}>
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
        <div className="mb-4 p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm overflow-hidden">
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
            {availableTopics && availableTopics.length > 0 && onSelectTopic && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none cursor-pointer max-w-[110px] truncate"
                >
                  <option value="">All</option>
                  {availableSubjects.map((s) => (
                    <option key={s} value={s} className="bg-[#161831] text-white">{s}</option>
                  ))}
                </select>

                <select
                  onChange={(e) => {
                    const found = availableTopics.find((t) => t.id === e.target.value || t.topicTitle === e.target.value);
                    if (found) onSelectTopic(found);
                  }}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-indigo-200 focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[170px] truncate"
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

            {onMarkFinished && (
              <button
                onClick={onMarkFinished}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold transition shrink-0 cursor-pointer shadow hover:scale-105 active:scale-95"
                title="Mark this unit/task as finished"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Finished</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        availableTopics && availableTopics.length > 0 && onSelectTopic && (
          <div className="mb-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-white font-bold">Select Study Topic</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">1. Choose Subject → 2. Choose Unit</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Step 1: Subject Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  1. Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-[#161831] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 cursor-pointer"
                >
                  <option value="">All Subjects</option>
                  {availableSubjects.map((subj) => (
                    <option key={subj} value={subj} className="bg-[#161831] text-white">
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Syllabus Unit Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  2. Syllabus Unit ({filteredTopics.length})
                </label>
                <select
                  onChange={(e) => {
                    const found = availableTopics.find((t) => t.id === e.target.value || t.topicTitle === e.target.value);
                    if (found) {
                      setSelectedSubject(found.subject);
                      onSelectTopic(found);
                    }
                  }}
                  className="w-full bg-[#161831] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 cursor-pointer truncate"
                  defaultValue=""
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
      <div className="flex items-center justify-center gap-3 mt-5">
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
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 cursor-pointer min-h-[44px] bg-gradient-to-r ${MODE_CONFIGS[mode].color} hover:brightness-110`}
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

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={LOFI_TRACKS[selectedTrackIndex].src}
        loop
        preload="auto"
      />

      {/* Lo-Fi Music Control Bar */}
      <div className="mt-4 p-3 rounded-2xl bg-black/30 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`p-2 rounded-xl border transition cursor-pointer shrink-0 ${
              !isAudioMuted && isRunning
                ? 'bg-purple-500/20 text-purple-300 border-purple-400/40 animate-pulse'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title={isAudioMuted ? 'Unmute Lo-Fi Beats' : 'Mute Lo-Fi Beats'}
          >
            {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <select
            value={selectedTrackIndex}
            onChange={(e) => setSelectedTrackIndex(Number(e.target.value))}
            className="flex-1 sm:flex-none bg-[#1a1c38] text-slate-200 border border-white/15 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none focus:border-purple-400"
          >
            {LOFI_TRACKS.map((t, i) => (
              <option key={t.id} value={i} className="bg-[#161831] text-white">
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[10px] text-slate-400 font-semibold">Volume</span>
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
            className="w-20 sm:w-24 accent-[#6B4EFF] cursor-pointer"
          />
        </div>
      </div>

      {/* Completed Sessions & Finish Early */}
      <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Focus Sessions
        </span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
            {completedSessions} / 4
          </span>
          {onMarkFinished && (
            <button
              onClick={onMarkFinished}
              className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
            >
              Done Unit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
