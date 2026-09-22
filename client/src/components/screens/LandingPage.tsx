import React from 'react';
import { ScreenId, StreamType } from '../../types';
import { Logo } from '../Logo';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Target,
  CalendarDays,
  Clock,
  CheckCircle2,
  MessageCircle,
  Flame,
  Check,
  Zap,
} from 'lucide-react';
import { GCE_AL_STREAMS } from '../../data/streamStudyData';

interface LandingPageProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectStreamAndStart?: (stream: StreamType) => void;
  onOpenAuth?: (mode: 'signin' | 'signup', stream?: StreamType) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onSelectStreamAndStart,
  onOpenAuth,
}) => {
  const streamList: { id: StreamType; name: string; icon: string; desc: string; color: string; subjects: string[] }[] = [
    {
      id: 'Maths',
      name: 'Physical Science (Maths)',
      icon: '📐',
      desc: 'Combined Mathematics, Physics & Chemistry revision phases and daily problem sets.',
      color: 'from-blue-600/30 to-indigo-900/40 border-blue-500/30 text-blue-400',
      subjects: ['Combined Mathematics', 'Physics', 'Chemistry', 'ICT'],
    },
    {
      id: 'Bio',
      name: 'Biological Science (Bio)',
      icon: '🔬',
      desc: 'Biology, Chemistry & Physics structured timetable with unit-wise revision milestones.',
      color: 'from-emerald-600/30 to-teal-900/40 border-emerald-500/30 text-emerald-400',
      subjects: ['Biology', 'Chemistry', 'Physics'],
    },
  ];

  return (
    <div id="mind-maze-landing-view" className="relative min-h-screen">
      {/* Decorative ambient brain-logo backdrop — landing page only, non-interactive */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="landing-brain-glow" />
        <img
          src="/icon-512.png"
          alt=""
          width={512}
          height={512}
          draggable={false}
          loading="lazy"
          decoding="async"
          className="landing-brain-logo"
        />
      </div>
      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden pt-10 pb-14 md:pt-18 md:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/15 px-4 py-1.5 text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(107,78,255,0.3)] backdrop-blur-md mb-4">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span>Your A/L Study Companion • 2 Streams Supported</span>
            </div>

            {/* Main Tagline */}
            <h1 className="mt-2 max-w-4xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Pick your stream.{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#6B4EFF] via-[#8B5CF6] to-cyan-400 bg-clip-text text-transparent">
                  Get your plan.
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-[#6B4EFF] to-cyan-400" />
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-2xl text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed">
              Stay disciplined on your path to 3 A's. Follow structured syllabus revision plans, manage your interactive weekly study timetable, and track daily cover topics on both computer and mobile.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
              <button
                id="btn-hero-start-free"
                onClick={() => (onOpenAuth ? onOpenAuth('signup') : onNavigate('study-plan'))}
                className="group relative flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] px-8 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(107,78,255,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Get Access</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Quick Sign-In Option */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>Already have an account?</span>
              <button
                type="button"
                onClick={() => (onOpenAuth ? onOpenAuth('signin') : onNavigate('study-plan'))}
                className="font-bold text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* THE 3 CORE MODULES (STUDY PLANS, TIMETABLES, DAILY TOPICS) */}
      <section className="relative z-10 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              The 3 Essential GCE A/L Revision Pillars
            </h2>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
              Everything You Need to Structure Your Exam Year
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {[
              {
                id: 'study-plan',
                icon: Target,
                iconWrap: 'bg-purple-500/20 border-purple-400/30 text-purple-300',
                cardBorder: 'border-purple-500/30',
                title: 'Study plan',
                lines: [
                  'What to study, and when',
                  'For Maths and Bio students',
                  "Shows how much you've covered so far.",
                ],
              },
              {
                id: 'timetable',
                icon: CalendarDays,
                iconWrap: 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300',
                cardBorder: 'border-cyan-500/30',
                title: 'Weekly timetable',
                lines: [
                  'Your week made simple.',
                  'Change any day to fit your routine',
                  'Has a built-in study timer',
                ],
              },
              {
                id: 'daily-topics',
                icon: BookOpen,
                iconWrap: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300',
                cardBorder: 'border-emerald-500/30',
                title: "Today's topics",
                lines: [
                  'What to study right now',
                  'A short list of what to study today',
                  'Tick each one off as you finish',
                ],
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border ${item.cardBorder} bg-[#161831]/80 backdrop-blur-xl shadow-xl p-4 sm:p-5 flex flex-col min-w-[240px] sm:min-w-[260px] snap-center md:min-w-0`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${item.iconWrap}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-base sm:text-lg font-bold text-white">
                      {idx + 1}. {item.title}
                    </span>
                  </div>
                  <div className="space-y-2 mt-4">
                    {item.lines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STREAM EXPLORER (ALL 5 GCE A/L STREAMS) */}
      <section className="relative z-10 py-14 border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
              Personalized Syllabus Routine
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
              Choose Your GCE A/L Stream
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Every stream has custom revision schedules, timetables, and daily topics pre-loaded for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {streamList.map((st) => (
              <div
                key={st.id}
                onClick={() => {
                  if (onSelectStreamAndStart) {
                    onSelectStreamAndStart(st.id);
                  } else {
                    onNavigate('study-plan');
                  }
                }}
                className={`rounded-3xl border bg-gradient-to-br ${st.color} p-6 backdrop-blur-md hover:scale-[1.02] transition-all group flex flex-col justify-between shadow-lg cursor-pointer`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{st.icon}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white border border-white/10">
                      A/L Stream
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {st.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{st.desc}</p>

                  <div className="pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Included Subjects:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {st.subjects.map((sub, i) => (
                        <span key={i} className="text-[11px] bg-white/10 px-2 py-0.5 rounded-md text-slate-200 font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1 group-hover:text-cyan-300">
                    Open Routine <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Banner */}
      <section className="relative z-10 py-12 border-t border-white/10 bg-gradient-to-r from-[#12142B] via-[#1A1840] to-[#12142B]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                <MessageCircle className="w-3.5 h-3.5" />
                Sri Lankan A/L Student Community
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Join 400+ A/L Students on WhatsApp</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
                Get daily study plan reminders, timetable templates, and syllabus discussion groups directly on your phone.
              </p>
            </div>

            <a
              href="https://chat.whatsapp.com/C4NbNeRB9mY57jw2dPf7EZ?s=cl&p=i&mlu=4"
              target="_blank"
              rel="noopener noreferrer"
              id="btn-join-whatsapp-hero"
              className="flex items-center justify-center gap-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-7 py-3.5 text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105 shrink-0"
            >
              <MessageCircle className="w-5 h-5 fill-slate-950" />
              <span>Join WhatsApp Group</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer strictly showing the 3 core items */}
      <footer className="relative z-10 border-t border-white/10 bg-[#161831]/80 backdrop-blur-md py-10 text-slate-400 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" onClick={() => onNavigate('landing')} />

            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300">
              <button
                onClick={() => onNavigate('study-plan')}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Study Plans
              </button>
              <button
                onClick={() => onNavigate('timetable')}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Time Tables
              </button>
              <button
                onClick={() => onNavigate('daily-topics')}
                className="hover:text-white cursor-pointer transition-colors"
              >
                Daily Cover Topics
              </button>
              <button
                onClick={() => (onOpenAuth ? onOpenAuth('signin') : onNavigate('study-plan'))}
                className="hover:text-cyan-300 cursor-pointer transition-colors"
              >
                Student Sign In
              </button>
            </div>

            <a
              href="https://chat.whatsapp.com/C4NbNeRB9mY57jw2dPf7EZ?s=cl&p=i&mlu=4"
              target="_blank"
              rel="noopener noreferrer"
              id="btn-join-whatsapp-footer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold hover:bg-emerald-500/30 transition-all text-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Group</span>
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-slate-500">
            Mind Maze © 2026. Complete Study Plans, Time Tables & Daily Topics for Sri Lankan G.C.E. Advanced Level Students.
          </div>
        </div>
      </footer>
    </div>
  );
};
