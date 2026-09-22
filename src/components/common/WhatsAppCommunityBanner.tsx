import React, { useState } from 'react';
import { MessageCircle, ArrowRight, X, Users, Sparkles } from 'lucide-react';

export const WhatsAppCommunityBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return localStorage.getItem('mindmaze_hide_wa_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('mindmaze_hide_wa_banner', 'true');
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <div className="relative z-40 bg-gradient-to-r from-emerald-950/90 via-[#0D1F1A]/95 to-[#0F1023] border-b border-emerald-500/25 px-4 py-2.5 sm:py-2 text-white backdrop-blur-xl shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shrink-0">
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
          </div>
          <p className="text-slate-200 leading-snug">
            <span className="font-bold text-emerald-300">Join 500+ Sri Lankan A/L Students</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https:
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] transition shadow-md shadow-emerald-500/20 hover:scale-105 active:scale-95"
          >
            <span>Join WhatsApp Community</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
