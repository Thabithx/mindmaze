import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';

function goTo(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const EmailConfirmed: React.FC = () => {
  const [status, setStatus] = useState<'confirmed' | 'needs-signin'>('confirmed');

  return (
    <div className="relative min-h-screen bg-[#0F1023] bg-[radial-gradient(circle_at_top_right,_#1a1b3d_0%,_#0F1023_100%)] text-slate-100 flex items-center justify-center px-4 py-10 font-['Poppins',sans-serif]">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={() => goTo('/')}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <img
            src="/icon-192.png"
            alt="Mind Maze logo"
            width={192}
            height={192}
            className="w-20 h-20 rounded-3xl object-cover ring-1 ring-white/10 shadow-[0_0_30px_rgba(107,78,255,0.4)] mx-auto"
            draggable={false}
          />
          <div>
            <h1 className="text-2xl font-black text-white">
              Mind <span className="bg-gradient-to-r from-[#6B4EFF] via-[#8B5CF6] to-[#00F5FF] bg-clip-text text-transparent">Maze</span>
            </h1>
            <p className="text-[10px] tracking-wider uppercase font-medium text-cyan-400 mt-0.5">
              GCE A/L Study Planner
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-[#12142B]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
          <div className="space-y-4 text-center py-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-black text-white">Account Ready!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your Mind Maze account is ready. Let&apos;s start studying.
            </p>
            <button
              type="button"
              onClick={() => goTo('/dashboard')}
              className="w-full py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(107,78,255,0.4)]"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
