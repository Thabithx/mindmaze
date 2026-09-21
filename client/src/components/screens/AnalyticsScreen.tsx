import React, { useState } from 'react';
import { ScreenId, TopicMastery, UserProfile } from '../../types';
import { MOCK_TOPIC_MASTERY } from '../../data/mockData';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Sparkles,
  ArrowRight,
  Filter,
  Brain,
  Layers,
  Calendar,
  Compass,
  Clock,
  MessageCircle,
  Atom,
} from 'lucide-react';
import { ComingSoonModal } from '../ComingSoonModal';

interface AnalyticsScreenProps {
  userProfile: UserProfile;
  onNavigate: (screen: ScreenId) => void;
  onPracticeTopic?: (topic: string) => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  userProfile,
  onNavigate,
  onPracticeTopic,
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'mastery' | 'repeat-tracker'>('mastery');
  const [comingSoonModalSubject, setComingSoonModalSubject] = useState<string | null>(null);

  const filteredTopics = MOCK_TOPIC_MASTERY.filter((item) => {
    if (selectedSubjectFilter === 'All') return true;
    return item.subject === selectedSubjectFilter;
  });

  const weakTopics = filteredTopics.filter((t) => t.masteryPercentage < 50);
  const strongTopics = filteredTopics.filter((t) => t.masteryPercentage >= 75);
  const moderateTopics = filteredTopics.filter((t) => t.masteryPercentage >= 50 && t.masteryPercentage < 75);

  const averageMastery = Math.round(
    filteredTopics.reduce((acc, t) => acc + t.masteryPercentage, 0) / Math.max(1, filteredTopics.length)
  );

  const isNonPhysicsSubject = selectedSubjectFilter !== 'All' && selectedSubjectFilter !== 'Physics';

  return (
    <div id="mind-maze-analytics-screen" className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300 mb-2 backdrop-blur-md">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-300" />
            <span>AI Predictive Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Topic Mastery & Repeat Question Radar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visual breakdown of syllabus strength, weak spots in red, and 34-year past paper repeat frequency patterns.
          </p>
        </div>

        {/* Filter by Subject Dropdown */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/10 p-2 rounded-2xl backdrop-blur-sm shadow-sm">
          <span className="text-xs text-slate-400 pl-2">Filter Subject:</span>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSubjectFilter(val);
              if (val !== 'All' && val !== 'Physics') {
                setComingSoonModalSubject(val);
              }
            }}
            className="bg-[#161831] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="All">All Subjects</option>
            <option value="Physics">Physics (Live)</option>
            <option value="Chemistry">Chemistry (Soon)</option>
            <option value="Biology">Biology (Soon)</option>
            <option value="ICT">ICT (Soon)</option>
            <option value="Combined Maths">Combined Maths (Soon)</option>
          </select>
        </div>
      </div>

      {/* Non-Physics Coming Soon Notice if selected */}
      {isNonPhysicsSubject && (
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 p-6 backdrop-blur-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <Clock className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedSubjectFilter} Analytics & Radar Coming Soon</span>
                  <span className="text-[10px] uppercase tracking-wider bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    In Development
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  AI topic mastery algorithms and historical repeat frequency data for <strong>{selectedSubjectFilter}</strong> are currently under preparation. Physics is currently 100% live.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setSelectedSubjectFilter('Physics')}
                className="py-2.5 px-4 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Atom className="w-4 h-4 text-cyan-300" />
                <span>Switch to Live Physics</span>
              </button>
              <a
                href="https://chat.whatsapp.com/C4NbNeRB9mY57jw2dPf7EZ?s=cl&p=i&mlu=4"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Notify Me</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Top High-Level Diagnostics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-sm">
          <div className="text-xs text-slate-400">Overall Syllabus Mastery</div>
          <div className="text-3xl font-black text-white mt-1">{averageMastery}%</div>
          <div className="text-[11px] text-cyan-300 mt-1 font-semibold">
            {averageMastery > 70 ? 'On Track for 3 A\'s' : 'Focus on Weak Modules'}
          </div>
        </div>

        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 backdrop-blur-md shadow-sm">
          <div className="text-xs text-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Weak Topics (&lt;50%)
          </div>
          <div className="text-3xl font-black text-rose-400 mt-1">{weakTopics.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">High Risk for A/L Part I</div>
        </div>

        <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 backdrop-blur-md shadow-sm">
          <div className="text-xs text-amber-300">Moderate Topics (50-74%)</div>
          <div className="text-3xl font-black text-amber-400 mt-1">{moderateTopics.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Needs Speed Drills</div>
        </div>

        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 backdrop-blur-md shadow-sm">
          <div className="text-xs text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Strong Topics (&ge;75%)
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-1">{strongTopics.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for Exam Standard</div>
        </div>
      </div>

      {/* Main Section: Interactive Topic Mastery Bar Chart */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-300" />
              Topic Mastery % Chart
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Color coded: <span className="text-rose-400 font-bold">Red (Weak &lt;50%)</span>,{' '}
              <span className="text-amber-400 font-bold">Amber (50–74%)</span>,{' '}
              <span className="text-emerald-400 font-bold">Green (Strong &ge;75%)</span>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Weak
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-medium ml-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Moderate
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium ml-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Strong
            </span>
          </div>
        </div>

        {/* Custom High-Contrast Bar Chart */}
        <div className="space-y-5 pt-2">
          {filteredTopics.map((topicItem, idx) => {
            const isWeak = topicItem.masteryPercentage < 50;
            const isStrong = topicItem.masteryPercentage >= 75;
            const barColor = isWeak
              ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
              : isStrong
              ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]';

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-white text-sm">{topicItem.topic}</span>
                    <span className="text-purple-300 text-[11px]">({topicItem.subject})</span>
                    {topicItem.predictedLikelihood === 'Very High' && (
                      <span className="bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                        ⚡ High Repeat
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {topicItem.correct}/{topicItem.attempted} Correct
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        isWeak ? 'text-rose-400' : isStrong ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {topicItem.masteryPercentage}%
                    </span>
                    <button
                      onClick={() => onPracticeTopic ? onPracticeTopic(topicItem.topic) : onNavigate('practice')}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#6B4EFF] text-[11px] font-semibold text-white transition-colors"
                    >
                      Practice
                    </button>
                  </div>
                </div>

                {/* Horizontal Progress Bar Container */}
                <div className="w-full bg-white/10 h-3 rounded-xl overflow-hidden p-0.5 border border-white/5">
                  <div
                    className={`h-full rounded-lg transition-all duration-700 ease-out ${barColor}`}
                    style={{ width: `${topicItem.masteryPercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Repeat-Question Tracker & Predictive Timeline */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md space-y-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Repeat-Question Tracker (2000 to 2026 Analysis)
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Concepts That Consistently Recur in A/L Papers
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Sri Lankan GCE A/L examination papers test consistent theoretical principles. Here is the historical frequency matrix:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{item.topic}</span>
                <span className="text-purple-300 text-xs font-semibold">{item.subject}</span>
              </div>

              {/* Exact user request repeat tracker example format */}
              <div className="rounded-xl bg-white/10 p-3 border border-white/5 text-xs text-slate-300">
                <div className="text-amber-300 font-semibold mb-1 flex items-center gap-1">
                  <span>📅 Historical Appearance:</span>
                </div>
                <div className="font-mono text-cyan-300 text-xs font-bold">
                  "This concept appeared in {item.repeatYears.join(', ')}"
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">
                  Likelihood in upcoming sitting: <strong className="text-white">{item.predictedLikelihood}</strong>
                </span>
                <button
                  onClick={() => onPracticeTopic ? onPracticeTopic(item.topic) : onNavigate('practice')}
                  className="text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  Drill Topic <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic AI Recommendation Card */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
            <Brain className="w-4 h-4 text-cyan-300" />
            AI Strategy Recommendation
          </div>
          <h3 className="text-lg font-bold text-white">
            Focus 60% of next week's practice on Projectile Motion & Definite Integrals
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            These two concepts have high repeat frequency (&gt;75%) but currently sit below 45% mastery in your profile. Raising them to 80% is the fastest path to securing your 3 A's target.
          </p>
        </div>

        <button
          onClick={() => onNavigate('practice')}
          className="shrink-0 px-6 py-3.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] hover:scale-105 transition-all"
        >
          Launch Targeted Revision Quiz
        </button>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={!!comingSoonModalSubject}
        subjectName={comingSoonModalSubject || ''}
        onClose={() => setComingSoonModalSubject(null)}
        onNavigateToPhysics={() => {
          setSelectedSubjectFilter('Physics');
          setComingSoonModalSubject(null);
        }}
      />
    </div>
  );
};
