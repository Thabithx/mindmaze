import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  BookOpen,
  FileText,
  CheckSquare,
  Sparkles,
  ArrowRight,
  X,
  Clock,
} from 'lucide-react';
import { ScreenId, SyllabusTopic, PastPaper, Question, DailyTask } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
  syllabusTopics?: SyllabusTopic[];
  pastPapers?: PastPaper[];
  quizQuestions?: Question[];
  tasks?: DailyTask[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  syllabusTopics = [],
  pastPapers = [],
  quizQuestions = [],
  tasks = [],
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedTopics = q
    ? syllabusTopics.filter(
        (t) =>
          t.topicTitle.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.subtopics && t.subtopics.some((s) => s.toLowerCase().includes(q)))
      ).slice(0, 5)
    : [];

  const matchedPapers = q
    ? pastPapers.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          String(p.year).includes(q)
      ).slice(0, 4)
    : [];

  const matchedQuizzes = q
    ? quizQuestions.filter(
        (question) =>
          question.questionText.toLowerCase().includes(q) ||
          question.subject.toLowerCase().includes(q) ||
          (question.topic && question.topic.toLowerCase().includes(q))
      ).slice(0, 4)
    : [];

  const matchedTasks = q
    ? tasks.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.topicTitle && t.topicTitle.toLowerCase().includes(q)) ||
          t.subject.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const totalResults = matchedTopics.length + matchedPapers.length + matchedQuizzes.length + matchedTasks.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-white/20 bg-[#14162e] shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-[#191b3b]">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, past papers, quiz MCQs, or study tasks... (Esc to close)"
            className="w-full bg-transparent text-sm sm:text-base font-semibold text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-1 rounded-md bg-white/10 text-slate-400 border border-white/10 shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!q ? (
            <div className="text-center py-10 space-y-2">
              <Search className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-400">
                Type anything to search across Mind Maze A/L Hub
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {['Physics Mechanics', 'Organic Chemistry', 'Calculus', '2024 Past Paper'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-cyan-300 hover:bg-white/10 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-sm font-bold">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-500 mt-1">Try searching by subject, paper year, or topic name.</p>
            </div>
          ) : (
            <>
              {/* Syllabus Topics */}
              {matchedTopics.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 px-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Syllabus Topics ({matchedTopics.length})</span>
                  </div>
                  {matchedTopics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => {
                        onNavigate('topics');
                        onClose();
                      }}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/50 hover:bg-white/10 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          Unit {topic.unitNumber}: {topic.topicTitle}
                        </p>
                        <p className="text-[11px] text-slate-400">{topic.subject} • {topic.status}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              )}

              {/* Past Papers */}
              {matchedPapers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 px-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Past Papers ({matchedPapers.length})</span>
                  </div>
                  {matchedPapers.map((paper) => (
                    <div
                      key={paper.id}
                      onClick={() => {
                        onNavigate('past-papers');
                        onClose();
                      }}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                          {paper.title} ({paper.year})
                        </p>
                        <p className="text-[11px] text-slate-400">{paper.subject} • {paper.medium} Medium</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              )}

              {/* Quiz Questions */}
              {matchedQuizzes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 px-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Practice Quiz Questions ({matchedQuizzes.length})</span>
                  </div>
                  {matchedQuizzes.map((qItem) => (
                    <div
                      key={qItem.id}
                      onClick={() => {
                        onNavigate('quiz');
                        onClose();
                      }}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {qItem.questionText}
                        </p>
                        <p className="text-[11px] text-slate-400">{qItem.subject} • {qItem.topic}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 px-5 border-t border-white/10 bg-[#111226] flex items-center justify-between text-[11px] text-slate-500">
          <span>Press <kbd className="font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">ESC</kbd> or click outside to dismiss</span>
          <span className="font-semibold text-cyan-400">Mind Maze AI Search</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
