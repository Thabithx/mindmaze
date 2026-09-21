import React from 'react';
import { createPortal } from 'react-dom';
import { Bell, ShieldCheck, CheckCircle2, X, Sparkles, Volume2 } from 'lucide-react';
import { requestBrowserNotificationPermission, sendStudyNotification, ensureHealthyPushSubscription } from '../../lib/notificationService';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionUpdated: (status: NotificationPermission) => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionUpdated,
}) => {
  if (!isOpen) return null;

  const handleAllowClick = async () => {
    const perm = await requestBrowserNotificationPermission();
    onPermissionUpdated(perm);
    // Heal + report for EVERY outcome, not just grants: granted devices
    // re-verify/create their push subscription, denied devices report
    // 'denied' (and drop dead rows) so the Admin health view learns the
    // result immediately instead of waiting for a later background heal.
    void ensureHealthyPushSubscription({ force: true }).catch(() => undefined);
    if (perm === 'granted') {
      // Register for closed-app Web Push (free, VAPID). The health check
      // above already heals any stale subscription and reports permission
      // state; no-op if the public key isn't configured yet — local
      // reminders still work.
      sendStudyNotification(
        '🔔 Mind Maze Notifications Enabled!',
        'You will now receive timely reminders before your GCE A/L timetable study sessions.'
      );
    }
    onClose();
  };

  return typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 pt-6 sm:pt-10 pb-24 sm:pb-12">
        <div
          className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-purple-500/40 bg-gradient-to-b from-[#1E1744] via-[#161831] to-[#0F1023] shadow-2xl text-slate-100 relative flex flex-col max-h-[calc(100dvh-3.5rem)] sm:max-h-[min(88vh,740px)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pinned Header Area */}
          <div className="p-4 sm:p-5 pb-3 shrink-0 relative flex flex-col items-center text-center border-b border-white/5 bg-[#1B1640]/50">
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-3.5 right-3.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon */}
          <div className="relative mb-2.5 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6B4EFF] to-cyan-400 p-0.5 shadow-[0_0_20px_rgba(107,78,255,0.4)]">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#161831]">
              <Bell className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-300 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white">
            Never Miss a Study Block
          </h2>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-xs">
            Timely reminders, streak protection, and gentle audio chimes for your A/L revision.
          </p>
        </div>

        {/* Scrollable Value Points Container */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 text-xs text-slate-200 overscroll-contain">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Smart & Motivational:</strong> Context-aware messages that celebrate streaks, cheer your final topic of the day, and keep study momentum alive.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">15-Minute Pre-Alerts:</strong> Gives you time to gather past papers and transition smoothly to your next scheduled revision block.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Gentle Nudges (Zero Spam):</strong> Periodic check-ins if you have unstarted tasks for today — strictly capped and never after 10 PM.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">PWA Background & Chimes:</strong> Reliable service worker delivery with pleasant, calm audio alerts.
              </span>
            </div>
          </div>
        </div>

        {/* Pinned Sticky Action Buttons Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#14162e]/95 backdrop-blur-md flex flex-col gap-2 shrink-0">
          <button
            onClick={handleAllowClick}
            id="btn-confirm-enable-notifications"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] hover:to-[#9D74FF] py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-[0_0_20px_rgba(107,78,255,0.4)] transition hover:scale-[1.01] active:scale-98 cursor-pointer min-h-[44px]"
          >
            <Bell className="w-4 h-4" />
            <span>Enable Study Reminders</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            Maybe Later
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
};
