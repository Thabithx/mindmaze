import React from 'react';
import {
  Clock,
  Sparkles,
  X,
  MessageCircle,
  Zap,
  Atom,
  FlaskConical,
  Dna,
  Laptop,
  Calculator,
  BookOpen,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { ScreenId } from '../types';

interface ComingSoonModalProps {
  isOpen: boolean;
  subjectName: string;
  onClose: () => void;
  onNavigateToStudyPlans?: () => void;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  subjectName,
  onClose,
  onNavigateToStudyPlans,
}) => {
  if (!isOpen) return null;

  const getSubjectIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('physics')) return Atom;
    if (lower.includes('chem')) return FlaskConical;
    if (lower.includes('bio')) return Dna;
    if (lower.includes('ict') || lower.includes('computer')) return Laptop;
    if (lower.includes('math')) return Calculator;
    return BookOpen;
  };

  const IconComponent = getSubjectIcon(subjectName);

  return (
    <div
      id="coming-soon-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="coming-soon-modal-content"
        className="relative w-full max-w-lg rounded-3xl border border-purple-500/30 bg-gradient-to-b from-[#181938] via-[#12142B] to-[#0D0E21] p-6 sm:p-8 text-white shadow-2xl shadow-purple-900/50 backdrop-blur-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Background Orbs */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-36 w-36 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          id="btn-close-coming-soon-modal"
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide uppercase">
            <Clock className="w-3.5 h-3.5" />
            <span>Coming Soon</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Curriculum Verification</span>
        </div>

        {/* Header with Subject Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white shadow-lg border border-white/20">
            <IconComponent className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {subjectName || 'Core Feature'}
            </h2>
            <p className="text-xs text-cyan-300 font-semibold mt-0.5">
              MCQ Quiz Engine & Past Paper Archives Coming Soon
            </p>
          </div>
        </div>

        {/* Description Body */}
        <p className="text-sm text-slate-300 leading-relaxed mb-5">
          Past paper questions, interactive quiz engines, and verified marking schemes for <strong className="text-white">{subjectName}</strong> are currently undergoing expert teacher verification for the 2027 examination sitting.
        </p>

        {/* Highlight Banner: Study Plans are 100% Live */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Study Plans, Timetables & Daily Topics Are Live</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            While interactive MCQ banks are being prepared, your structured study plans, weekly study timetables, and daily syllabus cover topics are fully active to guide your daily revision.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-emerald-200">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Topic Revision Plans
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Weekly Timetable
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Daily Syllabus Tracking
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onNavigateToStudyPlans && (
            <button
              onClick={() => {
                onClose();
                onNavigateToStudyPlans();
              }}
              id="btn-switch-to-study-plans"
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-purple-600 hover:from-[#7C5DFA] hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-cyan-300" />
              <span>Open Study Plans & Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href="https://chat.whatsapp.com/C4NbNeRB9mY57jw2dPf7EZ?s=cl&p=i&mlu=4"
            target="_blank"
            rel="noopener noreferrer"
            id="btn-whatsapp-notify"
            className="w-full sm:w-auto py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Notify Me on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
