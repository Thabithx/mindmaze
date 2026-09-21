import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BlockType,
  DailyTask,
  DayOfWeek,
  StreamType,
  SubtopicTarget,
  SyllabusTopic,
  TimetableEntry,
} from '../../types';
import {
  Plus,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  RefreshCw,
  GraduationCap,
  Repeat,
  CalendarPlus,
  RotateCcw,
  LayoutGrid,
  List,
} from 'lucide-react';
import { SUBJECT_METAS, getSubjectsForStream } from '../../data/alSyllabusData';
import { SubtopicTargetPicker } from '../common/SubtopicTargetPicker';
import {
  calculateMinutesBetween,
  computeEndTime,
  formatTime12h,
  getDateForDayOfWeekInCurrentWeek,
  getDayOfWeekFromDate,
  getFormattedDateDisplay,
  getTodayDateString,
  isEndAfterStart,
  timeToMinutes,
} from '../../lib/storage';

interface StudyPlannerProps {
  entries: TimetableEntry[];
  tasks: DailyTask[];
  syllabusTopics?: SyllabusTopic[];
  stream: StreamType;
  physicalScienceElective?: 'Chemistry' | 'ICT';
  onAddEntry: (entry: Omit<TimetableEntry, 'id'> & { syncToDailyPlanner?: boolean }) => void;
  onUpdateEntry: (entry: TimetableEntry) => void;
  onDeleteEntry: (id: string) => void;
  onResetTimetable: () => void;
  onToggleEntryCompletion?: (id: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (
    task: Omit<DailyTask, 'id'> & { syncToTimetable?: boolean; startTime?: string; endTime?: string }
  ) => void;
  onDeleteTask: (taskId: string) => void;
  onSyncFromTimetable: (dateStr: string) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];



const QUICK_DURATIONS = [30, 60, 90, 120, 180, 240];

const toHHMM = (mins: number) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

/**
 * Suggests the next free start time: after the day's last block, or the next
 * whole hour when looking at today — clamped to 05:00–22:00. End defaults to
 * +60 min. Keeps the "what time?" decision to zero taps in the common case.
 */
function suggestSlot(dayBlocks: TimetableEntry[], viewingToday: boolean): { start: string; end: string } {
  const FALLBACK = { start: '16:00', end: '17:00' };
  try {
    let candidate: number | null = null;
    for (const b of dayBlocks) {
      const e = timeToMinutes(b.endTime);
      if (Number.isFinite(e) && (candidate === null || e > candidate)) candidate = e;
    }
    if (viewingToday) {
      const now = new Date();
      const nextHour = (now.getHours() + 1) * 60;
      candidate = candidate === null ? nextHour : Math.max(candidate, nextHour);
    }
    if (candidate === null) return FALLBACK;
    if (candidate < 5 * 60) candidate = 5 * 60;
    if (candidate > 22 * 60) return FALLBACK;
    const start = toHHMM(candidate);
    const end = computeEndTime(start, 60);
    return isEndAfterStart(start, end) ? { start, end } : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  entries,
  tasks,
  syllabusTopics = [],
  stream,
  physicalScienceElective = 'Chemistry',
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onResetTimetable,
  onToggleEntryCompletion,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onSyncFromTimetable,
}) => {
  const todayStr = getTodayDateString();
  const todayName = getDayOfWeekFromDate(todayStr);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'day' | 'week'>(() => {
    try {
      return localStorage.getItem('mindmaze_planner_view') === 'week' ? 'week' : 'day';
    } catch {
      return 'day';
    }
  });
  const selectedDay = getDayOfWeekFromDate(selectedDate);
  const isViewingToday = selectedDate === todayStr;

  const changeViewMode = (mode: 'day' | 'week') => {
    setViewMode(mode);
    try {
      localStorage.setItem('mindmaze_planner_view', mode);
    } catch {
      /* storage unavailable — view toggle still works in-memory */
    }
  };

  const availableSubjects = getSubjectsForStream(stream, physicalScienceElective);

  // ---- Single Add / Edit modal state ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState(availableSubjects[0]?.name || 'Combined Mathematics');
  const [formBlockType, setFormBlockType] = useState<BlockType>('study');
  const [formTopicId, setFormTopicId] = useState('');
  const [formTargets, setFormTargets] = useState<SubtopicTarget[]>([]);
  const [formDay, setFormDay] = useState<DayOfWeek>(todayName);
  const [formStart, setFormStart] = useState('16:00');
  const [formEnd, setFormEnd] = useState('17:00');
  const [formRepeatWeekly, setFormRepeatWeekly] = useState(true);
  const [formReminder, setFormReminder] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formTimeError, setFormTimeError] = useState('');
  const [formLinkError, setFormLinkError] = useState('');
  // Link is mandatory only for subjects that exist in the syllabus.
  // Non-syllabus options (e.g. Self Study & Revision) are exempt — there is
  // nothing to link them to, and they intentionally don't move progress %.
  const subjectRequiresLink = syllabusTopics.some((t) => t.subject === formSubject);

  const completedTopicsCount = syllabusTopics.filter((t) => t.status === 'completed').length;
  const revisionLocked = completedTopicsCount === 0;

  const openAddModal = () => {
    setEditingEntry(null);
    setFormTitle('');
    setFormSubject(availableSubjects[0]?.name || 'Combined Mathematics');
    setFormBlockType('study');
    setFormTopicId('');
    setFormTargets([]);
    setFormDay(selectedDay);
    const slot = suggestSlot(
      entries.filter((e) => e.dayOfWeek === selectedDay),
      isViewingToday
    );
    setFormStart(slot.start);
    setFormEnd(slot.end);
    setFormRepeatWeekly(true);
    setFormReminder(true);
    setFormNotes('');
    setFormTimeError('');
    setFormLinkError('');
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormTitle(entry.topic);
    setFormSubject(entry.subject);
    setFormBlockType(entry.blockType === 'revision' ? 'revision' : 'study');
    setFormTopicId(entry.topicId || '');
    setFormTargets(
      Array.isArray(entry.subtopicTargets) && entry.subtopicTargets.length > 0
        ? entry.subtopicTargets.map((t) => ({ ...t }))
        : entry.subtopic
          ? [{ subtopic: entry.subtopic, targetProgress: entry.targetProgress ?? 100 }]
          : []
    );
    setFormDay(entry.dayOfWeek);
    setFormStart(entry.startTime);
    setFormEnd(entry.endTime);
    setFormRepeatWeekly(true);
    setFormReminder(entry.reminderEnabled);
    setFormNotes(entry.notes || '');
    setFormTimeError('');
    setFormLinkError('');
    setIsModalOpen(true);
  };

  const handleTopicChange = (topicId: string) => {
    setFormTopicId(topicId);
    setFormLinkError('');
    setFormTargets([]);
    if (topicId && !formTitle.trim()) {
      const match = syllabusTopics.find((t) => t.id === topicId);
      if (match) setFormTitle(formBlockType === 'revision' ? `Revise ${match.topicTitle}` : match.topicTitle);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    if (!isEndAfterStart(formStart, formEnd)) {
      setFormTimeError(
        `End time (${formatTime12h(formEnd)}) must be after start time (${formatTime12h(formStart)}).`
      );
      return;
    }
    setFormTimeError('');
    // Syllabus link is mandatory for syllabus subjects: an unlinked block can
    // be ticked done but never moves progress %, so don't allow saving one.
    if (syllabusTopics.some((t) => t.subject === formSubject) && !formTopicId) {
      setFormLinkError(
        'Link a syllabus topic — otherwise completing this block won’t move your progress %.'
      );
      return;
    }
    // Study is first-time learning: a finished topic can only be revised.
    if (formBlockType === 'study' && formTopicId) {
      const linked = syllabusTopics.find((t) => t.id === formTopicId);
      if (linked && linked.status === 'completed') {
        setFormLinkError(
          `"${linked.topicTitle}" is already completed — switch Type to 🔁 Revision for finished topics.`
        );
        return;
      }
    }
    setFormLinkError('');
    const cleanTargets = formTargets
      .filter((t) => t.subtopic.trim())
      .map((t) => ({
        subtopic: t.subtopic.trim(),
        targetProgress: Math.max(0, Math.min(100, Math.round(t.targetProgress))),
      }));
    const first = cleanTargets[0];

    if (editingEntry) {
      onUpdateEntry({
        ...editingEntry,
        dayOfWeek: formDay,
        subject: formSubject,
        blockType: formBlockType,
        topic: formTitle.trim(),
        topicId: formTopicId || undefined,
        subtopic: first?.subtopic,
        targetProgress: first?.targetProgress,
        subtopicTargets: cleanTargets.length > 0 ? cleanTargets : undefined,
        startTime: formStart,
        endTime: formEnd,
        reminderEnabled: formReminder,
        notes: formNotes.trim(),
      });
    } else if (formRepeatWeekly) {
      // Weekly repeating block — the App handler auto-creates the linked daily task too.
      onAddEntry({
        dayOfWeek: formDay,
        subject: formSubject,
        blockType: formBlockType,
        topic: formTitle.trim(),
        topicId: formTopicId || undefined,
        subtopic: first?.subtopic,
        targetProgress: first?.targetProgress,
        subtopicTargets: cleanTargets.length > 0 ? cleanTargets : undefined,
        startTime: formStart,
        endTime: formEnd,
        color: SUBJECT_METAS.find((s) => s.name === formSubject)?.color || 'indigo',
        reminderEnabled: formReminder,
        reminderOffsetMinutes: 15,
        notes: formNotes.trim(),
        syncToDailyPlanner: true,
      });
    } else {
      // One-off block just for the selected date — no weekly repeat.
      onAddTask({
        date: selectedDate,
        title: formTitle.trim(),
        subject: formSubject,
        blockType: formBlockType,
        topicId: formTopicId || undefined,
        topicTitle: syllabusTopics.find((t) => t.id === formTopicId)?.topicTitle || undefined,
        subtopic: first?.subtopic,
        targetProgress: first?.targetProgress,
        subtopicTargets: cleanTargets.length > 0 ? cleanTargets : undefined,
        isCompleted: false,
        estimatedMinutes: calculateMinutesBetween(formStart, formEnd),
        priority: 'Medium',
        timeSlot: `${formStart} - ${formEnd}`,
        startTime: formStart,
        endTime: formEnd,
        syncToTimetable: false,
      });
    }
    setIsModalOpen(false);
  };

  const changeDateByDays = (delta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta);
    const pad = (n: number) => String(n).padStart(2, '0');
    setSelectedDate(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`);
  };

  const jumpToWeekday = (day: DayOfWeek) => {
    setSelectedDate(getDateForDayOfWeekInCurrentWeek(day));
  };

  // ---- Derived lists ----
  const dateTasks = tasks
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const dayEntries = entries
    .filter((e) => e.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const doneCount = dateTasks.filter((t) => t.isCompleted).length;
  const progress = dateTasks.length === 0 ? 0 : Math.round((doneCount / dateTasks.length) * 100);

  // ---- Whole-week derived data (Mon–Sun containing selectedDate) ----
  const weekDates: { date: string; day: DayOfWeek; label: string; dayNum: string }[] = (() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const ref = new Date(y, m - 1, d);
      const mondayOffset = (ref.getDay() + 6) % 7; // Mon=0 … Sun=6
      const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - mondayOffset);
      const pad = (n: number) => String(n).padStart(2, '0');
      return DAYS_OF_WEEK.map((day, i) => {
        const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
        return {
          date,
          day,
          label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dayNum: String(dt.getDate()),
        };
      });
    } catch {
      return [];
    }
  })();
  const weekTasks = weekDates.map(({ date, day }) => ({
    date,
    day,
    list: tasks
      .filter((t) => t.date === date)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    repeats: entries
      .filter((e) => e.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
  const weekDone = weekTasks.reduce((n, d) => n + d.list.filter((t) => t.isCompleted).length, 0);
  const weekTotal = weekTasks.reduce((n, d) => n + d.list.length, 0);
  const weekRepeatTotal = entries.length;
  const weekProgress = weekTotal === 0 ? 0 : Math.round((weekDone / weekTotal) * 100);
  const weekRangeLabel =
    weekDates.length === 7 ? `${weekDates[0].label} – ${weekDates[6].label}` : '';

  const importWholeWeek = () => {
    weekDates.forEach(({ date }) => onSyncFromTimetable(date));
  };

  return (
    <div id="study-planner-view" className="space-y-5 max-w-7xl mx-auto pb-8">
      {/* Header — one place to add anything */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161831] via-[#12142B] to-[#0F1023] p-4 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold">
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Study Planner • {isViewingToday ? 'Today' : selectedDay}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold">
              <Repeat className="w-3 h-3 text-purple-300" />
              <span>Weekly + Daily in one place</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {viewMode === 'week'
              ? 'Whole Week Plan'
              : isViewingToday
                ? "Today's Study Plan"
                : `Plan for ${selectedDay}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {viewMode === 'week' ? (
              <>
                {weekRangeLabel} • {weekDone} of {weekTotal} done • {weekRepeatTotal} repeat weekly
              </>
            ) : (
              <>
                {getFormattedDateDisplay(selectedDate)} • {doneCount} of {dateTasks.length} done •{' '}
                {dayEntries.length} repeat weekly
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSyncFromTimetable(selectedDate)}
            title="Pull this weekday's repeating blocks into this date"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition cursor-pointer min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import repeats</span>
          </button>
          <button
            onClick={onResetTimetable}
            title="Reset weekly template to the recommended GCE A/L schedule"
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            id="btn-add-study-block"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Study Block</span>
          </button>
        </div>
      </div>

      {/* Date + weekday selector + Day/Week toggle */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center rounded-2xl bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => changeDateByDays(viewMode === 'week' ? -7 : -1)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={viewMode === 'week' ? 'Previous week' : 'Previous day'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                isViewingToday ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-300 hover:text-white'
              }`}
            >
              {isViewingToday ? 'Today' : 'Back to Today'}
            </button>
            <button
              onClick={() => changeDateByDays(viewMode === 'week' ? 7 : 1)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={viewMode === 'week' ? 'Next week' : 'Next day'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Day / Week view switch — persists via localStorage */}
          <div
            role="group"
            aria-label="Planner view"
            className="flex items-center rounded-2xl bg-white/5 border border-white/10 p-1"
          >
            <button
              onClick={() => changeViewMode('day')}
              aria-pressed={viewMode === 'day'}
              title="Show one day at a time"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                viewMode === 'day'
                  ? 'bg-[#6B4EFF] text-white shadow-[0_0_12px_rgba(107,78,255,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Day</span>
            </button>
            <button
              onClick={() => changeViewMode('week')}
              aria-pressed={viewMode === 'week'}
              title="Show the whole week (Mon–Sun)"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                viewMode === 'week'
                  ? 'bg-[#6B4EFF] text-white shadow-[0_0_12px_rgba(107,78,255,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">
            {viewMode === 'week' ? weekRangeLabel : getFormattedDateDisplay(selectedDate)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = day === selectedDay;
            const count = entries.filter((e) => e.dayOfWeek === day).length;
            return (
              <button
                key={day}
                onClick={() => jumpToWeekday(day)}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer min-h-[44px] ${
                  isSelected
                    ? 'bg-[#6B4EFF] border-purple-400 text-white shadow-[0_0_12px_rgba(107,78,255,0.4)]'
                    : 'bg-[#161831]/80 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{day.slice(0, 3)}</span>
                {day === todayName && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] via-cyan-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${viewMode === 'week' ? weekProgress : progress}%` }}
          />
        </div>
      </div>

      {viewMode === 'week' ? (
        /* Whole-week overview: Mon–Sun grid, each day tappable to open Day view */
        <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-4 sm:p-5 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cyan-300" />
              <span>Whole week • {weekRangeLabel}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">
                {weekDone}/{weekTotal} done this week
              </span>
              <button
                onClick={importWholeWeek}
                title="Pull every weekday's repeating blocks into this week's dates"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-cyan-300 transition cursor-pointer min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Import week repeats</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {weekTasks.map(({ date, day, list, repeats }) => {
              const isToday = date === todayStr;
              const isSelected = date === selectedDate;
              const done = list.filter((t) => t.isCompleted).length;
              return (
                <div
                  key={date}
                  className={`rounded-2xl border p-3 space-y-2 flex flex-col min-h-[180px] ${
                    isSelected
                      ? 'border-purple-400/60 bg-purple-500/[0.08]'
                      : isToday
                        ? 'border-cyan-400/40 bg-cyan-500/[0.06]'
                        : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedDate(date);
                      changeViewMode('day');
                    }}
                    title={`Open ${day} in Day view`}
                    className="text-left cursor-pointer rounded-xl -m-1 p-1 hover:bg-white/5 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        {day.slice(0, 3)}
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">{weekDates.find((w) => w.date === date)?.label}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                      {done}/{list.length} done{repeats.length > 0 ? ` • ${repeats.length} repeat` : ''}
                    </div>
                  </button>
                  <div className="space-y-1.5 flex-1">
                    {list.length === 0 && repeats.length === 0 && (
                      <p className="text-[11px] text-slate-500 leading-relaxed">Nothing planned.</p>
                    )}
                    {list.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 ${
                          task.isCompleted
                            ? 'border-emerald-500/30 bg-emerald-950/15 opacity-75'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <button
                          onClick={() => onToggleTask(task.id)}
                          title={task.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                          className="shrink-0 text-cyan-400 hover:scale-110 transition cursor-pointer p-1"
                        >
                          {task.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDate(date);
                            changeViewMode('day');
                          }}
                          title={`${task.title} — open day to manage`}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <p className={`text-[11px] font-semibold truncate ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {task.startTime ? `${task.startTime} ` : ''}{task.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{task.subject}</p>
                        </button>
                      </div>
                    ))}
                    {repeats
                      .filter((r) => !list.some((t) => t.fromTimetableId === r.id))
                      .map((r) => (
                        <div
                          key={r.id}
                          title={`Repeats every ${day} — not yet imported for this date`}
                          className="rounded-xl border border-dashed border-white/15 px-2 py-1.5 text-[10px] text-slate-400"
                        >
                          <span className="font-bold text-slate-300">{r.startTime}</span> {r.topic}
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">Tap any day to open it in Day view. Tick circles to complete blocks without leaving the week.</p>
        </div>
      ) : (
      <>
      {/* Two columns: this date + weekly repeat */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: blocks for the selected date */}
        <div className="lg:col-span-3 rounded-3xl border border-white/10 bg-[#161831]/80 p-4 sm:p-5 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>
                {isViewingToday ? 'Today' : selectedDay}’s blocks ({doneCount}/{dateTasks.length})
              </span>
            </h2>
            <button onClick={openAddModal} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer min-h-[40px] px-2">
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
          {dateTasks.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-200">Nothing planned for this date yet</p>
              <p className="text-xs text-slate-400 mt-1">Import the {selectedDay} repeats or add a block — one tap.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {dayEntries.length > 0 && (
                  <button
                    onClick={() => onSyncFromTimetable(selectedDate)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-cyan-300 transition cursor-pointer min-h-[44px]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Import {dayEntries.length} repeats</span>
                  </button>
                )}
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white transition cursor-pointer min-h-[44px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Study Block</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dateTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-3 backdrop-blur-md flex items-center justify-between gap-3 ${
                    task.isCompleted
                      ? 'border-emerald-500/30 bg-emerald-950/15 opacity-75'
                      : task.blockType === 'revision'
                        ? 'border-teal-400/40 bg-teal-950/15'
                        : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-cyan-400 hover:scale-110 transition cursor-pointer rounded-xl"
                      title={task.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                          {task.subject}
                        </span>
                        {task.blockType === 'revision' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-200 border border-teal-400/40">
                            🔁 Revision
                          </span>
                        )}
                        {task.blockType !== 'revision' && !task.topicId && (
                          <span
                            title="Ticking this done won't move syllabus % — edit the block and link a syllabus topic to count it."
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/40"
                          >
                            Not linked
                          </span>
                        )}
                        {(task.timeSlot || task.startTime) && (
                          <span className="text-[10px] text-cyan-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.timeSlot || `${task.startTime} - ${task.endTime}`}
                          </span>
                        )}
                      </div>
                      <h3 className={`text-sm font-semibold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {task.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                    title="Delete block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: weekly repeating template for this weekday */}
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#161831]/80 p-4 sm:p-5 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-purple-300" />
              <span>Repeats every {selectedDay}</span>
            </h2>
            <button onClick={() => { setFormDay(selectedDay); openAddModal(); }} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer min-h-[40px] px-2">
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The template. New repeats auto-appear on every future {selectedDay}.
          </p>
          {dayEntries.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 text-center text-xs text-slate-400">
              No repeating blocks for {selectedDay} yet.
            </div>
          ) : (
            <div className="space-y-2">
              {dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-2xl border ${entry.blockType === 'revision' ? 'border-teal-400/40 bg-teal-500/[0.07]' : 'border-white/10 bg-white/5'}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-cyan-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime12h(entry.startTime)} – {formatTime12h(entry.endTime)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200">{entry.subject}</span>
                  </div>
                  <p className={`text-xs font-semibold ${entry.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {entry.topic}
                    {entry.blockType === 'revision' ? ' 🔁' : ''}
                  </p>
                  {entry.blockType !== 'revision' && !entry.topicId && (
                    <p
                      title="Ticking this done won't move syllabus % — edit the block and link a syllabus topic to count it."
                      className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/40"
                    >
                      Not linked
                    </p>
                  )}
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                    {onToggleEntryCompletion ? (
                      <button
                        onClick={() => onToggleEntryCompletion(entry.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1.5 ${
                          entry.isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{entry.isCompleted ? 'Done' : 'Mark Done'}</span>
                      </button>
                    ) : <span />}
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(entry)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDeleteEntry(entry.id)} className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Single Add / Edit modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 pt-6 pb-24">
            <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-purple-500/40 bg-[#161831] shadow-2xl text-slate-100 flex flex-col max-h-[calc(100dvh-3.5rem)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 text-base font-bold text-white">
                  <CalendarPlus className="w-5 h-5 text-cyan-400" />
                  <span>{editingEntry ? 'Edit Study Block' : 'Add Study Block'}</span>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px]" aria-label="Close dialog">✕</button>
              </div>
              <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs overscroll-contain">
                  {/* Step 1 — What */}
                  <section aria-label="Step 1 — What to study" className="space-y-3">
                    <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px]">1</span>
                      What
                    </p>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">What will you study? <span className="text-rose-400">*</span></label>
                    <input
                      type="text" required autoFocus={!editingEntry}
                      placeholder="e.g. Oscillations & Waves — 50 MCQs"
                      value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 font-medium focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                    <span className="block text-slate-300 font-semibold mb-1.5" id="study-block-subject-label">Subject</span>
                    <div role="group" aria-labelledby="study-block-subject-label" className="flex flex-wrap gap-1.5">
                      {(() => {
                        const options = [
                          ...availableSubjects.map((s) => ({ name: s.name, icon: s.icon })),
                        ];
                        if (!options.some((o) => o.name === formSubject)) {
                          options.push({ name: formSubject, icon: '📚' });
                        }
                        return options.map((o) => {
                          const active = formSubject === o.name;
                          return (
                            <button
                              key={o.name}
                              type="button"
                              aria-pressed={active}
                              onClick={() => {
                                setFormSubject(o.name);
                                setFormTopicId('');
                                setFormLinkError('');
                                setFormTargets([]);
                              }}
                              className={`px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer min-h-[40px] ${
                                active
                                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100'
                                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/25'
                              }`}
                            >
                              {o.icon} {o.name}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Type</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button" onClick={() => { setFormBlockType('study'); setFormTopicId(''); setFormLinkError(''); setFormTargets([]); }}
                          className={`px-2 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1 ${formBlockType === 'study' ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200' : 'bg-white/5 border-white/10 text-slate-400'}`}
                        >
                          <GraduationCap className="w-4 h-4" /><span>Study</span>
                        </button>
                        <button
                          type="button" disabled={revisionLocked} onClick={() => { setFormBlockType('revision'); setFormTopicId(''); setFormLinkError(''); setFormTargets([]); }}
                          title={revisionLocked ? 'Complete a topic first to unlock revision' : 'Only completed topics'}
                          className={`px-2 py-2.5 rounded-xl border text-xs font-bold transition min-h-[44px] flex items-center justify-center gap-1 ${formBlockType === 'revision' ? 'bg-teal-500/20 border-teal-400/60 text-teal-200' : revisionLocked ? 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed' : 'bg-white/5 border-white/10 text-slate-400 cursor-pointer'}`}
                        >
                          <RefreshCw className="w-4 h-4" /><span>🔁</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  </section>

                  {/* Step 2 — When */}
                  <section aria-label="Step 2 — When to study" className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[10px]">2</span>
                      When
                    </p>
                  {!editingEntry && (
                    <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-500/10 border border-purple-400/30 cursor-pointer">
                      <input type="checkbox" checked={formRepeatWeekly} onChange={(e) => setFormRepeatWeekly(e.target.checked)} className="h-4 w-4 rounded accent-[#6B4EFF] cursor-pointer" />
                      <span className="flex-1">
                        <span className="font-bold text-white flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5 text-purple-300" /> Repeat every week</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {formRepeatWeekly ? `Repeats every ${formDay} + appears on ${getFormattedDateDisplay(selectedDate)}` : `Just once — only on ${getFormattedDateDisplay(selectedDate)}`}
                        </span>
                      </span>
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {editingEntry || formRepeatWeekly ? (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Repeats on</label>
                        <select value={formDay} onChange={(e) => setFormDay(e.target.value as DayOfWeek)} className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white font-medium focus:border-cyan-400 focus:outline-none">
                          {DAYS_OF_WEEK.map((d) => (<option key={d} value={d} className="bg-[#161831] text-white">{d}</option>))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Date</label>
                        <div className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white font-medium">{getFormattedDateDisplay(selectedDate)}</div>
                      </div>
                    )}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Reminder</label>
                      <button type="button" onClick={() => setFormReminder(!formReminder)} className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer min-h-[44px] ${formReminder ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        {formReminder ? '🔔 On (15m before)' : '🔕 Off'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Start</label>
                      <input type="time" required value={formStart} onChange={(e) => { setFormStart(e.target.value); setFormTimeError(''); }} className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white font-medium focus:outline-none ${formTimeError ? 'border-rose-500' : 'border-white/15 focus:border-cyan-400'}`} />
                      <p className="text-[11px] text-cyan-300/90 mt-1 font-semibold">{formatTime12h(formStart)}</p>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">End</label>
                      <input type="time" required value={formEnd} onChange={(e) => { setFormEnd(e.target.value); setFormTimeError(''); }} className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white font-medium focus:outline-none ${formTimeError ? 'border-rose-500' : 'border-white/15 focus:border-cyan-400'}`} />
                      <p className="text-[11px] text-cyan-300/90 mt-1 font-semibold">{formatTime12h(formEnd)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Duration:</span>
                    {QUICK_DURATIONS.map((mins) => {
                      const active = calculateMinutesBetween(formStart, formEnd) === mins;
                      return (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => { setFormEnd(computeEndTime(formStart, mins)); setFormTimeError(''); }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer min-h-[36px] ${
                            active
                              ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/25'
                          }`}
                        >
                          {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                        </button>
                      );
                    })}
                  </div>
                  {formTimeError ? (
                    <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">⚠️ {formTimeError}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Duration: <strong className="text-white">{calculateMinutesBetween(formStart, formEnd)} min</strong> • {formatTime12h(formStart)} → {formatTime12h(formEnd)}</p>
                  )}
                  </section>

                  {/* Step 3 — Link (required for syllabus subjects) */}
                  <section aria-label="Step 3 — Link syllabus and notes" className="space-y-3">
                    <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px]">3</span>
                      Link{' '}
                      {subjectRequiresLink ? (
                        <span className="font-semibold normal-case tracking-normal text-rose-300">required — drives progress % <span aria-hidden="true">*</span></span>
                      ) : (
                        <span className="font-semibold normal-case tracking-normal text-slate-500">no syllabus for this option</span>
                      )}
                    </p>
                  <details
                    className={`rounded-2xl border px-3 py-2.5 ${
                      formLinkError
                        ? 'border-rose-500/60 bg-rose-500/[0.07]'
                        : 'border-cyan-500/25 bg-cyan-500/[0.06]'
                    }`}
                    open={!!formLinkError || !!editingEntry || !!formTopicId || formTargets.length > 0 ? true : undefined}
                  >
                    <summary className="flex items-center gap-2 text-xs font-bold text-cyan-200 cursor-pointer list-none [&::-webkit-details-marker]:hidden min-h-[32px]">
                      <BookOpen className="w-4 h-4 text-cyan-300 shrink-0" />
                      <span className="flex-1">
                        {formTopicId || formTargets.length > 0
                          ? `Syllabus linked${formTargets.length > 0 ? ` • ${formTargets.length} subtopic${formTargets.length > 1 ? 's' : ''}` : ''}`
                          : 'Link syllabus topic (drives progress %)'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {formTopicId || formTargets.length > 0
                          ? 'tap to change'
                          : subjectRequiresLink
                            ? 'required *'
                            : 'n/a'}
                      </span>
                    </summary>
                    <div className="pt-2.5">
                      <SubtopicTargetPicker
                        syllabusTopics={syllabusTopics}
                        subject={formSubject}
                        topicId={formTopicId}
                        onTopicChange={handleTopicChange}
                        targets={formTargets}
                        onTargetsChange={setFormTargets}
                        completedOnly={formBlockType === 'revision'}
                        excludeCompleted={formBlockType === 'study'}
                      />
                    </div>
                  </details>
                  {formLinkError && (
                    <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">⚠️ {formLinkError}</p>
                  )}
                  <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5" open={!!editingEntry && !!editingEntry.notes ? true : undefined}>
                    <summary className="text-xs font-bold text-slate-300 cursor-pointer list-none [&::-webkit-details-marker]:hidden min-h-[32px] flex items-center">
                      Notes {formNotes.trim() ? <span className="ml-1.5 text-[10px] text-cyan-300">• added</span> : <span className="ml-1.5 text-[10px] font-semibold text-slate-500">optional</span>}
                    </summary>
                    <div className="pt-2">
                      <textarea rows={2} placeholder="e.g. Focus on derivations + 2021 Q4" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/15 p-2.5 text-white placeholder-slate-500 font-medium focus:border-cyan-400 focus:outline-none" />
                    </div>
                  </details>
                  </section>
                </div>
                <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#14162e]/95 shrink-0 space-y-2.5">
                  {!formTimeError && formTitle.trim() && (
                    <p className="text-[11px] text-slate-400 leading-relaxed" aria-live="polite">
                      <span className="font-semibold text-slate-500">Summary: </span>
                      <strong className="text-white">{formTitle.trim()}</strong>
                      {' '}• {formSubject} •{' '}
                      {editingEntry || formRepeatWeekly ? `every ${formDay}` : getFormattedDateDisplay(selectedDate)}
                      {' '}• {formatTime12h(formStart)} → {formatTime12h(formEnd)} ({calculateMinutesBetween(formStart, formEnd)} min)
                      {formBlockType === 'revision' ? ' • 🔁 Revision' : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                  {editingEntry && (
                    <button type="button" onClick={() => { if (window.confirm(`Delete this repeating block (${editingEntry.subject} — ${editingEntry.topic})?`)) { onDeleteEntry(editingEntry.id); setIsModalOpen(false); } }} className="mr-auto px-4 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 font-semibold transition cursor-pointer min-h-[44px] flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" /><span>Delete</span>
                    </button>
                  )}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 font-semibold transition cursor-pointer min-h-[44px]">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] text-white font-bold transition shadow-lg cursor-pointer min-h-[44px]">
                    {editingEntry ? 'Save changes' : formRepeatWeekly ? 'Add block' : 'Add for this date'}
                  </button>
                  </div>
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
