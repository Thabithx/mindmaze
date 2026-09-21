import React, { useState } from 'react';
import { Download, Share, PlusSquare, Check, X, Smartphone, Sparkles, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'button' | 'compact' | 'nav' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
}) => {
  const {
    isInstallable,
    isInstalled,
    isCardDismissed,
    isIOS,
    install,
    markAsInstalled,
    dismissCard,
  } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopHelp, setShowDesktopHelp] = useState(false);

  // If already running as an installed PWA, hide the button and bar completely
  if (isInstalled) {
    return null;
  }

  // If the user dismissed the card on the dashboard, hide the card
  if (variant === 'card' && isCardDismissed) {
    return null;
  }

  // Handle standard install prompt trigger
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowDesktopHelp(true);
    }
  };

  // If not installable via beforeinstallprompt and not iOS, only show in 'card' variant on Dashboard for user education
  if (!isInstallable && !isIOS && variant !== 'card') {
    return null;
  }

  // 1. Navbar specific variant
  if (variant === 'nav') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          id="btn-pwa-install-nav"
          title={isIOS ? 'Install Mind Maze on iOS' : 'Install Mind Maze on your device'}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] hover:to-[#9D74FF] text-white text-xs font-bold shadow-[0_0_15px_rgba(107,78,255,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer min-h-[44px] ${className}`}
        >
          {isIOS ? <Smartphone className="w-4 h-4 text-cyan-200" /> : <Download className="w-4 h-4 text-cyan-200" />}
          <span className="hidden sm:inline">{isIOS ? 'Install on iOS' : 'Install App'}</span>
          <span className="sm:hidden">{isIOS ? 'iOS' : 'Install'}</span>
        </button>

        {/* iOS Safari Modal */}
        {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
      </>
    );
  }

  // 2. Compact icon-only variant
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          id="btn-pwa-install-compact"
          title={isIOS ? 'Install on iOS' : 'Install Mind Maze App'}
          className={`p-2.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-purple-400/40 text-cyan-300 hover:bg-purple-600/50 hover:text-white transition flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] ${className}`}
        >
          {isIOS ? <Smartphone className="w-4 h-4" /> : <Download className="w-4 h-4" />}
        </button>

        {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
      </>
    );
  }

  // 3. Card variant for Dashboard
  if (variant === 'card') {
    return (
      <>
        <div
          id="pwa-install-dashboard-card"
          className={`rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1B173B]/90 via-[#13152C]/90 to-[#1A2644]/90 p-4 sm:p-5 shadow-xl backdrop-blur-xl relative overflow-hidden ${className}`}
        >
          {/* Top-right Dismiss Button */}
          <button
            onClick={dismissCard}
            id="btn-dismiss-pwa-card"
            aria-label="Dismiss install card"
            title="Dismiss this bar"
            className="absolute top-3 right-3 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-20 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 pr-6 sm:pr-8">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#6B4EFF] to-cyan-500 text-white shadow-lg shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Install Mind Maze App
                  </h3>
                  <span className="text-[10px] bg-cyan-400/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-400/30 uppercase tracking-wider">
                    PWA Offline
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Install onto your phone, tablet, or desktop for instant launch, offline GCE A/L syllabus revision, timetable alerts, and zero browser tab clutter.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:shrink-0">
              {isInstallable ? (
                <button
                  onClick={install}
                  id="btn-pwa-install-dashboard"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] hover:to-[#9D74FF] text-white text-xs font-bold shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
                >
                  <Download className="w-4 h-4 text-cyan-200" />
                  <span>Install App</span>
                </button>
              ) : isIOS ? (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  id="btn-pwa-install-dashboard-ios"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] text-white text-xs font-bold shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
                >
                  <Smartphone className="w-4 h-4 text-cyan-200" />
                  <span>Install on iOS</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowDesktopHelp(true)}
                  id="btn-pwa-desktop-instructions"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold transition cursor-pointer min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>How to Install</span>
                </button>
              )}

              <button
                onClick={markAsInstalled}
                id="btn-mark-already-installed"
                title="Dismiss because app is already installed"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer min-h-[44px]"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Already Installed</span>
              </button>
            </div>
          </div>
        </div>

        {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
        {showDesktopHelp && <DesktopHelpModal onClose={() => setShowDesktopHelp(false)} />}
      </>
    );
  }

  // 4. Default standard button variant
  return (
    <>
      <button
        onClick={handleInstallClick}
        id="btn-pwa-install-default"
        title="Install Mind Maze App"
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] hover:to-[#9D74FF] px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer min-h-[44px] ${className}`}
      >
        {isIOS ? <Smartphone className="w-4 h-4 text-cyan-200" /> : <Download className="w-4 h-4 text-cyan-200" />}
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
      {showDesktopHelp && <DesktopHelpModal onClose={() => setShowDesktopHelp(false)} />}
    </>
  );
};

// Reusable iOS Guide Modal
function IOSGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#161831] p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <span>Install on iPhone / iPad</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <p className="text-slate-200">
            To install this app on your Apple device:
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
              Scroll down the menu and select <strong>&quot;Add to Home Screen&quot;</strong>.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Step 3: Tap Add</span>
              Tap <strong>Add</strong> in the top-right corner to launch Mind Maze with full offline access.
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] py-2.5 text-xs font-bold text-white transition shadow-lg cursor-pointer min-h-[44px]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// Reusable Desktop Browser Help Modal
function DesktopHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#161831] p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Download className="w-5 h-5 text-cyan-400" />
            <span>Install Mind Maze PWA</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs text-slate-300 leading-relaxed">
          <p className="text-slate-200">
            Mind Maze is a Progressive Web Application. You can install it on any modern browser:
          </p>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-cyan-300 block">Chrome & Edge (Desktop)</span>
            <p className="text-slate-300">
              Look for the <strong>Install icon (⊕ or computer with arrow)</strong> on the right side of the browser address bar, or click <strong>Menu ⋮ &gt; &quot;Install Mind Maze...&quot;</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-purple-300 block">Android (Chrome)</span>
            <p className="text-slate-300">
              Tap the 3-dots menu in the top-right corner and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-emerald-300 block">iPhone & iPad (Safari)</span>
            <p className="text-slate-300">
              Tap the <strong>Share</strong> icon in Safari toolbar, then tap <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] py-2.5 text-xs font-bold text-white transition shadow-lg cursor-pointer min-h-[44px]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
