import React, { useState } from 'react';
import { MistakeItem, ScreenId } from '../../types';
import {
  BookmarkCheck,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  Layers,
  ArrowRight,
  ListOrdered,
  Lightbulb,
} from 'lucide-react';

interface MistakeNotebookScreenProps {
  mistakes: MistakeItem[];
  onNavigate: (screen: ScreenId) => void;
  onToggleMastered: (id: string) => void;
  onDeleteMistake: (id: string) => void;
  onStartReviewSession: (specificMistakeIds?: string[]) => void;
}

export const MistakeNotebookScreen: React.FC<MistakeNotebookScreenProps> = ({
  mistakes,
  onNavigate,
  onToggleMastered,
  onDeleteMistake,
  onStartReviewSession,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Extract unique topics and subjects
  const allSubjects = ['All', ...Array.from(new Set(mistakes.map((m) => m.question.subject)))];
  const allTopics = ['All', ...Array.from(new Set(mistakes.map((m) => m.question.topic)))];

  const filteredMistakes = mistakes.filter((m) => {
    if (selectedSubject !== 'All' && m.question.subject !== selectedSubject) return false;
    if (selectedTopic !== 'All' && m.question.topic !== selectedTopic) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = m.question.questionText.toLowerCase().includes(q);
      const matchTopic = m.question.topic.toLowerCase().includes(q);
      const matchConcept = m.question.explanation.conceptNote.toLowerCase().includes(q);
      if (!matchText && !matchTopic && !matchConcept) return false;
    }
    return true;
  });

  const masteredCount = mistakes.filter((m) => m.isMastered).length;

  return (
    <div id="mind-maze-mistake-notebook" className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300 mb-2 backdrop-blur-md">
            <BookmarkCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Retain & Master Weak Areas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Mistake Notebook
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Questions you answered incorrectly are automatically organized with concise concept notes and step-by-step blueprints.
          </p>
        </div>

        {/* Review all mistakes button */}
        <div className="flex items-center gap-3">
          <button
            id="btn-review-all-mistakes"
            disabled={mistakes.length === 0}
            onClick={() => onStartReviewSession()}
            className={`group flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-xs font-bold text-white shadow-lg transition-all ${
              mistakes.length > 0
                ? 'bg-[#6B4EFF] hover:bg-[#7C5DFA] shadow-[0_0_15px_rgba(107,78,255,0.4)] hover:scale-105 cursor-pointer'
                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <RotateCcw className="w-4 h-4 transition-transform group-hover:-rotate-45" />
            <span>Review All Mistakes ({mistakes.length})</span>
          </button>
        </div>
      </div>

      {/* Progress & Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-400">Total Saved Errors</div>
            <div className="text-2xl font-black text-white">{mistakes.length} Questions</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <BookmarkCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-400">Mastered & Cleared</div>
            <div className="text-2xl font-black text-emerald-400">{masteredCount} Questions</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-400">Active Weak Concepts</div>
            <div className="text-2xl font-black text-purple-300">
              {allTopics.length > 1 ? allTopics.length - 1 : 0} Topics
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-400/30">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search saved errors by topic or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/10 border border-white/10 text-xs text-white placeholder-slate-400 focus:border-[#6B4EFF] focus:outline-none backdrop-blur-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-[#161831] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            {allSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="bg-[#161831] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none max-w-[160px]"
          >
            {allTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mistakes List */}
      <div className="space-y-4">
        {filteredMistakes.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400 backdrop-blur-md">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No active mistakes in this filter!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Either you've mastered these concepts or haven't attempted them yet in Practice Quiz.
            </p>
            <button
              onClick={() => onNavigate('practice')}
              className="mt-5 px-6 py-2.5 rounded-xl bg-[#6B4EFF] text-xs font-semibold text-white hover:bg-[#7C5DFA] shadow-[0_0_15px_rgba(107,78,255,0.4)]"
            >
              Start Practice Quiz
            </button>
          </div>
        ) : (
          filteredMistakes.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-3xl border transition-all duration-200 backdrop-blur-md ${
                  item.isMastered
                    ? 'border-emerald-500/30 bg-white/[0.03] opacity-75'
                    : 'border-white/10 bg-white/5 hover:border-[#6B4EFF]/50 shadow-sm'
                }`}
              >
                {/* Header item bar */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                        {item.question.subject}
                      </span>
                      <span className="text-slate-400 text-xs font-mono">{item.question.paperYear} A/L</span>
                      <span className="text-xs font-semibold text-cyan-300">
                        {item.question.topic}
                      </span>
                      {item.isMastered && (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Mastered ✓
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-white leading-relaxed line-clamp-2">
                      {item.question.questionText}
                    </h4>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Saved: {item.savedAt}</span>
                      <span>•</span>
                      <span className="text-rose-400 font-medium">
                        Your previous pick: Option {item.userSelectedOptionId}
                      </span>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleMastered(item.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        item.isMastered
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/40 hover:bg-white/10'
                      }`}
                    >
                      {item.isMastered ? 'Mastered ✓' : 'Mark Mastered'}
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-colors"
                    >
                      <span>{isExpanded ? 'Hide Lesson' : 'View Mini-Lesson'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => onDeleteMistake(item.id)}
                      title="Remove from notebook"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Mini-Lesson Card */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-6 bg-black/30 rounded-b-3xl space-y-5 animate-in fade-in duration-200">
                    {/* Correct Answer Highlight */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs">
                      <div>
                        <span className="text-emerald-400 font-bold">Verified Correct Answer:</span>
                        <span className="text-white font-semibold ml-2">
                          Option {item.question.explanation.correctOptionId} ({item.question.explanation.correctOptionText})
                        </span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>

                    {/* Concept Note */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>Core Concept Blueprint:</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5">
                        {item.question.explanation.conceptNote}
                      </p>
                    </div>

                    {/* Step-by-Step Method */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                        <ListOrdered className="w-3.5 h-3.5 text-purple-400" />
                        <span>Step-by-Step Method:</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-300">
                        {item.question.explanation.stepByStep.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <span className="text-cyan-300 font-bold">{idx + 1}.</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Personal Retention Note */}
                    {item.userNotes && (
                      <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-200">
                        <span className="font-bold">Student Note:</span> {item.userNotes}
                      </div>
                    )}

                    {/* Re-drill Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => onStartReviewSession([item.id])}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)]"
                      >
                        <span>Re-test This Question</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
