import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DailyTask, StreamType, SubtopicTarget, TimetableEntry, SyllabusTopic, BlockType } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Sparkles,
  Flame,
  Check,
  ChevronLeft,
  ChevronRight,
  Target,
  Trophy,
  BookOpen,
  Link,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getTodayDateString,
  getTodayDayOfWeek,
  getFormattedDateDisplay,
  getDayOfWeekFromDate,
  calculateMinutesBetween,
  formatTime12h,
  isEndAfterStart,
} from '../../lib/storage';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import { SubtopicTargetPicker } from '../common/SubtopicTargetPicker';
import { getBlockSubtopicTargets } from '../../lib/syllabusProgression';

interface DailyStudyPlannerProps {
  tasks: DailyTask[];
  timetableEntries: TimetableEntry[];
  syllabusTopics?: SyllabusTopic[];
  stream: StreamType;
  /** Read-only elective used to resolve subjects (no picker here). */
  physicalScienceElective?: 'Chemistry' | 'ICT';
  onToggleTask: (taskId: string) => void;
  onAddTask: (
    task: Omit<DailyTask, 'id'> & {
      syncToTimetable?: boolean;
      startTime?: string;
      endTime?: string;
    }
  ) => void;
  onDeleteTask: (taskId: string) => void;
  onSyncFromTimetable: (dateStr: string) => void;
}

export const DailyStudyPlanner: React.FC<DailyStudyPlannerProps> = ({
  tasks,
  timetableEntries,
  syllabusTopics = [],
  stream,
  physicalScienceElective = 'Chemistry',
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onSyncFromTimetable,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Available subjects for the stream
  const availableSubjects = getSubjectsForStream(stream, physicalScienceElective);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(availableSubjects[0]?.name || 'Physics');
  const [newBlockType, setNewBlockType] = useState<BlockType>('study');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<SubtopicTarget[]>([]);
  const [newStartTime, setNewStartTime] = useState('16:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [timeError, setTimeError] = useState('');

  const todayStr = getTodayDateString();
  const isViewingToday = selectedDate === todayStr;
  const selectedDayOfWeek = getDayOfWeekFromDate(selectedDate);

  // Filter tasks for the selected date
  const dateTasks = tasks.filter((t) => t.date === selectedDate);
  const totalTasks = dateTasks.length;
  const completedTasks = dateTasks.filter((t) => t.isCompleted).length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Filter by status tab
  const displayedTasks = dateTasks.filter((t) => {
    if (taskFilter === 'pending') return !t.isCompleted;
    if (taskFilter === 'completed') return t.isCompleted;
    return true;
  });

  const handleToggle = (taskId: string) => {
    onToggleTask(taskId);
    // If completing the final pending task, shoot celebration confetti
    const task = dateTasks.find((t) => t.id === taskId);
    if (task && !task.isCompleted && completedTasks + 1 === totalTasks) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6B4EFF', '#00F5FF', '#10B981', '#F59E0B'],
        });
      } catch {
        // Safe if canvas-confetti has environment limits
      }
    }
  };

  const handleDailyTopicChange = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedTargets([]);
    if (topicId) {
      const tObj = syllabusTopics.find((t) => t.id === topicId);
      if (tObj && !newTitle.trim()) {
        setNewTitle(newBlockType === 'revision' ? `Revise ${tObj.topicTitle}` : tObj.topicTitle);
      }
    }
  };

  const completedTopicsCount = syllabusTopics.filter((t) => t.status === 'completed').length;
  const completedForSubjectCount = syllabusTopics.filter(
    (t) => t.subject === newSubject && t.status === 'completed'
  ).length;
  const revisionLockedGlobally = completedTopicsCount === 0;

  const handleBlockTypeChange = (next: BlockType) => {
    if (next === 'revision' && revisionLockedGlobally) return;
    setNewBlockType(next);
    setSelectedTopicId('');
    setSelectedTargets([]);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (!isEndAfterStart(newStartTime, newEndTime)) {
      setTimeError(
        `End time (${formatTime12h(newEndTime)}) must be after start time (${formatTime12h(newStartTime)}). Times are 24-hour — e.g. 14:00 = 2:00 PM.`
      );
      return;
    }
    setTimeError('');

    const matchedTopic = syllabusTopics.find((t) => t.id === selectedTopicId);
    const cleanTargets = selectedTargets
      .filter((t) => t.subtopic.trim())
      .map((t) => ({
        subtopic: t.subtopic.trim(),
        targetProgress: Math.max(0, Math.min(100, Math.round(t.targetProgress))),
      }));
    const first = cleanTargets[0];

    onAddTask({
      date: selectedDate,
      title: newTitle.trim(),
      subject: newSubject,
      blockType: newBlockType,
      topicId: selectedTopicId || undefined,
      topicTitle: matchedTopic?.topicTitle || undefined,
      subtopic: first?.subtopic,
      targetProgress: first?.targetProgress,
      subtopicTargets: cleanTargets.length > 0 ? cleanTargets : undefined,
      isCompleted: false,
      estimatedMinutes: calculateMinutesBetween(newStartTime, newEndTime),
      priority: 'Medium',
      timeSlot: `${newStartTime} - ${newEndTime}`,
      startTime: newStartTime,
      endTime: newEndTime,
      syncToTimetable: true,
    });

    setNewTitle('');
    setNewBlockType('study');
    setSelectedTopicId('');
    setSelectedTargets([]);
    setIsAddTaskModalOpen(false);
  };

  const handleStartTimeChange = (startVal: string) => {
    setNewStartTime(startVal);
    setTimeError('');
  };

  const openAddTaskModal = () => {
    // Fresh form defaults to Study; Revision is opt-in per task.
    setNewBlockType('study');
    setTimeError('');
    setIsAddTaskModalOpen(true);
  };

  // Date shifting helpers
  const changeDateByDays = (delta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + delta);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  return (
    <div id="daily-study-planner-view" className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#161831] via-[#12142B] to-[#0F1023] p-4 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Revision • {isViewingToday ? 'Today' : selectedDayOfWeek}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold">
              <Link className="w-3 h-3 text-cyan-300" />
              <span>Timetable Synced</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {isViewingToday ? "Today's Study Plan" : `Plan for ${selectedDayOfWeek}`}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {getFormattedDateDisplay(selectedDate)} • Tasks added here automatically schedule into your Weekly Timetable.
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center rounded-2xl bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                isViewingToday
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {isViewingToday ? 'Today' : 'Back to Today'}
            </button>

            <button
              onClick={() => changeDateByDays(1)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openAddTaskModal}
            id="btn-add-daily-task"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Date & Progress Indicator Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#1A1840]/90 to-[#12142B]/90 p-5 sm:p-6 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">
              {getFormattedDateDisplay(selectedDate)}
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {totalTasks === 0
                  ? 'No tasks logged yet'
                  : `${completedTasks} of ${totalTasks} topics done`}
              </h2>
              {totalTasks > 0 && (
                <span className="text-sm font-bold text-cyan-300">({progressPercentage}%)</span>
              )}
            </div>
          </div>

          {/* Quick Sync with Timetable button */}
          <button
            onClick={() => onSyncFromTimetable(selectedDate)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer min-h-[44px] shrink-0"
            title="Import scheduled study blocks from your weekly timetable"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Timetable Slots</span>
          </button>
        </div>

        {/* Progress Bar with Milestones */}
        <div className="mt-4">
          <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_12px_rgba(0,245,255,0.6)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Daily Target Progress</span>
            {progressPercentage === 100 && totalTasks > 0 ? (
              <span className="font-bold text-emerald-300 flex items-center gap-1 animate-pulse">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                All Today's Goals Completed! Excellent Work!
              </span>
            ) : (
              <span>{totalTasks - completedTasks} tasks remaining</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs (All / Pending / Completed) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setTaskFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
            taskFilter === 'all'
              ? 'bg-[#6B4EFF] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All Tasks ({totalTasks})
        </button>
        <button
          onClick={() => setTaskFilter('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
            taskFilter === 'pending'
              ? 'bg-[#6B4EFF] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Pending ({totalTasks - completedTasks})
        </button>
        <button
          onClick={() => setTaskFilter('completed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
            taskFilter === 'completed'
              ? 'bg-[#6B4EFF] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Completed ({completedTasks})
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {displayedTasks.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#161831]/60 p-8 text-center text-slate-400 backdrop-blur-md">
            <BookOpen className="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-200">
              {totalTasks === 0
                ? `No tasks scheduled for ${isViewingToday ? 'today' : selectedDate}`
                : 'No tasks matching the selected filter.'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add custom topics, or click <strong>Import Timetable Slots</strong> above to automatically pull today's scheduled revision blocks!
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => onSyncFromTimetable(selectedDate)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-cyan-300 transition cursor-pointer min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Import from Weekly Timetable</span>
              </button>
              <button
                onClick={openAddTaskModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white transition cursor-pointer min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Task</span>
              </button>
            </div>
          </div>
        ) : (
          displayedTasks.map((task) => {
            return (
              <div
                key={task.id}
                className={`rounded-2xl border transition-all p-3.5 sm:p-4 backdrop-blur-md flex items-center justify-between gap-3 group ${
                  task.isCompleted
                    ? 'border-emerald-500/30 bg-emerald-950/15 opacity-75'
                    : task.blockType === 'revision'
                      ? 'border-teal-400/40 bg-teal-950/15 hover:border-teal-300/60'
                      : 'border-white/10 bg-[#161831]/90 hover:border-cyan-400/50'
                }`}
              >
                {/* Checkbox Target (Min 44x44px touch area) */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(task.id)}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2 text-cyan-400 hover:scale-110 active:scale-95 transition cursor-pointer rounded-xl"
                    title={task.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-400 group-hover:text-cyan-400" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {task.blockType === 'revision' && (
                        <span className="text-[10px] text-teal-200 font-bold flex items-center gap-1 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-400/40">
                          <RefreshCw className="w-2.5 h-2.5 text-teal-300" />
                          Revision 🔁
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10">
                        {task.subject}
                      </span>
                      {task.timeSlot ? (
                        <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          <Clock className="w-3 h-3" />
                          {task.timeSlot}
                        </span>
                      ) : task.estimatedMinutes ? (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimatedMinutes} min
                        </span>
                      ) : null}
                      {task.fromTimetableId && (
                        <span className="text-[10px] text-purple-300 font-semibold flex items-center gap-1 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-400/30">
                          <Link className="w-2.5 h-2.5 text-cyan-300" />
                          Timetable
                        </span>
                      )}
                      {(task.topicTitle || getBlockSubtopicTargets(task).length > 0) && (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const targets = getBlockSubtopicTargets(task);
                            if (targets.length > 0) {
                              return (
                                <>
                                  {targets.slice(0, 2).map((t) => (
                                    <span key={t.subtopic} className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-400/30">
                                      <BookOpen className="w-2.5 h-2.5 text-emerald-300" />
                                      <span className="line-clamp-1 max-w-[140px] sm:max-w-[200px]">
                                        {t.subtopic}
                                      </span>
                                      <span className="font-black text-emerald-200">• {t.targetProgress}%</span>
                                    </span>
                                  ))}
                                  {targets.length > 2 && (
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      +{targets.length - 2} more
                                    </span>
                                  )}
                                </>
                              );
                            }
                            return (
                              <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-400/30">
                                <BookOpen className="w-2.5 h-2.5 text-emerald-300" />
                                <span className="line-clamp-1 max-w-[140px] sm:max-w-[200px]">
                                  {task.topicTitle}
                                </span>
                              </span>
                            );
                          })()}
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm sm:text-base font-semibold transition-all ${
                        task.isCompleted
                          ? 'text-slate-400 line-through'
                          : 'text-white group-hover:text-cyan-300'
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>
                </div>

                {/* Delete Task button */}
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {isAddTaskModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddTaskModalOpen(false);
          }}
        >
          <div className="flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 pt-6 sm:pt-10 pb-24 sm:pb-12">
            <div
              className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-purple-500/40 bg-[#161831] shadow-2xl text-slate-100 flex flex-col max-h-[calc(100dvh-3.5rem)] sm:max-h-[min(88vh,740px)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pinned Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0 bg-[#161831]">
                <div className="flex items-center gap-2.5 text-base font-bold text-white">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block leading-tight">Add Daily Task / Goal</span>
                    <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                      {getFormattedDateDisplay(selectedDate)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs overscroll-contain">
                {/* Task Title */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Topic or Task Description <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Complete 2019 Chemistry MCQ Paper & Review Mistakes"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2.5 text-white placeholder-slate-500 font-medium focus:border-cyan-400 focus:outline-none text-xs"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject</label>
                  <select
                    value={newSubject}
                    onChange={(e) => {
                      setNewSubject(e.target.value);
                      setSelectedTopicId('');
                      setSelectedTargets([]);
                    }}
                    className="w-full rounded-xl bg-[#161831] border border-white/15 px-3 py-2.5 text-white font-medium focus:border-cyan-400 focus:outline-none text-xs"
                  >
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.name} className="bg-[#161831] text-white">
                        {s.icon} {s.name}
                      </option>
                    ))}
                    <option value="General English / GIT" className="bg-[#161831] text-white">
                      📖 General English / GIT
                    </option>
                    <option value="General Self Study" className="bg-[#161831] text-white">
                      ⚡ General Self Study
                    </option>
                  </select>
                </div>

                {/* Block type: Study vs Revision (Revision = completed topics only) */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Task Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleBlockTypeChange('study')}
                      aria-pressed={newBlockType === 'study'}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer min-h-[44px] ${
                        newBlockType === 'study'
                          ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Study</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBlockTypeChange('revision')}
                      disabled={revisionLockedGlobally}
                      title={
                        revisionLockedGlobally
                          ? 'Complete a topic first to unlock revision sessions'
                          : 'Revision is only for already-completed topics'
                      }
                      aria-pressed={newBlockType === 'revision'}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition min-h-[44px] ${
                        newBlockType === 'revision'
                          ? 'bg-teal-500/20 border-teal-400/60 text-teal-200'
                          : revisionLockedGlobally
                            ? 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white cursor-pointer'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Revision 🔁</span>
                    </button>
                  </div>
                  {revisionLockedGlobally ? (
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      🔒 Complete a topic first to unlock revision sessions — new topics can only be added as Study.
                    </p>
                  ) : newBlockType === 'revision' ? (
                    <p className="text-[11px] text-teal-300/90 mt-1.5 leading-relaxed">
                      🔁 Only <strong>completed</strong> topics are listed below
                      {completedForSubjectCount === 0 ? ` — none completed yet in ${newSubject}` : ''}. Revising earns a bonus, never changes syllabus %.
                    </p>
                  ) : null}
                </div>

                {/* Syllabus topic + per-subtopic 0-100 targets */}
                <SubtopicTargetPicker
                  syllabusTopics={syllabusTopics}
                  subject={newSubject}
                  topicId={selectedTopicId}
                  onTopicChange={handleDailyTopicChange}
                  targets={selectedTargets}
                  onTargetsChange={setSelectedTargets}
                  completedOnly={newBlockType === 'revision'}
                />

                {/* Schedule (Start & End Time, 24-hour with AM/PM preview) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Start Time <span className="text-slate-500 font-normal">(24-hour)</span></label>
                    <input
                      type="time"
                      required
                      value={newStartTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      aria-invalid={timeError ? true : undefined}
                      className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white font-medium focus:outline-none text-xs ${timeError ? 'border-rose-500 focus:border-rose-400' : 'border-white/15 focus:border-cyan-400'}`}
                    />
                    <p className="text-[11px] text-cyan-300/90 mt-1 font-semibold">{formatTime12h(newStartTime)}</p>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">End Time <span className="text-slate-500 font-normal">(24-hour)</span></label>
                    <input
                      type="time"
                      required
                      value={newEndTime}
                      onChange={(e) => { setNewEndTime(e.target.value); setTimeError(''); }}
                      aria-invalid={timeError ? true : undefined}
                      className={`w-full rounded-xl bg-white/5 border px-3 py-2 text-white font-medium focus:outline-none text-xs ${timeError ? 'border-rose-500 focus:border-rose-400' : 'border-white/15 focus:border-cyan-400'}`}
                    />
                    <p className="text-[11px] text-cyan-300/90 mt-1 font-semibold">{formatTime12h(newEndTime)}</p>
                  </div>
                </div>

                {/* Auto-calculated duration from Start - End time */}
                {timeError ? (
                  <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300">
                    ⚠️ {timeError}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[11px] text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      Duration: <strong className="text-white">{calculateMinutesBetween(newStartTime, newEndTime)} min</strong>
                      <span className="text-slate-400"> • {formatTime12h(newStartTime)} → {formatTime12h(newEndTime)} • auto-calculated</span>
                    </span>
                  </div>
                )}

                {/* Auto-sync to Weekly Timetable - collapsed */}
                <details className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5">
                  <summary className="flex items-center gap-2 text-xs font-bold text-cyan-300 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <Link className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>Auto-syncs to Weekly Timetable ({selectedDayOfWeek})</span>
                  </summary>
                  <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed pl-6">
                    Automatically adds a study slot on <strong>{selectedDayOfWeek} ({newStartTime} - {newEndTime})</strong> in your Weekly Timetable.
                  </p>
                </details>
              </div>

              {/* Pinned Sticky Footer Action Buttons */}
              <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#14162e]/95 backdrop-blur-md flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 font-semibold transition cursor-pointer min-h-[44px] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#8B5CF6] hover:from-[#7C5DFA] text-white font-bold transition shadow-lg cursor-pointer min-h-[44px] text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task & Sync</span>
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
