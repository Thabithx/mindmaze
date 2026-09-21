import React from 'react';
import { ScreenId } from '../../types';
import {
  Clock,
  Sparkles,
  CalendarDays,
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Atom,
  Target,
  BarChart3,
  BookmarkCheck,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

interface FeatureComingSoonScreenProps {
  screenId: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onAllowPreview?: () => void;
}

export const FeatureComingSoonScreen: React.FC<FeatureComingSoonScreenProps> = ({
  screenId,
  onNavigate,
  onAllowPreview,
}) => {
  const getFeatureDetails = () => {
    switch (screenId) {
      case 'practice':
        return {
          title: 'AI Practice Quiz Engine (Physics, Chemistry & Maths)',
          badge: 'Coming Soon',
          icon: Sparkles,
          desc: 'Interactive 50-MCQ timed simulation engine with step-by-step marking scheme rationales, AI hints, and difficulty adjustment for Sri Lankan GCE A/L examinations.',
          details: [
            'Full 2000-2026 verified question bank with Sinhala, English & Tamil mediums',
            'Step-by-step Department of Examinations marking scheme explanations',
            'Real-time timer & question flagging for exam condition practice',
          ],
        };
      case 'past-papers':
        return {
          title: 'Official Past Paper Archive Library (2000 - 2026)',
          badge: 'Coming Soon',
          icon: BookOpen,
          desc: 'Categorized past paper repository segregated by Old Syllabus vs Current Syllabus with verified answer keys, examiner reports, and download links.',
          details: [
            '2026 National Model Paper and 2000-2025 past papers',
            'Full 50-MCQ answer keys with marking scheme distribution',
            'Old syllabus vs current syllabus tag filtering',
          ],
        };
      case 'mistakes':
        return {
          title: 'Mistake Notebook & Error Cleansing Drills',
          badge: 'Coming Soon',
          icon: BookmarkCheck,
          desc: 'Automated error tracking that analyzes missed MCQs, tags conceptual mistakes (e.g., misreading normal acceleration or forgetting radians), and generates custom retry tests.',
          details: [
            'Never repeat the same conceptual mistake twice',
            'Personalized retry drills until 100% mastery is achieved',
            'Teacher notes and warning traps for tricky questions',
          ],
        };
      case 'targets':
        return {
          title: 'Smart Targets & A/L Exam Planning Engine',
          badge: 'Coming Soon',
          icon: Target,
          desc: 'Dynamic pacing engine that calculates your daily and weekly question quotas based on your target grade and exam sitting date.',
          details: [
            'Target grade calibration (3 A\'s, 2 A\'s 1 B, etc.)',
            'Pacing schedules that adjust when you miss a study session',
            'Milestone achievement badges and progress tracking',
          ],
        };
      case 'analytics':
        return {
          title: 'Syllabus Topic Analysis & Mastery Analytics',
          badge: 'Coming Soon',
          icon: BarChart3,
          desc: 'Analysis of GCE A/L past papers to track syllabus coverage, topic frequencies, and individual mastery gaps.',
          details: [
            'Topic frequency mapping across past exam papers',
            'Unit-by-unit syllabus mastery percentages',
            'Speed and accuracy diagnostics for exam revision',
          ],
        };
      default:
        return {
          title: 'Upcoming Examination Feature',
          badge: 'Coming Soon',
          icon: Clock,
          desc: 'This module is currently undergoing expert syllabus verification.',
          details: ['Expected launch in upcoming release'],
        };
    }
  };

  const feature = getFeatureDetails();
  const Icon = feature.icon;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 py-6 px-4 animate-fade-in">
      {/* Top Card */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#181A38] via-[#12142E] to-[#0E0F24] p-6 sm:p-10 backdrop-blur-xl shadow-2xl text-center">
        <div className="absolute top-0 right-0 h-64 w-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-64 w-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide uppercase">
            <Clock className="w-3.5 h-3.5" />
            <span>Coming Soon • Curriculum Verification</span>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#6B4EFF] to-purple-800 text-white flex items-center justify-center shadow-xl border border-white/20">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-300" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {feature.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {feature.desc}
            </p>
          </div>

          {/* Live Feature Banner: Promoting Study Plans */}
          <div className="text-left rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Study Plans, Weekly Timetables & Daily Topics are 100% Live!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              While interactive past paper quiz engines (including Physics) are being audited by senior GCE A/L teachers, you can immediately use the complete Study Routine system to organize your revision plans and daily topics.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Targeted Revision Plans</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Interactive Schedule</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Daily Topics & Formulas</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('study-plan')}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold shadow-lg shadow-purple-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <CalendarDays className="w-4 h-4 text-cyan-300" />
              <span>Open Study Plans & Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Back to Dashboard</span>
            </button>

            {onAllowPreview && (
              <button
                onClick={onAllowPreview}
                className="w-full sm:w-auto py-3 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-medium underline cursor-pointer"
              >
                Peek at Prototype Preview
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
