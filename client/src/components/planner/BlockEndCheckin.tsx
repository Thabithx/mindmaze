import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock, Plus, ArrowRightLeft, AlarmClockOff, X } from 'lucide-react';
import { DailyTask } from '../../types';
import {
  calculateMinutesBetween,
  computeEndTime,
  formatTime12h,
  timeToMinutes,
} from '../../lib/storage';

interface BlockEndCheckinProps {
  task: DailyTask;
  /** All tasks on the same date (for shift-impact previews). */
  dayTasks: DailyTask[];
  onComplete: () => void;
  onExtend: (minutes: number) => void;
  onMove: (newStart: string) => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

const EXTEND_OPTIONS = [15, 30, 45, 60];

/**
 * End-of-block check-in: fired when a block's end time passes while it is
 * still incomplete. The student picks Completed / Need more time / Move to
 * another time. Extra minutes from an extension count toward Time Progress
 * because the extend handler grows the task's estimatedMinutes.
 */
export const BlockEndCheckin: React.FC<BlockEndCheckinProps> = ({
  task,
  dayTasks,
  onComplete,
  onExtend,
  onMove,
  onSnooze,
  onDismiss,
}) => {
  const [mode, setMode] = useState<'ask' | 'extend' | 'move'>('ask');
  const [extendMins, setExtendMins] = useState(30);
  const [moveStart, setMoveStart] = useState(task.endTime || '17:00');

  const oldEnd = task.endTime || '';
  const duration =
    task.estimatedMinutes && task.estimatedMinutes > 0
      ? task.estimatedMinutes
      : task.startTime && task.endTime
        ? calculateMinutesBetween(task.startTime, task.endTime)
        : 60;

  // Blocks later today that an extension would push forward.
  const extendShiftCount = oldEnd
    ? dayTasks.filter(
        (t) => t.id !== task.id && t.startTime && timeToMinutes(t.startTime) >= timeToMinutes(oldEnd)
      ).length
    : 0;
  const extendedEnd = oldEnd ? computeEndTime(oldEnd, extendMins) : '';

  // Blocks a move would overlap (and push forward).
  const moveEnd = computeEndTime(moveStart, duration);
  const moveOverlapCount = dayTasks.filter((t) => {
    if (t.id === task.id || !t.startTime || !t.endTime) return false;
    const s = timeToMinutes(t.startTime);
    const e = timeToMinutes(t.endTime);
    return s < timeToMinutes(moveEnd) && e > timeToMinutes(moveStart);
  }).length;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSnooze();
      }}
    >
      <div className="flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 pt-10 pb-24">
        <div
          className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-amber-400/40 bg-[#161831] shadow-2xl text-slate-100 overflow-y-auto max-h-[calc(100dvh-3.5rem)]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Block ended check-in"
        >
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
            <div className="flex items-center gap-2 text-base font-bold text-white">
              <Clock className="w-5 h-5 text-amber-300" />
              <span>Time's up!</span>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              title="Don't ask again for this block"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px]"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 text-xs">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                  {task.subject}
                </span>
                {task.blockType === 'revision' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-200 border border-teal-400/40">
                    🔁 Revision
                  </span>
                )}
                {(task.timeSlot || (task.startTime && task.endTime)) && (
                  <span className="text-[10px] text-cyan-300">
                    {task.timeSlot || `${formatTime12h(task.startTime!)} → ${formatTime12h(task.endTime!)}`}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-white">{task.title}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Did you finish this block?
              </p>
            </div>

            {mode === 'ask' && (
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={onComplete}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-sm font-bold transition hover:scale-[1.02] active:scale-95 cursor-pointer min-h-[48px]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Yes, completed</span>
                </button>
                <button
                  onClick={() => setMode('extend')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-sm font-bold transition cursor-pointer min-h-[48px]"
                >
                  <Plus className="w-5 h-5" />
                  <span>Need more time</span>
                </button>
                <button
                  onClick={() => setMode('move')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-100 text-sm font-bold transition cursor-pointer min-h-[48px]"
                >
                  <ArrowRightLeft className="w-4 h-4 text-cyan-300" />
                  <span>Plan it for another time</span>
                </button>
              </div>
            )}

            {mode === 'extend' && (
              <div className="space-y-3 rounded-2xl border border-purple-400/30 bg-purple-500/[0.07] p-3">
                <p className="font-bold text-white">How much longer?</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXTEND_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtendMins(m)}
                      aria-pressed={extendMins === m}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer min-h-[40px] ${
                        extendMins === m
                          ? 'bg-[#6B4EFF] border-purple-400 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      +{m}m
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed" aria-live="polite">
                  Extends to <strong className="text-white">{extendedEnd ? formatTime12h(extendedEnd) : '—'}</strong>
                  {extendShiftCount > 0 && (
                    <> • pushes <strong className="text-white">{extendShiftCount} later block{extendShiftCount === 1 ? '' : 's'}</strong> today +{extendMins}m</>
                  )}
                  <span className="block text-slate-400 mt-0.5">The +{extendMins}m counts toward Time Progress.</span>
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('ask')}
                    className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 font-semibold transition cursor-pointer min-h-[44px]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => onExtend(extendMins)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] text-white font-bold transition cursor-pointer min-h-[44px]"
                  >
                    Add +{extendMins}m
                  </button>
                </div>
              </div>
            )}

            {mode === 'move' && (
              <div className="space-y-3 rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.06] p-3">
                <p className="font-bold text-white">Move to what time? <span className="font-semibold text-slate-400">({duration} min block)</span></p>
                <input
                  type="time"
                  required
                  value={moveStart}
                  onChange={(e) => e.target.value && setMoveStart(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white font-medium focus:border-cyan-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-300 leading-relaxed" aria-live="polite">
                  New slot: <strong className="text-white">{formatTime12h(moveStart)} → {formatTime12h(moveEnd)}</strong>
                  {moveOverlapCount > 0 && (
                    <> • <strong className="text-white">{moveOverlapCount} overlapping block{moveOverlapCount === 1 ? '' : 's'}</strong> shift forward</>
                  )}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('ask')}
                    className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 font-semibold transition cursor-pointer min-h-[44px]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(moveStart)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] text-white font-bold transition cursor-pointer min-h-[44px]"
                  >
                    Move block
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
              <button
                onClick={onSnooze}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[40px]"
              >
                <AlarmClockOff className="w-3.5 h-3.5" />
                <span>Snooze 10 min</span>
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-300 transition cursor-pointer min-h-[40px]"
              >
                Don't ask again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
