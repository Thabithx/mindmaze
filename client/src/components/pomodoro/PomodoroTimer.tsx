import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, CheckCircle2 } from 'lucide-react';

interface PomodoroTimerProps {
  onSessionComplete?: (type: 'work' | 'break', minutes: number) => void;
}

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const MODE_CONFIGS: Record<TimerMode, { label: string; minutes: number; color: string; badge: string }> = {
  work: { label: 'Focus Study', minutes: 25, color: 'from-indigo-600 to-purple-600', badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  shortBreak: { label: 'Short Break', minutes: 5, color: 'from-emerald-600 to-teal-600', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  longBreak: { label: 'Long Break', minutes: 15, color: 'from-blue-600 to-cyan-600', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onSessionComplete }) => {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_CONFIGS.work.minutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  const totalTime = MODE_CONFIGS[mode].minutes * 60;
  const progressPercent = Math.max(0, Math.min(100, ((totalTime - timeLeft) / totalTime) * 100));

  // Synthesize soft audio chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
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
      console.warn('Audio chime fallback:', e);
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

        // Auto switch to short break or long break every 4 sessions
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

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODE_CONFIGS[mode].minutes * 60);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl transition-all">
      {/* Background Gradient Glow */}
      <div className={`absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${MODE_CONFIGS[mode].color} opacity-20 blur-3xl pointer-events-none`} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Pomodoro Study Timer</h3>
            <p className="text-xs text-slate-400">Boost focus with timed intervals</p>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      {/* Mode Selectors */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all ${
              mode === m ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {MODE_CONFIGS[m].label}
          </button>
        ))}
      </div>

      {/* Circular Timer Display */}
      <div className="relative flex flex-col items-center justify-center my-4">
        <div className="relative flex items-center justify-center w-48 h-48 rounded-full border-4 border-slate-800 bg-slate-950/60 shadow-inner">
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
            <span className="font-mono text-4xl font-extrabold text-white tracking-wider drop-shadow">
              {formatTime(timeLeft)}
            </span>
            <span className={`block mt-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${MODE_CONFIGS[mode].badge}`}>
              {MODE_CONFIGS[mode].label}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={resetTimer}
          className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-md active:scale-95"
          title="Reset Timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 bg-gradient-to-r ${MODE_CONFIGS[mode].color} hover:brightness-110`}
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

      {/* Completed Sessions Tracker */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed Sessions
        </span>
        <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
          {completedSessions} / 4
        </span>
      </div>
    </div>
  );
};
