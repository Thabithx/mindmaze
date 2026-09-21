import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SyllabusTopic, StreamType, TopicStatus, DailyTask } from '../../types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  ChevronDown,
  Sparkles,
  Layers,
  HelpCircle,
  BarChart3,
  X,
  Trash2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import {
  getSubjectsForStream,
  getCombinedMathsGroup,
} from '../../data/alSyllabusData';
import {
  calculateTopicProgress,
  calculateSubjectProgression,
  getSubtopicProgressValue,
} from '../../lib/syllabusProgression';
import { SubjectIcon } from '../common/SubjectIcon';

interface TopicTrackerProps {
  topics: SyllabusTopic[];
  stream: StreamType;
  physicalScienceElective?: 'Chemistry' | 'ICT';
  dailyTasks?: DailyTask[];
  userId?: string;
  onUpdateTopicStatus: (topicId: string, status: TopicStatus) => void;
  onToggleSubtopic: (topicId: string, subtopicTitle: string) => void;
  onAddCustomTopic: (topic: Omit<SyllabusTopic, 'id'>) => void;
}

export const TopicTracker: React.FC<TopicTrackerProps> = ({
  topics,
  stream,
  physicalScienceElective,
  dailyTasks = [],
  userId,
  onUpdateTopicStatus,
  onToggleSubtopic,
  onAddCustomTopic,
}) => {
  const availableSubjectMetas = getSubjectsForStream(stream, physicalScienceElective);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    availableSubjectMetas[0]?.name || 'Combined Mathematics'
  );

  // Keep selected subject valid when stream or elective changes
  useEffect(() => {
    if (!availableSubjectMetas.some((s) => s.name === selectedSubject)) {
      setSelectedSubject(availableSubjectMetas[0]?.name || 'Physics');
    }
  }, [stream, physicalScienceElective, availableSubjectMetas, selectedSubject]);

  const [statusFilter, setStatusFilter] = useState<'all' | TopicStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  // Add custom topic modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState(selectedSubject);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState(1);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [subtopicsCount, setSubtopicsCount] = useState(3);
  const [subtopicInputs, setSubtopicInputs] = useState<string[]>(['', '', '']);

  // ── One-time onboarding modal (mark pre-existing completed topics) ──────────
  const effectiveUserId = userId || 'default_user';
  const onboardingKey = `mm_syllabus_onboarded_${effectiveUserId}`;
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState<Set<string>>(new Set());
  const [onboardingSubtopicChecked, setOnboardingSubtopicChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!localStorage.getItem(onboardingKey)) {
      setShowOnboarding(true);
    }
  }, [onboardingKey]);

  const handleOnboardingSubmit = () => {
    // Mark all checked topics as completed
    const safeAll = topics || [];
    onboardingChecked.forEach((topicId) => {
      const topic = safeAll.find((t) => t.id === topicId);
      if (topic) {
        onUpdateTopicStatus(topicId, 'completed');
      }
    });
    // Mark checked subtopics
    onboardingSubtopicChecked.forEach((key) => {
      const [topicId, subtopic] = key.split('|||');
      if (topicId && subtopic) {
        onToggleSubtopic(topicId, subtopic);
      }
    });
    localStorage.setItem(onboardingKey, 'done');
    setShowOnboarding(false);
  };

  const toggleOnboardingTopic = (topicId: string) => {
    setOnboardingChecked((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const toggleOnboardingSubtopic = (topicId: string, subtopic: string) => {
    const key = `${topicId}|||${subtopic}`;
    setOnboardingSubtopicChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Task-gating: topic can only be marked if a daily task exists for it ─────
  const topicHasTask = (topicId: string, topicTitle?: string): boolean => {
    const safeTasks = dailyTasks || [];
    const normalizedTopicTitle = (topicTitle || '').trim().toLowerCase();
    return safeTasks.some((t) => {
      if (!t) return false;
      if (t.topicId && t.topicId === topicId) return true;
      if (topicTitle && t.topicTitle && t.topicTitle.trim().toLowerCase() === normalizedTopicTitle) return true;
      if (topicTitle && t.title && t.title.trim().toLowerCase().includes(normalizedTopicTitle)) return true;
      return false;
    });
  };

  useEffect(() => {
    setNewSubject(selectedSubject);
  }, [selectedSubject]);

  const handleSubtopicCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(15, count));
    setSubtopicsCount(validCount);
    setSubtopicInputs((prev) => {
      const next = [...prev];
      while (next.length < validCount) next.push('');
      return next.slice(0, validCount);
    });
  };

  const handleSubtopicInputChange = (index: number, val: string) => {
    setSubtopicInputs((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // Current Subject topics & calculation with subtopics breakdown
  const safeTopics = topics || [];
  const currentSubjectTopics = safeTopics.filter((t) => t && t.subject === selectedSubject);
  const subjectProgression = calculateSubjectProgression(selectedSubject, safeTopics);
  const totalCount = subjectProgression.totalTopics;
  const completedCount = subjectProgression.completedTopics;
  const inProgressCount = subjectProgression.inProgressTopics;
  const notStartedCount = subjectProgression.notStartedTopics;
  const percentage = subjectProgression.percentage;

  // Filtered topics
  const displayedTopics = currentSubjectTopics.filter((t) => {
    if (!t) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (t.topicTitle || '').toLowerCase().includes(q);
      const matchUnit = (t.unitTitle || '').toLowerCase().includes(q);
      const matchSub = t.subtopics?.some((s) => (s || '').toLowerCase().includes(q));
      if (!matchTitle && !matchUnit && !matchSub) return false;
    }
    return true;
  });

  type TopicListRow =
    | { kind: 'group'; key: string; title: string; paper: string; range: string; topics: SyllabusTopic[] }
    | { kind: 'topic'; topic: SyllabusTopic };
  const isCombinedMathsSelected = selectedSubject === 'Combined Mathematics';
  const topicRows: TopicListRow[] = (() => {
    if (!isCombinedMathsSelected) return displayedTopics.map((topic) => ({ kind: 'topic' as const, topic }));
    const groups = [
      { key: 'pure', title: 'Pure Mathematics', paper: 'Paper I', range: 'Units 1–11' },
      { key: 'applied', title: 'Applied Mathematics', paper: 'Paper II', range: 'Units 12–18' },
    ];
    const rows: TopicListRow[] = [];
    for (const g of groups) {
      const groupTopics = displayedTopics.filter((t) => getCombinedMathsGroup(t) === g.title);
      if (groupTopics.length === 0) continue;
      rows.push({ kind: 'group', ...g, topics: groupTopics });
      for (const topic of groupTopics) rows.push({ kind: 'topic', topic });
    }
    return rows;
  })();

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    const subtopics = subtopicInputs
      .map((s) => s.trim())
      .filter(Boolean);

    onAddCustomTopic({
      subject: newSubject || selectedSubject,
      unitNumber: newUnitNumber,
      unitTitle: newUnitTitle.trim() || `Unit ${newUnitNumber}`,
      topicTitle: newTopicTitle.trim(),
      subtopics: subtopics.length > 0 ? subtopics : undefined,
      status: 'not_started',
    });

    setNewTopicTitle('');
    setNewUnitTitle('');
    setSubtopicInputs(['', '', '']);
    setSubtopicsCount(3);
    setIsAddModalOpen(false);
  };

  return (
    <div id="topic-tracker-view" className="space-y-6 max-w-6xl mx-auto pb-8 select-none">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-white/15">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-2 backdrop-blur-md">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sri Lankan GCE A/L Syllabus Tracker</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              Topic Tracker by Subject
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Systematically check off units, theory modules, and practical competencies to ensure zero syllabus gaps.
            </p>
          </div>
        </div>
      </div>

      {/* Stream Indicator Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-xs">
        <div className="flex items-center gap-2.5">
          <SubjectIcon subject={selectedSubject} className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">{stream} Stream</span>
            <span className="text-slate-400">
              Active Programme: {availableSubjectMetas.map((s) => s.name).join(' • ')}
            </span>
          </div>
        </div>
      </div>

      {/* Subject Tabs Row with + Add Custom Topic Button */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {availableSubjectMetas.map((s) => {
          const isSelected = selectedSubject === s.name;
          const sTopics = topics.filter((t) => t.subject === s.name);
          const sCompleted = sTopics.filter((t) => t.status === 'completed').length;
          const sPercent = sTopics.length === 0 ? 0 : Math.round((sCompleted / sTopics.length) * 100);

          return (
            <button
              key={s.id}
              id={`subject-tab-${s.id}`}
              onClick={() => {
                setSelectedSubject(s.name);
                setExpandedTopicId(null);
              }}
              className={`flex-shrink-0 flex flex-col gap-1.5 px-4 py-3 rounded-2xl border transition cursor-pointer min-w-[150px] sm:min-w-[170px] min-h-[58px] text-left ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-500 shadow-[0_0_20px_rgba(107,78,255,0.35)]'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <SubjectIcon subject={s.name} className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {sPercent}%
                </span>
              </div>
              <span className="text-xs font-bold text-white line-clamp-1">{s.name}</span>
            </button>
          );
        })}

        {/* Add Custom Topic Button placed next to the subjects */}
        <button
          onClick={() => {
            setNewSubject(selectedSubject);
            setIsAddModalOpen(true);
          }}
          id="btn-add-custom-topic"
          className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-indigo-400/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white text-xs font-bold transition cursor-pointer min-h-[58px] shadow-sm hover:scale-105 active:scale-95"
          title="Add custom syllabus topic or unit"
        >
          <Plus className="w-4 h-4" />
          <span>Add Unit / Topic</span>
        </button>
      </div>

      {/* Current Subject Progress Card */}
      <div className="glass-card rounded-3xl p-5 sm:p-7 shadow-xl border border-white/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <SubjectIcon subject={selectedSubject} className="w-6 h-6 text-indigo-400" />
              <h2 className="text-lg sm:text-2xl font-black text-white">{selectedSubject}</h2>
            </div>
            <p className="text-xs text-slate-300">
              {completedCount} Completed • {inProgressCount} In Progress • {notStartedCount} Not Started
            </p>
          </div>

          <div className="flex items-baseline gap-2 shrink-0">
            <span className="text-3xl sm:text-4xl font-black text-cyan-300">{percentage}%</span>
            <span className="text-xs font-bold text-slate-400 uppercase">Covered</span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-400 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(0,245,255,0.6)]"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Quick status filter counters */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <button
              onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
              }`}
            >
              <span className="text-sm sm:text-base font-bold text-emerald-400 block">{completedCount}</span>
              <span className="text-[10px] font-semibold uppercase">Completed</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-amber-500/20 border-amber-400/50 text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
              }`}
            >
              <span className="text-sm sm:text-base font-bold text-amber-400 block">{inProgressCount}</span>
              <span className="text-[10px] font-semibold uppercase">In Progress</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'not_started' ? 'all' : 'not_started')}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                statusFilter === 'not_started'
                  ? 'bg-slate-500/20 border-slate-400/50 text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
              }`}
            >
              <span className="text-sm sm:text-base font-bold text-slate-400 block">{notStartedCount}</span>
              <span className="text-[10px] font-semibold uppercase">Not Started</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="pt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${selectedSubject} units and subtopics...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* Topic Cards List */}
      <div className="space-y-3">
        {topicRows.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/10">
            <p className="text-sm text-slate-400">No syllabus units match your filter or search.</p>
          </div>
        ) : (
          topicRows.map((row) => {
            if (row.kind === 'group') {
              return (
                <div key={row.key} className="pt-4 pb-1">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                      {row.title} ({row.paper})
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">{row.range}</span>
                  </div>
                </div>
              );
            }

            const topic = row.topic;
            const isExpanded = expandedTopicId === topic.id;
            const subs = topic.subtopics || [];
            const hasTask = topicHasTask(topic.id, topic.topicTitle);

            return (
              <div
                key={topic.id}
                className={`glass-card rounded-2xl border transition-all p-4 ${
                  topic.status === 'completed'
                    ? 'border-emerald-500/30 bg-emerald-950/15'
                    : topic.status === 'in_progress'
                    ? 'border-amber-500/30 bg-amber-950/15'
                    : 'border-white/10 hover:border-indigo-400/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 border border-white/10">
                        Unit {topic.unitNumber}{topic.unitTitle && topic.unitTitle.trim().toLowerCase() !== topic.topicTitle.trim().toLowerCase() ? `: ${topic.unitTitle}` : ''}
                      </span>
                      {!hasTask && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                          <Lock className="w-3 h-3" />
                          <span className="hidden sm:inline">Add a daily task to unlock</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {topic.topicTitle}
                    </h3>
                  </div>

                  {/* Status Buttons — task-gated */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {hasTask ? (
                      <>
                        <button
                          onClick={() => onUpdateTopicStatus(topic.id, 'completed')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] ${
                            topic.status === 'completed'
                              ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                              : 'bg-white/5 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </button>

                        <button
                          onClick={() => onUpdateTopicStatus(topic.id, 'in_progress')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] ${
                            topic.status === 'in_progress'
                              ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                              : 'bg-white/5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress</span>
                        </button>

                        <button
                          onClick={() => onUpdateTopicStatus(topic.id, 'not_started')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] ${
                            topic.status === 'not_started'
                              ? 'bg-slate-700 text-white'
                              : 'bg-white/5 text-slate-500 hover:text-white'
                          }`}
                        >
                          Not Started
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Create a task first</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtopics Accordion Toggle */}
                {subs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Subtopic Breakdown ({subs.length} competencies)</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subs.map((sub) => {
                          const progressVal = getSubtopicProgressValue(topic, sub);
                          const isDone = progressVal >= 100;
                          return (
                            <div
                              key={sub}
                              onClick={() => hasTask && onToggleSubtopic(topic.id, sub)}
                              className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 text-xs ${
                                hasTask
                                  ? isDone
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 cursor-pointer'
                                    : 'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-400/40 cursor-pointer'
                                  : 'bg-white/5 border-white/10 text-slate-400 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {hasTask ? (
                                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDone ? 'text-emerald-400' : 'text-slate-500'}`} />
                                ) : (
                                  <Lock className="w-4 h-4 shrink-0 text-amber-400/50" />
                                )}
                                <span className="truncate">{sub}</span>
                              </div>
                              <span className="text-[10px] font-bold text-cyan-300 shrink-0">{progressVal}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Add Custom Topic Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-indigo-500/40 bg-[#161831] shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#161831] shrink-0">
              <div className="flex items-center gap-2 text-base font-bold text-white">
                <Plus className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>Add Syllabus Unit & Topic</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs overscroll-contain">
                {/* 1. Select Subject First */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Select Subject <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white font-medium focus:border-cyan-400 focus:outline-none"
                  >
                    {availableSubjectMetas.map((s) => (
                      <option key={s.id} value={s.name} className="bg-[#161831] text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Unit Number & Unit Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Unit Number</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={newUnitNumber}
                      onChange={(e) => setNewUnitNumber(Number(e.target.value))}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white font-medium focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Unit Name / Module</label>
                    <input
                      type="text"
                      placeholder="e.g. Electromagnetism & AC"
                      value={newUnitTitle}
                      onChange={(e) => setNewUnitTitle(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white font-medium focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Topic Title */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Topic / Lesson Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electromagnetic Induction & Transformers"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 font-medium focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* 4. Subtopics count selector + Dynamic typing boxes */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold">
                      Subtopic Count & Competency Breakdown
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleSubtopicCountChange(num)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                            subtopicsCount === num
                              ? 'bg-cyan-500 text-slate-950 shadow'
                              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Type each subtopic name below (individual tickable lessons):
                  </p>

                  <div className="space-y-2">
                    {subtopicInputs.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 w-5 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder={`Subtopic ${idx + 1} (e.g. Faraday's Law)`}
                          value={sub}
                          onChange={(e) => handleSubtopicInputChange(idx, e.target.value)}
                          className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white placeholder-slate-500 text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-[#14162e]/95 backdrop-blur-md flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 font-semibold transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] text-white font-bold transition shadow-lg cursor-pointer min-h-[44px]"
                >
                  Add Topic & Lessons
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── One-Time Onboarding Modal ─────────────────────────────────────── */}
      {showOnboarding && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[110] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-indigo-500/40 bg-[#161831] shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#161831] shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-base font-bold text-white">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>First-Time Setup: Mark Already Completed Units</span>
                </div>
                <p className="text-xs text-slate-400">
                  Tick any units or subtopics you've already finished. This one-time setup sets your baseline progress.
                </p>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain">
              {availableSubjectMetas.map((subjectMeta) => {
                const subjectTopics = safeTopics.filter((t) => t.subject === subjectMeta.name);
                if (subjectTopics.length === 0) return null;
                return (
                  <div key={subjectMeta.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-300 pt-1 pb-1 border-b border-white/10">
                      <SubjectIcon subject={subjectMeta.name} className="w-3.5 h-3.5" />
                      <span>{subjectMeta.name}</span>
                    </div>
                    {subjectTopics.map((topic) => {
                      const checked = onboardingChecked.has(topic.id);
                      return (
                        <div key={topic.id} className="space-y-1.5">
                          <div
                            onClick={() => toggleOnboardingTopic(topic.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              checked
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:border-indigo-400/40'
                            }`}
                          >
                            <CheckCircle2 className={`w-4 h-4 shrink-0 ${checked ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className="font-semibold">Unit {topic.unitNumber}: {topic.topicTitle}</span>
                          </div>
                          {topic.subtopics && topic.subtopics.length > 0 && checked && (
                            <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {topic.subtopics.map((sub) => {
                                const subKey = `${topic.id}|||${sub}`;
                                const subChecked = onboardingSubtopicChecked.has(subKey);
                                return (
                                  <div
                                    key={sub}
                                    onClick={() => toggleOnboardingSubtopic(topic.id, sub)}
                                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition text-xs ${
                                      subChecked
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                    }`}
                                  >
                                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${subChecked ? 'text-emerald-400' : 'text-slate-600'}`} />
                                    <span className="truncate">{sub}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-[#14162e]/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-slate-400">
                {onboardingChecked.size} unit{onboardingChecked.size !== 1 ? 's' : ''} marked as completed
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onboardingKey) localStorage.setItem(onboardingKey, 'done');
                    setShowOnboarding(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 font-semibold transition cursor-pointer min-h-[44px] text-xs"
                >
                  Skip (Start Fresh)
                </button>
                <button
                  type="button"
                  onClick={handleOnboardingSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold transition shadow-lg cursor-pointer min-h-[44px] text-xs"
                >
                  Save My Progress
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
