import React, { useState, useMemo } from 'react';
import { MediumType, PaperType, PastPaper, ScreenId, SyllabusType } from '../../types';
import { MOCK_PAST_PAPERS } from '../../data/mockData';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  Sparkles,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  Globe,
  FileText,
  Tag,
  ArrowUpDown,
  Clock,
  MessageCircle,
  Atom,
  FlaskConical,
  Dna,
  Laptop,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { ComingSoonModal } from '../ComingSoonModal';

interface PastPaperLibraryScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onLaunchPaperQuiz?: (paperId: string) => void;
}

export const PastPaperLibraryScreen: React.FC<PastPaperLibraryScreenProps> = ({
  onNavigate,
  onLaunchPaperQuiz,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [currentOnly, setCurrentOnly] = useState<boolean>(true); // Current Only toggle ON by default
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedMedium, setSelectedMedium] = useState<string>('All');
  const [selectedYearRange, setSelectedYearRange] = useState<string>('All');
  const [downloadModalPaper, setDownloadModalPaper] = useState<PastPaper | null>(null);
  const [comingSoonModalSubject, setComingSoonModalSubject] = useState<string | null>(null);

  const subjects = ['All', 'Physics', 'Chemistry', 'Biology', 'ICT', 'Combined Maths'];
  const paperTypes = ['All', 'MCQ', 'Structured', 'Essay'];
  const mediums = ['All', 'English', 'Sinhala', 'Tamil'];
  const yearRanges = ['All', '2026 (Model Papers)', '2020-2026', '2015-2019', '2010-2014', '2000-2009'];

  const filteredPapers = useMemo(() => {
    return MOCK_PAST_PAPERS.filter((paper) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = paper.title.toLowerCase().includes(query);
        const matchSubject = paper.subject.toLowerCase().includes(query);
        const matchTags = paper.topicTags.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchSubject && !matchTags) return false;
      }

      // Subject
      if (selectedSubject !== 'All' && paper.subject !== selectedSubject) {
        return false;
      }

      // Syllabus "Current Only" filter
      if (currentOnly && paper.syllabus !== 'current') {
        return false;
      }

      // Paper Type
      if (selectedType !== 'All' && paper.type !== selectedType) {
        return false;
      }

      // Medium
      if (selectedMedium !== 'All' && paper.medium !== selectedMedium) {
        return false;
      }

      // Year range
      if (selectedYearRange !== 'All') {
        if (selectedYearRange.includes('2026')) {
          if (paper.year !== 2026 && !paper.isModelPaper) return false;
        } else {
          const [start, end] = selectedYearRange.split('-').map(Number);
          if (paper.year < start || paper.year > end) {
            return false;
          }
        }
      }

      return true;
    });
  }, [searchQuery, selectedSubject, currentOnly, selectedType, selectedMedium, selectedYearRange]);

  return (
    <div id="mind-maze-past-paper-library" className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-300 mb-2 backdrop-blur-md">
            <BookOpen className="w-3.5 h-3.5 text-cyan-300" />
            <span>Sri Lankan GCE A/L Archives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Past Paper MCQs (2000 to 2026)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real GCE A/L exam past papers and official 2026 Model Papers from 2000 to 2026 with step-by-step verified explanations.
          </p>
        </div>

        {/* Current Syllabus toggle */}
        <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl p-2.5 px-4 backdrop-blur-md shadow-sm">
          <div className="text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Current Syllabus Only</span>
              <span className="text-[10px] bg-purple-500/20 border border-purple-400/30 text-purple-300 px-1.5 py-0.5 rounded">
                2019+
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Hides legacy curriculum papers</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={currentOnly}
            onClick={() => setCurrentOnly(!currentOnly)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              currentOnly ? 'bg-[#6B4EFF] shadow-[0_0_10px_rgba(107,78,255,0.4)]' : 'bg-white/20'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                currentOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Subject Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 mr-1">Subject:</span>
        {[
          { id: 'All', label: 'All Subjects', isLive: true },
          { id: 'Physics', label: 'Physics', isLive: true, badge: '⚡ Live' },
          { id: 'Chemistry', label: 'Chemistry', isLive: false, badge: '⏳ Soon' },
          { id: 'Biology', label: 'Biology', isLive: false, badge: '⏳ Soon' },
          { id: 'ICT', label: 'ICT', isLive: false, badge: '⏳ Soon' },
          { id: 'Combined Maths', label: 'Combined Maths', isLive: false, badge: '⏳ Soon' },
        ].map((tab) => {
          const isSelected = selectedSubject === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedSubject(tab.id);
                if (!tab.isLive && tab.id !== 'All') {
                  setComingSoonModalSubject(tab.id);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#6B4EFF] border-[#8B5CF6] text-white shadow-[0_0_12px_rgba(107,78,255,0.4)]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    tab.isLive
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                      : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Non-Physics Coming Soon Notice Card if non-physics subject is selected */}
      {selectedSubject !== 'All' && selectedSubject !== 'Physics' && (
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 p-6 backdrop-blur-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <Clock className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedSubject} Past Paper Archives Coming Soon</span>
                  <span className="text-[10px] uppercase tracking-wider bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    In Production
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Official GCE A/L past papers (2000–2026) with verified step-by-step marking schemes for <strong>{selectedSubject}</strong> are actively being compiled.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setSelectedSubject('Physics')}
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

      {/* Filter Bar Controls */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 backdrop-blur-md space-y-4 shadow-sm">
        {/* Search row */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search past papers by topic (e.g., Projectile, Equilibrium, Integration)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-sm text-white placeholder-slate-400 focus:border-[#6B4EFF] focus:outline-none backdrop-blur-sm"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Subject Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-[#161831] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Paper Type */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Paper Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#161831] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              {paperTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Medium */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Medium
            </label>
            <select
              value={selectedMedium}
              onChange={(e) => setSelectedMedium(e.target.value)}
              className="w-full bg-[#161831] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              {mediums.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year Range */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Year Era
            </label>
            <select
              value={selectedYearRange}
              onChange={(e) => setSelectedYearRange(e.target.value)}
              className="w-full bg-[#161831] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              {yearRanges.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count & Quick Tags */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{filteredPapers.length}</strong> past papers
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Active Filters:</span>
          {selectedSubject !== 'All' && (
            <span className="bg-purple-500/20 border border-purple-400/30 text-purple-300 px-2 py-0.5 rounded-full text-[10px]">
              {selectedSubject}
            </span>
          )}
          {currentOnly && (
            <span className="bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 px-2 py-0.5 rounded-full text-[10px]">
              Current Only
            </span>
          )}
        </div>
      </div>

      {/* Papers Table */}
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                <th className="py-4 px-5 font-bold">Paper Title & Year</th>
                <th className="py-4 px-4 font-bold">Subject & Medium</th>
                <th className="py-4 px-4 font-bold">Topics Tested</th>
                <th className="py-4 px-4 font-bold">Explanations</th>
                <th className="py-4 px-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-300">No past papers found matching the active filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try turning off "Current Syllabus Only" or adjusting your search keyword.</p>
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => (
                  <tr key={paper.id} className="hover:bg-white/[0.04] transition-colors">
                    {/* Title & Year */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-white text-sm flex flex-wrap items-center gap-2">
                        <span>{paper.title}</span>
                        {(paper.year === 2026 || paper.isModelPaper) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold tracking-wide uppercase shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            Model Paper
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="font-mono text-purple-300 font-semibold">
                          {paper.year === 2026 || paper.isModelPaper ? '2026 Practice Paper' : `${paper.year} Examination`}
                        </span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          paper.syllabus === 'current'
                            ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                            : 'bg-white/10 text-slate-400'
                        }`}>
                          {paper.syllabus === 'current' ? 'Current Syllabus' : 'Old Syllabus'}
                        </span>
                        <span>•</span>
                        <span>{paper.questionCount} Questions</span>
                      </div>
                    </td>

                    {/* Subject & Medium */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-200">{paper.subject}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Globe className="w-3 h-3 text-cyan-300" />
                        <span>{paper.medium} Medium</span>
                      </div>
                    </td>

                    {/* Topic Tags */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {paper.topicTags.map((tag, i) => (
                          <span
                            key={i}
                            className="bg-white/10 border border-white/10 text-slate-300 px-2 py-0.5 rounded-md text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Explanation Badge */}
                    <td className="py-4 px-4">
                      {paper.hasExplanation ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Explanation Available
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Answer Key Only</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right space-x-2">
                      <button
                        onClick={() => {
                          if (onLaunchPaperQuiz) {
                            onLaunchPaperQuiz(paper.id);
                          } else {
                            onNavigate('practice');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_12px_rgba(107,78,255,0.4)] transition-all active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Practice</span>
                      </button>

                      <button
                        onClick={() => setDownloadModalPaper(paper)}
                        title="Download PDF"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Download Simulation Modal */}
      {downloadModalPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#161831]/95 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-white text-base">Download Past Paper</h3>
              </div>
              <button
                onClick={() => setDownloadModalPaper(null)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="font-bold text-white">{downloadModalPaper.title}</h4>
              <p className="text-xs text-slate-400 mt-1">
                Official Department of Examinations format with AI Step-by-Step Annotated Marking Scheme.
              </p>
            </div>

            <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="font-mono text-purple-300">{downloadModalPaper.downloadSize}</span>
              </div>
              <div className="flex justify-between">
                <span>Medium:</span>
                <span className="font-semibold text-white">{downloadModalPaper.medium}</span>
              </div>
              <div className="flex justify-between">
                <span>Verified Solution:</span>
                <span className="text-emerald-400 font-semibold">Included (PDF)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setDownloadModalPaper(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] transition-all cursor-pointer"
              >
                Download PDF
              </button>
              <button
                onClick={() => setDownloadModalPaper(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-xs font-semibold text-slate-300 hover:bg-white/20 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={!!comingSoonModalSubject}
        subjectName={comingSoonModalSubject || ''}
        onClose={() => setComingSoonModalSubject(null)}
        onNavigateToPhysics={() => {
          setSelectedSubject('Physics');
          setComingSoonModalSubject(null);
        }}
      />
    </div>
  );
};
