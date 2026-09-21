import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';

export interface Celebration {
  id: string;
  kind: 'day' | 'subject' | 'streak' | 'revision';
  emoji: string;
  title: string;
  message: string;
  stats: { label: string; value: string }[];
  actionLabel?: string;
}

interface CelebrationModalProps {
  celebration: Celebration | null;
  onClose: () => void;
  onAction?: () => void;
}

/**
 * Full-screen celebration modal (day-complete, subject-complete, streak
 * milestone). Fires confetti on open; closes on backdrop click or button.
 * Only one shows at a time — extra celebrations wait in the App queue.
 */
export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  celebration,
  onClose,
  onAction,
}) => {
  useEffect(() => {
    if (!celebration) return;
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6B4EFF', '#00F5FF', '#10B981', '#F59E0B', '#EC4899'],
      });
      const timer = setTimeout(() => {
        try {
          confetti({
            particleCount: 60,
            spread: 100,
            origin: { y: 0.4 },
            colors: ['#6B4EFF', '#00F5FF', '#F59E0B'],
          });
        } catch {}
      }, 600);
      return () => clearTimeout(timer);
    } catch {
      return undefined;
    }
  }, [celebration]);

  if (!celebration || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4 pb-24 sm:pb-12">
        <div
          className="w-full max-w-sm rounded-3xl border border-amber-400/40 bg-gradient-to-b from-[#1E1949] to-[#12142B] shadow-[0_0_40px_rgba(245,158,11,0.25)] text-slate-100 p-6 sm:p-8 text-center max-h-[calc(100dvh-3rem)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl sm:text-6xl" role="img" aria-label="celebration">
            {celebration.emoji}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-3 tracking-tight">
            {celebration.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {celebration.message}
          </p>

          {celebration.stats.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-5">
              {celebration.stats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-2.5 min-w-0">
                  <div className="text-base sm:text-lg font-black text-cyan-300 truncate">{s.value}</div>
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 truncate">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-6">
            {celebration.actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] text-white text-xs font-bold transition shadow-lg cursor-pointer min-h-[44px]"
              >
                {celebration.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl border border-white/15 hover:bg-white/10 text-slate-200 text-xs font-bold transition cursor-pointer min-h-[44px]"
            >
              Keep Going 💪
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
