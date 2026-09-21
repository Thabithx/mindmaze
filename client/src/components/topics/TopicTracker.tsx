import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SyllabusTopic, TopicStatus, StreamType } from '../../types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Circle,
  Search,
  Filter,
  Plus,
  BarChart,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { SUBJECT_METAS, getSubjectsForStream, getCombinedMathsGroup } from '../../data/alSyllabusData';
import {
  calculateSubjectProgression,
  calculateTopicProgress,
  getSubtopicProgressValue,
} from '../../lib/syllabusProgression';

interface TopicTrackerProps {
  topics: SyllabusTopic[];
  stream: StreamType;
  /** Read-only elective (no picker here; change in Settings → Study Programme). */
  physicalScienceElective?: 'Chemistry' | 'ICT';
  onUpdateTopicStatus: (topicId: string, status: TopicStatus) => void;
  onToggleSubtopic?: (topicId: string, subtopicTitle: string) => void;
  onAddCustomTopic: (topic: Omit<SyllabusTopic, 'id'>) => void;
  onNavigateToDailyPlanner?: () => void;
}

export const TopicTracker: React.FC<TopicTrackerProps> = ({
  topics,
  stream,
  physicalScienceElective = 'Chemistry',
  onUpdateTopicStatus,
  onToggleSubtopic,
  onAddCustomTopic,
  onNavigateToDailyPlanner,
}) => {
  // Available subjects for the active stream:
  // - Physical Science: Combined Mathematics, Physics, and (Chemistry OR ICT)
  // - Biological Science: Biology, Chemistry, Physics (Combined Maths replaced with Biology)
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
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState(1);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newSubtopicsText, setNewSubtopicsText] = useState('');

  // Current Subject topics & calculation with subtopics breakdown
  const currentSubjectTopics = topics.filter((t) => t.subject === selectedSubject);
  const subjectProgression = calculateSubjectProgression(selectedSubject, topics);
  const totalCount = subjectProgression.totalTopics;
  const completedCount = subjectProgression.completedTopics;
  const inProgressCount = subjectProgression.inProgressTopics;
  const notStartedCount = subjectProgression.notStartedTopics;
  const percentage = subjectProgression.percentage;

  // Filtered topics
  const displayedTopics = currentSubjectTopics.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.topicTitle.toLowerCase().includes(q);
      const matchUnit = t.unitTitle.toLowerCase().includes(q);
      const matchSub = t.subtopics?.some((s) => s.toLowerCase().includes(q));
      if (!matchTitle && !matchUnit && !matchSub) return false;
    }
    return true;
  });

  // Combined Mathematics paper split — Units 1–11 Pure (Paper I),
  // Units 12+ Applied (Paper II). Groups respect the active search/filter
  // (empty groups are hidden); other subjects render as one flat list.
  type TopicListRow =
    | { kind: 'group'; key: string; title: string; paper: string; range: string; icon: string; topics: SyllabusTopic[] }
    | { kind: 'topic'; topic: SyllabusTopic };
  const isCombinedMathsSelected = selectedSubject === 'Combined Mathematics';
  const topicRows: TopicListRow[] = (() => {
    if (!isCombinedMathsSelected) return displayedTopics.map((topic) => ({ kind: 'topic' as const, topic }));
    const groups = [
      { key: 'pure', title: 'Pure Mathematics', paper: 'Paper I', range: 'Units 1–11', icon: '📐' },
      { key: 'applied', title: 'Applied Mathematics', paper: 'Paper II', range: 'Units 12–18', icon: '📊' },
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

  const groupStats = (ts: SyllabusTopic[]) => {
    let points = 0;
    let total = 0;
    let done = 0;
    ts.forEach((t) => {
      const p = calculateTopicProgress(t);
      const subs = t.subtopics && t.subtopics.length > 0 ? t.subtopics.length : 1;
      total += subs;
      points += (p.percentage / 100) * subs;
      if (p.isCompleted) done++;
    });
    return {
      percentage: total > 0 ? Math.round((points / total) * 100) : 0,
      completed: done,
      total: ts.length,
    };
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    const subtopics = newSubtopicsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    onAddCustomTopic({
      subject: selectedSubject,
      unitNumber: newUnitNumber,
      unitTitle: newUnitTitle.trim() || `Unit ${newUnitNumber}`,
      topicTitle: newTopicTitle.trim(),
      subtopics: subtopics.length > 0 ? subtopics : undefined,
      status: 'not_started',
    });

    setNewTopicTitle('');
    setNewUnitTitle('');
    setNewSubtopicsText('');
    setIsAddModalOpen(false);
  };

  const currentMeta = SUBJECT_METAS.find((s) => s.name === selectedSubject);

  return (
    <div id="topic-tracker-view" className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161831] via-[#12142B] to-[#0F1023] p-4 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-2">
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

        <button
          onClick={() => setIsAddModalOpen(true)}
          id="btn-add-custom-topic"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer min-h-[44px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Topic</span>
        </button>
      </div>

      {/* Stream & Elective Indicator Banner (read-only; change in Settings) */}
      {(stream === 'Physical Science' || (stream as string) === 'Maths') && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-sm">📐</span>
            <div>
              <span className="text-xs font-bold text-white block">Physical Science Stream</span>
              <span className="text-[11px] text-slate-400">
                Combined Maths & Physics are compulsory. Your 3rd subject:{' '}
                <strong className="text-slate-200">
                  {physicalScienceElective === 'ICT' ? '💻 ICT' : '🧪 Chemistry'}
                </strong>{' '}
                (change in Settings → Study Programme)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Biological Science Indicator */}
      {(stream === 'Biological Science' || (stream as string) === 'Bio') && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200">
          <span className="text-base">🔬</span>
          <div>
            <strong className="text-white block font-bold">Biological Science Stream</strong>
            <span className="text-emerald-300/80">Subjects: Biology, Chemistry, and Physics. (Combined Maths replaced with Biology).</span>
          </div>
        </div>
      )}

      {/* Subject Tabs Selector (Large, touch-friendly) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
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
              className={`flex-shrink-0 flex flex-col gap-1 px-4 py-3 rounded-2xl border transition cursor-pointer min-w-[150px] sm:min-w-[170px] min-h-[56px] text-left ${
                isSelected
                  ? 'bg-[#1E1949] border-[#6B4EFF] shadow-[0_0_20px_rgba(107,78,255,0.3)]'
                  : 'bg-[#161831]/70 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{s.icon}</span>
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-[#6B4EFF] text-white' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {sPercent}%
                </span>
              </div>
              <span className="text-xs font-bold text-white line-clamp-1">{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* Current Subject Progress Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#171A38] to-[#12142B] p-5 sm:p-6 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentMeta?.icon || '📚'}</span>
              <h2 className="text-lg sm:text-2xl font-black text-white">{selectedSubject}</h2>
            </div>
            <p className="text-xs text-slate-300">
              {completedCount} Completed • {inProgressCount} In Progress • {notStartedCount} Not Started
            </p>
          </div>

          <div className="flex items-baseline gap-2 shrink-0">
            <span className="text-3xl sm:text-4xl font-black text-cyan-300">{percentage}%</span>
            <span className="text-xs font-bold text-slate-400 uppercase">Syllabus Covered</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] via-purple-400 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(0,245,255,0.6)]"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Quick status counters */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-4 text-center">
            <button
              onClick={() => setStatusFilter('completed')}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-500/20 border-emerald-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-sm sm:text-base font-bold text-emerald-400 block">{completedCount}</span>
              <span className="text-[10px] font-semibold text-slate-300 uppercase">Completed</span>
            </button>

            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-amber-500/20 border-amber-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-sm sm:text-base font-bold text-amber-400 block">{inProgressCount}</span>
              <span className="text-[10px] font-semibold text-slate-300 uppercase">In Progress</span>
            </button>

            <button
              onClick={() => setStatusFilter('not_started')}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                statusFilter === 'not_started'
                  ? 'bg-slate-500/20 border-slate-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-sm sm:text-base font-bold text-slate-400 block">{notStartedCount}</span>
              <span className="text-[10px] font-semibold text-slate-300 uppercase">Not Started</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search topics, units, or competencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl bg-white/5 border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none min-h-[44px]"
          />
        </div>

        {/* Status Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
              statusFilter === 'all'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
              statusFilter === 'completed'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
              statusFilter === 'in_progress'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatusFilter('not_started')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
              statusFilter === 'not_started'
                ? 'bg-slate-500/30 text-slate-200 border border-slate-500/50'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Not Started
          </button>
        </div>
      </div>

      {/* Topics List with Interactive Status Switchers */}
      <div className="space-y-3">
        {displayedTopics.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#161831]/60 p-8 text-center text-slate-400 backdrop-blur-md">
            <BookOpen className="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-200">No syllabus topics found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filter or adding a custom topic.</p>
          </div>
        ) : (
          topicRows.map((row) => {
            if (row.kind === 'group') {
              const stats = groupStats(row.topics);
              return (
                <div
                  key={row.key}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{row.icon}</span>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {row.title}{' '}
                        <span className="text-[10px] font-bold text-slate-400">
                          • {row.paper} • {row.range}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {stats.completed} of {stats.total} units complete
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] to-cyan-400"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-black text-cyan-300">{stats.percentage}%</span>
                  </div>
                </div>
              );
            }
            const topic = row.topic;
            const isExpanded = expandedTopicId === topic.id;

            return (
              <div
                key={topic.id}
                className={`rounded-2xl border transition-all p-4 backdrop-blur-md ${
                  topic.status === 'completed'
                    ? 'border-emerald-500/30 bg-emerald-950/15'
                    : topic.status === 'in_progress'
                    ? 'border-amber-500/30 bg-amber-950/15'
                    : 'border-white/10 bg-[#161831]/80 hover:border-cyan-400/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 border border-white/10">
                        Unit {topic.unitNumber}{topic.unitTitle && topic.unitTitle.trim().toLowerCase() !== topic.topicTitle.trim().toLowerCase() ? `: ${topic.unitTitle}` : ''}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {topic.topicTitle}
                    </h3>
                  </div>

                  {/* Status Pills Controls (Completed, In Progress, Not Started) */}
                  {/* Wraps + short labels below 380px so 320px screens never overflow */}
                  <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center shrink-0">
                    {/* Completed Button */}
                    <button
                      onClick={() => onUpdateTopicStatus(topic.id, 'completed')}
                      className={`flex items-center gap-1 px-2.5 min-[380px]:px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                        topic.status === 'completed'
                          ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                          : 'bg-white/5 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden min-[380px]:inline">Completed</span>
                      <span className="min-[380px]:hidden">Done</span>
                    </button>

                    {/* In Progress Button */}
                    <button
                      onClick={() => onUpdateTopicStatus(topic.id, 'in_progress')}
                      className={`flex items-center gap-1 px-2.5 min-[380px]:px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                        topic.status === 'in_progress'
                          ? 'bg-amber-500 text-black font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                          : 'bg-white/5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span className="hidden min-[380px]:inline">In Progress</span>
                      <span className="min-[380px]:hidden">Active</span>
                    </button>

                    {/* Not Started Button */}
                    <button
                      onClick={() => onUpdateTopicStatus(topic.id, 'not_started')}
                      className={`flex items-center gap-1 px-2.5 min-[380px]:px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                        topic.status === 'not_started'
                          ? 'bg-slate-700 text-white border border-slate-500'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span className="hidden min-[380px]:inline">Not Started</span>
                      <span className="min-[380px]:hidden">Todo</span>
                    </button>
                  </div>
                </div>

                {/* Subtopics Checklist Accordion */}
                {topic.subtopics && topic.subtopics.length > 0 && (() => {
                  const progress = calculateTopicProgress(topic);
                  const isAllDone = topic.status === 'completed' || progress.isCompleted;

                  return (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                          className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer min-h-[36px]"
                        >
                          <span>Syllabus Sub-Topics ({topic.subtopics.length})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">
                            {progress.completedSubtopicsCount} of {topic.subtopics.length} done
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Mini progress bar */}
                        <div className="w-20 hidden sm:block h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>

                      {isExpanded && (() => {
                        // Group subtopics if they have "Group: Subtopic" format
                        type SubGroup = { title?: string; items: { raw: string; label: string }[] };
                        const groups: SubGroup[] = [];
                        let currentGroup: SubGroup | null = null;

                        topic.subtopics.forEach((sub) => {
                          const colonIdx = sub.indexOf(': ');
                          if (colonIdx > 0) {
                            const groupName = sub.substring(0, colonIdx).trim();
                            const itemLabel = sub.substring(colonIdx + 2).trim();
                            if (!currentGroup || currentGroup.title !== groupName) {
                              currentGroup = { title: groupName, items: [] };
                              groups.push(currentGroup);
                            }
                            currentGroup.items.push({ raw: sub, label: itemLabel });
                          } else {
                            if (!currentGroup || currentGroup.title !== undefined) {
                              currentGroup = { title: undefined, items: [] };
                              groups.push(currentGroup);
                            }
                            currentGroup.items.push({ raw: sub, label: sub });
                          }
                        });

                        return (
                          <div className="mt-3 pl-2 sm:pl-3 space-y-3 border-l-2 border-cyan-500/30 animate-fadeIn">
                            {groups.map((group, gIdx) => {
                              const groupCompletedCount = group.items.filter(
                                (item) => isAllDone || getSubtopicProgressValue(topic, item.raw) >= 100
                              ).length;

                              return (
                                <div key={gIdx} className="space-y-1.5">
                                  {group.title && (
                                    <div className="flex items-center justify-between pt-1.5 pb-1.5 px-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                        <span className="text-xs font-bold text-cyan-200 tracking-wide">
                                          {group.title}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                                        {groupCompletedCount} of {group.items.length} done
                                      </span>
                                    </div>
                                  )}

                                  <div className={group.title ? 'space-y-1.5 pl-2' : 'space-y-1.5'}>
                                    {group.items.map((item, idx) => {
                                      const subProgress = isAllDone ? 100 : getSubtopicProgressValue(topic, item.raw);
                                      const isSubDone = subProgress >= 100;
                                      const isPartial = subProgress > 0 && subProgress < 100;

                                      return (
                                        <div
                                          key={idx}
                                          onClick={() => onToggleSubtopic && onToggleSubtopic(topic.id, item.raw)}
                                          className={`flex items-start justify-between p-2 rounded-xl transition cursor-pointer select-none text-xs gap-2 ${
                                            isSubDone
                                              ? 'bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 border border-emerald-500/20'
                                              : isPartial
                                              ? 'bg-amber-500/10 text-amber-100 hover:bg-amber-500/15 border border-amber-500/25'
                                              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                                          }`}
                                        >
                                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                            <div
                                              className={`w-4 h-4 mt-0.5 rounded-md flex items-center justify-center shrink-0 border transition ${
                                                isSubDone
                                                  ? 'bg-emerald-500 border-emerald-400 text-white'
                                                  : isPartial
                                                  ? 'bg-amber-500/60 border-amber-400 text-white'
                                                  : 'border-white/30 bg-black/20'
                                              }`}
                                            >
                                              {isSubDone && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <span
                                              className={`leading-relaxed break-words ${
                                                isSubDone ? 'line-through text-slate-400 font-medium' : 'font-normal'
                                              }`}
                                            >
                                              {item.label}
                                              {isPartial && (
                                                <span className="ml-1.5 text-[10px] font-bold text-amber-300">
                                                  {subProgress}%
                                                </span>
                                              )}
                                            </span>
                                          </div>
                                          <span
                                            className={`text-[10px] uppercase font-bold shrink-0 mt-0.5 ${
                                              isSubDone ? 'text-emerald-400' : isPartial ? 'text-amber-300' : 'text-slate-500'
                                            }`}
                                          >
                                            {isSubDone ? 'Completed' : isPartial ? `${subProgress}% done` : 'To Revise'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Topic Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 pt-6 sm:pt-10 pb-24 sm:pb-12">
            <div
              className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-purple-500/40 bg-[#161831] shadow-2xl text-slate-100 flex flex-col max-h-[calc(100dvh-3.5rem)] sm:max-h-[min(88vh,740px)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pinned Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0 bg-[#161831]">
                <div className="flex items-center gap-2 text-base font-bold text-white min-w-0 flex-1">
                  <Plus className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="truncate">Add Syllabus Topic to {selectedSubject}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Topic Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 07: Electromagnetic Induction & Transformers"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 font-medium focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Unit Number</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={newUnitNumber}
                      onChange={(e) => setNewUnitNumber(Number(e.target.value))}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white font-medium focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Unit Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Electromagnetism"
                      value={newUnitTitle}
                      onChange={(e) => setNewUnitTitle(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white font-medium focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Sub-topics (one per line, optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Faraday Law&#10;Lenz Law&#10;Eddy Currents"
                    value={newSubtopicsText}
                    onChange={(e) => setNewSubtopicsText(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/15 p-2.5 text-white placeholder-slate-500 font-medium focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pinned Sticky Footer */}
              <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#14162e]/95 backdrop-blur-md flex flex-wrap items-center justify-end gap-2.5 shrink-0">
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
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>,
      document.body
      )}
    </div>
  );
};
