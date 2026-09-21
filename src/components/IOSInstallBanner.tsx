import React, { useState } from 'react';
import { Share, PlusSquare, X, Smartphone, ArrowRight, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const IOSInstallBanner: React.FC = () => {
  const { isIOS, isInstalled, isIOSDismissed, dismissIOSBanner, markAsInstalled } = usePWAInstall();
  const [showFullModal, setShowFullModal] = useState(false);

  // Only show on iOS/iPadOS when not already installed and not dismissed
  if (!isIOS || isInstalled || isIOSDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Dismissible iOS Install Banner */}
      <div
        id="ios-pwa-install-banner"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-2xl border border-purple-400/40 bg-[#161831]/95 p-4 shadow-2xl backdrop-blur-xl animate-fadeIn"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#6B4EFF] to-[#8B5CF6] text-white shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Install Mind Maze on iOS</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-2 py-0.2 rounded-full border border-cyan-400/30">
                  Full PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                To install this app: tap the <span className="text-cyan-300 font-semibold inline-flex items-center gap-0.5"><Share className="w-3 h-3 inline" /> Share</span> button, then <span className="text-purple-300 font-semibold inline-flex items-center gap-0.5"><PlusSquare className="w-3 h-3 inline" /> &apos;Add to Home Screen&apos;</span>.
              </p>
            </div>
          </div>

          <button
            onClick={dismissIOSBanner}
            id="btn-dismiss-ios-banner"
            aria-label="Dismiss iOS install banner"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Dismiss for 7 days"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step-by-Step Mini Illustration */}
        <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
            <div className="p-1 rounded bg-blue-500/20 text-cyan-400 shrink-0">
              <Share className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">1. Safari Toolbar</span>
              <span className="font-semibold text-slate-200">Tap Share</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
            <div className="p-1 rounded bg-purple-500/20 text-purple-400 shrink-0">
              <PlusSquare className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <span className="text-slate-400 block text-[10px]">2. Menu Action</span>
              <span className="font-semibold text-slate-200">Add to Home</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFullModal(true)}
              className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 underline flex items-center gap-1 cursor-pointer"
            >
              <span>Guide</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={markAsInstalled}
              id="btn-ios-already-installed"
              title="Dismiss because app is already installed"
              className="text-[11px] font-medium text-slate-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Installed</span>
            </button>
          </div>

          <button
            onClick={dismissIOSBanner}
            className="px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Detailed Modal if requested */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#161831] p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <span>Install on iPhone / iPad</span>
              </div>
              <button
                onClick={() => setShowFullModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <p className="text-slate-200">
                To install Mind Maze as a standalone PWA on your iOS device:
              </p>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-blue-500/20 text-cyan-400 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Step 1: Tap Share</span>
                  In Safari&apos;s bottom toolbar (or top right on iPad), tap the <strong>Share</strong> button.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Step 2: Add to Home Screen</span>
                  Scroll down the share sheet and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Step 3: Tap Add</span>
                  Tap <strong>Add</strong> in the top-right corner. Mind Maze will appear on your Home Screen with full offline support and zero browser bars!
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowFullModal(false);
                  markAsInstalled();
                }}
                className="w-full rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] py-2.5 text-xs font-bold text-white transition shadow-lg cursor-pointer min-h-[44px]"
              >
                I Installed It — Dismiss Bar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
