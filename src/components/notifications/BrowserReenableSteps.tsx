import React from 'react';
import { Lock, RotateCw } from 'lucide-react';

type BrowserKind = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

/** Best-effort browser detection for tailored re-enable instructions. */
export function detectBrowserKind(): BrowserKind {
  try {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) return 'safari';
    if (/edg\//.test(ua)) return 'edge';
    if (/firefox|fxios/.test(ua)) return 'firefox';
    if (/safari/.test(ua) && !/chrome|crios|chromium/.test(ua)) return 'safari';
    if (/chrome|crios|chromium/.test(ua)) return 'chrome';
  } catch {}
  return 'other';
}

const STEPS: Record<BrowserKind, { label: string; steps: string[] }> = {
  chrome: {
    label: 'Chrome',
    steps: [
      'Tap the padlock (or tune) icon next to the site URL in the address bar.',
      'Open “Site settings” (on mobile: “Permissions”).',
      'Find Notifications and change it to “Allow”.',
      'Reload this page — reminders will start working. 🎉',
    ],
  },
  edge: {
    label: 'Edge',
    steps: [
      'Tap the padlock icon next to the site URL in the address bar.',
      'Open “Site settings” (on mobile: “Permissions”).',
      'Find Notifications and change it to “Allow”.',
      'Reload this page — reminders will start working. 🎉',
    ],
  },
  firefox: {
    label: 'Firefox',
    steps: [
      'Tap the padlock icon next to the site URL in the address bar.',
      'Open “Connection secure” → “More information” → the Permissions tab.',
      'Find “Send Notifications”, uncheck “Use default” and choose “Allow”.',
      'Reload this page — reminders will start working. 🎉',
    ],
  },
  safari: {
    label: 'Safari',
    steps: [
      'On iPhone/iPad: install Mind Maze first via Share → “Add to Home Screen”.',
      'Then open the iPhone Settings app → find Mind Maze → Notifications → Allow Notifications.',
      'On Mac Safari: Safari menu → Settings → Websites → Notifications → allow this site.',
      'Come back here and reload the page. 🎉',
    ],
  },
  other: {
    label: 'your browser',
    steps: [
      'Tap the padlock (or info) icon next to the site URL in the address bar.',
      'Open “Site settings” or “Permissions”.',
      'Find Notifications and change it to “Allow”.',
      'Reload this page — reminders will start working. 🎉',
    ],
  },
};

interface BrowserReenableStepsProps {
  compact?: boolean;
}

/**
 * Step-by-step instructions for turning notifications back on after they
 * were blocked at the browser level (where our in-app button can't help).
 */
export const BrowserReenableSteps: React.FC<BrowserReenableStepsProps> = ({ compact = false }) => {
  const kind = detectBrowserKind();
  const { label, steps } = STEPS[kind];

  return (
    <div className={`${compact ? '' : 'rounded-2xl bg-white/5 border border-white/10 p-3.5 sm:p-4'}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-white">
        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Turn notifications back on ({label})</span>
      </div>
      <ol className="mt-2 space-y-1.5 text-[11px] sm:text-xs text-slate-300 leading-relaxed list-none">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="shrink-0 w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
        <RotateCw className="w-3 h-3 shrink-0" />
        <span>Blocked is a browser setting — the app itself can never override it, which is why these manual steps are needed.</span>
      </p>
    </div>
  );
};
