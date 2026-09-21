import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Target,
  Flame,
  ArrowRight,
  ChevronRight,
  Filter,
  Timer,
  CheckSquare,
  Layers,
  Award,
  Zap,
  Atom,
  FlaskConical,
  Dna,
  Laptop,
  Calculator,
  X,
  AlertCircle,
  TrendingUp,
  SlidersHorizontal,
  BookmarkCheck,
  Table,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Download,
  Copy,
  CopyPlus,
  ArrowUpDown,
  Search,
  Check,
  Save,
} from 'lucide-react';
import { ScreenId, StudyPlan, TimetableSlot, DailyCoverTopic, UserProfile, StreamType } from '../../types';
import {
  ALL_STREAM_STUDY_PLANS,
  ALL_STREAM_TIMETABLES,
  ALL_STREAM_DAILY_TOPICS,
  GCE_AL_STREAMS,
} from '../../data/streamStudyData';

interface StudyPlansScreenProps {
  userProfile: UserProfile;
  onNavigate: (screen: ScreenId) => void;
  onStartSpecificQuiz?: (questionId?: string, topic?: string) => void;
  onUpdateXP?: (points: number) => void;
  onUpdateProfile?: (partial: Partial<UserProfile>) => void;
  initialTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

type TabType = 'plans' | 'timetable' | 'daily-topics';

export const StudyPlansScreen: React.FC<StudyPlansScreenProps> = ({
  userProfile,
  onNavigate,
  onStartSpecificQuiz,
  onUpdateXP,
  onUpdateProfile,
  initialTab,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'plans');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSwitch = (tab: TabType) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [selectedStream, setSelectedStream] = useState<StreamType>(() => {
    return userProfile.stream || 'Maths';
  });

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>(() => {
    const s = userProfile.stream || 'Maths';
    return ALL_STREAM_STUDY_PLANS[s] || ALL_STREAM_STUDY_PLANS.Maths;
  });

  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    const s = userProfile.stream || 'Maths';
    try {
      const saved = localStorage.getItem(`al_timetable_${s}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return ALL_STREAM_TIMETABLES[s] || ALL_STREAM_TIMETABLES.Maths;
  });

  const [dailyTopics, setDailyTopics] = useState<DailyCoverTopic[]>(() => {
    const s = userProfile.stream || 'Maths';
    return ALL_STREAM_DAILY_TOPICS[s] || ALL_STREAM_DAILY_TOPICS.Maths;
  });

  const [timerToast, setTimerToast] = useState<string | null>(null);

  // Sync timetable to localStorage per stream
  useEffect(() => {
    try {
      localStorage.setItem(`al_timetable_${selectedStream}`, JSON.stringify(timetable));
    } catch (e) {
      // ignore
    }
  }, [timetable, selectedStream]);

  const currentStreamInfo = GCE_AL_STREAMS.find((s) => s.id === selectedStream) || GCE_AL_STREAMS[0];

  const handleSelectStream = (newStream: StreamType) => {
    setSelectedStream(newStream);
    setStudyPlans(ALL_STREAM_STUDY_PLANS[newStream] || ALL_STREAM_STUDY_PLANS.Maths);

    let streamTimetable = ALL_STREAM_TIMETABLES[newStream] || ALL_STREAM_TIMETABLES.Maths;
    try {
      const saved = localStorage.getItem(`al_timetable_${newStream}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          streamTimetable = parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    setTimetable(streamTimetable);

    const streamTopics = ALL_STREAM_DAILY_TOPICS[newStream] || ALL_STREAM_DAILY_TOPICS.Maths;
    setDailyTopics(streamTopics);
    if (streamTopics[0]) {
      setSelectedTopicDate(streamTopics[0].dateStr);
    }
    setSubjectFilter('All');

    if (onUpdateProfile) {
      onUpdateProfile({ stream: newStream });
    }
  };

  // Selected Day for Timetable
  const daysOfWeek: TimetableSlot['dayOfWeek'][] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const [selectedDay, setSelectedDay] = useState<TimetableSlot['dayOfWeek'] | 'All'>('Monday');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [timetableViewMode, setTimetableViewMode] = useState<'table' | 'weekly-grid' | 'cards'>('table');

  // Excel Spreadsheet table controls for visitors
  const [activeCell, setActiveCell] = useState<{ slotId: string; colKey: string } | null>({
    slotId: timetable[0]?.id || '',
    colKey: 'topic',
  });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(timetable[0]?.id || null);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableSortField, setTableSortField] = useState<keyof TimetableSlot | null>(null);
  const [tableSortAsc, setTableSortAsc] = useState(true);
  const [clipboardToast, setClipboardToast] = useState(false);

  // Selected Date/Day for Daily Cover Topics
  const [selectedTopicDate, setSelectedTopicDate] = useState<string>(() => {
    const s = userProfile.stream || 'Maths';
    const topics = ALL_STREAM_DAILY_TOPICS[s] || ALL_STREAM_DAILY_TOPICS.Maths;
    return topics[0]?.dateStr || '2026-09-04';
  });

  // Add Custom Timetable Slot Modal State
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState<TimetableSlot['dayOfWeek']>('Monday');
  const [newSlotStartTime, setNewSlotStartTime] = useState('04:00 PM');
  const [newSlotEndTime, setNewSlotEndTime] = useState('05:30 PM');
  const [newSlotSubject, setNewSlotSubject] = useState('Physics');
  const [newSlotTopic, setNewSlotTopic] = useState('');
  const [newSlotActivity, setNewSlotActivity] = useState<TimetableSlot['activityType']>('Past Paper MCQ Sprint');
  const [newSlotMCQs, setNewSlotMCQs] = useState(15);
  const [newSlotNotes, setNewSlotNotes] = useState('');

  // Add Custom Topic Modal State
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicUnit, setNewTopicUnit] = useState('Unit 01: Mechanics');
  const [newTopicSubtopics, setNewTopicSubtopics] = useState('');
  const [newTopicExamTips, setNewTopicExamTips] = useState('');
  const [newTopicTargetMCQs, setNewTopicTargetMCQs] = useState(15);

  // Focus Timer / Pomodoro state
  const [timerDuration, setTimerDuration] = useState<number>(25 * 60); // default 25 min in seconds
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTimerLabel, setActiveTimerLabel] = useState('25m Focus Sprint');

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      if (onUpdateXP) onUpdateXP(60);
      setTimerToast('🎉 Study Sprint Completed! +60 XP earned towards your GCE A/L target.');
      setTimeout(() => setTimerToast(null), 6000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft, onUpdateXP]);

  const handleStartTimer = (minutes: number, label: string) => {
    setTimerDuration(minutes * 60);
    setTimeLeft(minutes * 60);
    setIsTimerRunning(true);
    setActiveTimerLabel(label);
  };

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerDuration);
  };

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Active Plan logic
  const activePlan = studyPlans.find((p) => p.isActive) || studyPlans[0];

  const handleSetActivePlan = (planId: string) => {
    setStudyPlans((prev) =>
      prev.map((p) => ({
        ...p,
        isActive: p.id === planId,
      }))
    );
    const chosen = studyPlans.find((p) => p.id === planId);
    if (chosen && onUpdateProfile) {
      onUpdateProfile({ dailyGoalMCQs: chosen.dailyMCQTarget });
    }
    if (onUpdateXP) onUpdateXP(30);
  };

  // Timetable slot completion toggle
  const handleToggleSlotCompleted = (slotId: string) => {
    setTimetable((prev) =>
      prev.map((s) => {
        if (s.id === slotId) {
          const nextState = !s.isCompleted;
          if (nextState && onUpdateXP) {
            onUpdateXP(25);
          }
          return { ...s, isCompleted: nextState };
        }
        return s;
      })
    );
  };

  const handleDeleteSlot = (slotId: string) => {
    setTimetable((prev) => prev.filter((s) => s.id !== slotId));
    if (selectedRowId === slotId) {
      setSelectedRowId(null);
      setActiveCell(null);
    }
  };

  // Direct cell editing for visitor control
  const handleUpdateSlotCell = (slotId: string, field: keyof TimetableSlot, value: any) => {
    setTimetable((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, [field]: value } : s))
    );
  };

  // Insert a new row directly into spreadsheet
  const handleInsertRow = (targetDay?: TimetableSlot['dayOfWeek']) => {
    const day = targetDay || (selectedDay === 'All' ? 'Monday' : selectedDay);
    const newSlot: TimetableSlot = {
      id: `tt-custom-${Date.now()}`,
      dayOfWeek: day,
      timeSlot: 'Custom',
      startTime: '04:00 PM',
      endTime: '05:30 PM',
      subject: 'Physics',
      topic: 'New Study Topic (Click to edit)',
      activityType: 'Past Paper MCQ Sprint',
      isCompleted: false,
      targetMCQCount: 15,
      notes: 'Key formulas & past paper years',
    };
    setTimetable((prev) => [...prev, newSlot]);
    setSelectedRowId(newSlot.id);
    setActiveCell({ slotId: newSlot.id, colKey: 'topic' });
    if (onUpdateXP) onUpdateXP(10);
  };

  // Duplicate selected row
  const handleDuplicateRow = (slotId: string) => {
    const existing = timetable.find((s) => s.id === slotId);
    if (!existing) return;
    const duplicated: TimetableSlot = {
      ...existing,
      id: `tt-custom-${Date.now()}`,
      topic: `${existing.topic} (Copy)`,
      isCompleted: false,
    };
    const index = timetable.findIndex((s) => s.id === slotId);
    setTimetable((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
    setSelectedRowId(duplicated.id);
    setActiveCell({ slotId: duplicated.id, colKey: 'topic' });
    if (onUpdateXP) onUpdateXP(5);
  };

  // Reset timetable back to initial template
  const handleResetTimetable = () => {
    const defaultTimetable = ALL_STREAM_TIMETABLES[selectedStream] || ALL_STREAM_TIMETABLES.Maths;
    setTimetable(defaultTimetable);
    try {
      localStorage.removeItem(`al_timetable_${selectedStream}`);
    } catch (e) {
      // ignore
    }
    setSelectedRowId(defaultTimetable[0]?.id || null);
    setActiveCell({ slotId: defaultTimetable[0]?.id || '', colKey: 'topic' });
    setTimerToast(`Timetable reset to the standard ${currentStreamInfo.name} template.`);
    setTimeout(() => setTimerToast(null), 4000);
  };

  // Export to Excel compatible CSV
  const handleExportCSV = () => {
    const headers = ['Row', 'Status', 'Day', 'Start Time', 'End Time', 'Subject', 'Topic', 'Activity Type', 'Target MCQs', 'Notes'];
    const rows = processedSlots.map((s, idx) => [
      idx + 1,
      s.isCompleted ? 'Completed' : 'Pending',
      s.dayOfWeek,
      `"${s.startTime}"`,
      `"${s.endTime}"`,
      `"${s.subject}"`,
      `"${s.topic.replace(/"/g, '""')}"`,
      `"${s.activityType}"`,
      s.targetMCQCount || 0,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AL_Study_Timetable_${selectedDay === 'All' ? 'All_Days' : selectedDay}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy table as TSV directly to clipboard (for pasting in Excel / Sheets)
  const handleCopyTSV = () => {
    const headers = ['#', 'Status', 'Day', 'Start Time', 'End Time', 'Subject', 'Topic', 'Activity', 'MCQ Target', 'Notes'];
    const rows = processedSlots.map((s, idx) => [
      idx + 1,
      s.isCompleted ? 'Completed' : 'Pending',
      s.dayOfWeek,
      s.startTime,
      s.endTime,
      s.subject,
      s.topic,
      s.activityType,
      s.targetMCQCount || 0,
      s.notes || '',
    ]);
    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setClipboardToast(true);
    setTimeout(() => setClipboardToast(false), 3000);
  };

  // Sort helper
  const handleSortColumn = (field: keyof TimetableSlot) => {
    if (tableSortField === field) {
      setTableSortAsc(!tableSortAsc);
    } else {
      setTableSortField(field);
      setTableSortAsc(true);
    }
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotTopic.trim()) return;

    const newSlot: TimetableSlot = {
      id: `tt-custom-${Date.now()}`,
      dayOfWeek: newSlotDay,
      timeSlot: 'Custom',
      startTime: newSlotStartTime,
      endTime: newSlotEndTime,
      subject: newSlotSubject,
      topic: newSlotTopic.trim(),
      activityType: newSlotActivity,
      isCompleted: false,
      targetMCQCount: newSlotMCQs,
      notes: newSlotNotes.trim() || undefined,
    };

    setTimetable((prev) => [...prev, newSlot]);
    setIsAddSlotModalOpen(false);
    setNewSlotTopic('');
    setNewSlotNotes('');
    if (onUpdateXP) onUpdateXP(15);
  };

  // Daily Cover Topic toggles
  const handleToggleTopicItem = (
    topicId: string,
    field: 'isTheoryReviewed' | 'isFormulasLocked' | 'isMCQsCompleted'
  ) => {
    setDailyTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          const updated = { ...t, [field]: !t[field] };
          // If all 3 done, status is completed
          if (updated.isTheoryReviewed && updated.isFormulasLocked && updated.isMCQsCompleted) {
            updated.status = 'completed';
          } else {
            updated.status = 'in-progress';
          }
          if (!t[field] && onUpdateXP) {
            onUpdateXP(20);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleAddCoverTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    const subtopicsList = newTopicSubtopics
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newTopic: DailyCoverTopic = {
      id: `dct-custom-${Date.now()}`,
      dateStr: selectedTopicDate,
      dayLabel: 'Scheduled Focus',
      subject: 'Physics',
      topic: newTopicTitle.trim(),
      syllabusUnit: newTopicUnit,
      syllabusCode: 'PHY-CUSTOM',
      subtopics: subtopicsList.length > 0 ? subtopicsList : ['Core concepts and standard formulas'],
      repeatProbability: 85,
      repeatYears: [2018, 2021, 2024],
      examTips: newTopicExamTips.trim() || 'Review the official marking scheme for common pitfalls.',
      targetMCQs: newTopicTargetMCQs,
      completedMCQs: 0,
      isTheoryReviewed: false,
      isFormulasLocked: false,
      isMCQsCompleted: false,
      status: 'scheduled',
    };

    setDailyTopics((prev) => [newTopic, ...prev]);
    setIsAddTopicModalOpen(false);
    setNewTopicTitle('');
    setNewTopicSubtopics('');
    setNewTopicExamTips('');
    if (onUpdateXP) onUpdateXP(15);
  };

  // Filtered and processed timetable slots for Excel spreadsheet & views
  const processedSlots = timetable
    .filter((s) => {
      const matchDay = selectedDay === 'All' || s.dayOfWeek === selectedDay;
      const matchSubject = subjectFilter === 'All' || s.subject === subjectFilter;
      const matchSearch =
        !tableSearchQuery.trim() ||
        s.topic.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
        s.subject.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
        s.activityType.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
        s.dayOfWeek.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(tableSearchQuery.toLowerCase())) ||
        s.startTime.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
        s.endTime.toLowerCase().includes(tableSearchQuery.toLowerCase());
      return matchDay && matchSubject && matchSearch;
    })
    .sort((a, b) => {
      if (!tableSortField) return 0;
      const valA = a[tableSortField];
      const valB = b[tableSortField];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return tableSortAsc ? valA - valB : valB - valA;
      }
      return tableSortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

  // Backward compatibility alias for views that use filteredSlots
  const filteredSlots = processedSlots;

  // Active cell coordinate in Excel notation (e.g. F3)
  const getActiveCellCoordinate = () => {
    if (!activeCell) return 'A1';
    const rowIndex = processedSlots.findIndex((s) => s.id === activeCell.slotId);
    const rowNumber = rowIndex >= 0 ? rowIndex + 1 : 1;
    const colMap: Record<string, string> = {
      isCompleted: 'A',
      dayOfWeek: 'B',
      startTime: 'C',
      endTime: 'D',
      subject: 'E',
      topic: 'F',
      activityType: 'G',
      targetMCQCount: 'H',
      notes: 'I',
    };
    const colLetter = colMap[activeCell.colKey] || 'F';
    return `${colLetter}${rowNumber}`;
  };

  const getActiveCellValue = () => {
    if (!activeCell) return '';
    const slot = timetable.find((s) => s.id === activeCell.slotId);
    if (!slot) return '';
    const val = (slot as any)[activeCell.colKey];
    return val !== undefined ? String(val) : '';
  };

  const handleFormulaBarChange = (val: string) => {
    if (!activeCell) return;
    if (activeCell.colKey === 'targetMCQCount') {
      const num = parseInt(val, 10);
      handleUpdateSlotCell(activeCell.slotId, 'targetMCQCount', isNaN(num) ? 0 : num);
    } else if (activeCell.colKey === 'isCompleted') {
      handleUpdateSlotCell(activeCell.slotId, 'isCompleted', val === 'true' || val.toLowerCase() === 'done');
    } else {
      handleUpdateSlotCell(activeCell.slotId, activeCell.colKey as keyof TimetableSlot, val);
    }
  };

  // Filtered daily cover topics
  const availableTopicDates = Array.from(new Set(dailyTopics.map((t) => t.dateStr))).map((dStr, idx) => {
    const match = dailyTopics.find((t) => t.dateStr === dStr);
    return {
      dateStr: dStr,
      label: match?.dayLabel || `Day ${idx + 1}`,
      badge: idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : null,
    };
  });

  const effectiveTopicDate =
    dailyTopics.some((t) => t.dateStr === selectedTopicDate)
      ? selectedTopicDate
      : dailyTopics[0]?.dateStr || '2026-09-04';

  const filteredTopics = dailyTopics.filter((t) => t.dateStr === effectiveTopicDate);
  const totalCoveredForDate = filteredTopics.filter((t) => t.status === 'completed').length;

  return (
    <div id="mind-maze-study-plans-screen" className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Top Banner with Quick Stats & Timer Bar */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#171936] via-[#1F1E4A] to-[#12142E] p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#6B4EFF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#00F5FF]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6B4EFF]/25 border border-[#8B5CF6]/40 text-purple-200 text-xs font-semibold">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              <span>GCE A/L Science & Maths Strategy Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Study Plans, Timetables & Daily Topics
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pace your journey to 3 A's with structured revision plans, interactive weekly study timetables, and daily syllabus coverage checklists.
            </p>

            {/* Active Plan Quick Badge */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active: <strong className="text-white">{activePlan.title}</strong></span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300 font-semibold">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Day {activePlan.currentDay} of {activePlan.durationDays}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activePlan.progressPercentage}% Completed</span>
              </div>
            </div>
          </div>

          {/* Integrated Study Sprint Timer */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5 backdrop-blur-md shrink-0 w-full lg:w-80 shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-cyan-300">
                <Timer className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Study Sprint Timer</span>
              </span>
              <span className="text-[11px] text-slate-400">{activeTimerLabel}</span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider">
                {formatTimerDisplay(timeLeft)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleTimer}
                  className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isTimerRunning
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-[#6B4EFF] text-white hover:bg-[#7C5DFA] shadow-lg shadow-purple-600/30'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isTimerRunning ? 'Pause' : 'Sprint'}</span>
                </button>
                <button
                  onClick={handleResetTimer}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
              <button
                onClick={() => handleStartTimer(25, '25m Focus Sprint')}
                className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 text-center transition-colors cursor-pointer"
              >
                25m Focus
              </button>
              <button
                onClick={() => handleStartTimer(50, '50m Paper Sprint')}
                className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 text-center transition-colors cursor-pointer"
              >
                50m MCQ Drill
              </button>
              <button
                onClick={() => handleStartTimer(120, '120m Full Paper')}
                className="flex-1 py-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 text-center transition-colors cursor-pointer"
              >
                120m Model Sim
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timer Toast Notification */}
      {timerToast && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/80 p-4 text-white shadow-2xl flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </span>
            <div>
              <p className="text-sm font-bold text-emerald-200">{timerToast}</p>
              <p className="text-xs text-slate-300">Great session! Take a 5-minute break or log questions into your Mistake Notebook.</p>
            </div>
          </div>
          <button
            onClick={() => setTimerToast(null)}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* GCE A/L Stream Selector Bar */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-md space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>GCE A/L Stream Selection</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Choose your A/L track to switch plans, timetables & syllabus</span>
          </div>
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <span className="text-slate-400">Selected Stream:</span>
            <span className="font-bold text-white px-2.5 py-0.5 rounded-md bg-[#6B4EFF]/25 border border-[#8B5CF6]/40 flex items-center gap-1.5">
              <span>{currentStreamInfo.icon}</span>
              <span>{currentStreamInfo.name}</span>
            </span>
          </div>
        </div>

        {/* Stream Selector Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {GCE_AL_STREAMS.map((st) => {
            const isSelected = selectedStream === st.id;
            return (
              <button
                key={st.id}
                onClick={() => handleSelectStream(st.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? `bg-gradient-to-b from-[#6B4EFF]/30 to-[#12142E] ${st.borderColor} shadow-lg shadow-purple-900/30 ring-2 ring-cyan-400/50`
                    : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-base">{st.icon}</span>
                  <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {st.id === 'Maths' ? 'Physical Science' : st.id === 'Bio' ? 'Biological Science' : `${st.id} Stream`}
                  </span>
                  {isSelected ? (
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse ml-auto" />
                  ) : null}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">
                  {st.subjects.slice(0, 3).join(', ')}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px]">
                  <span className={`font-semibold ${isSelected ? st.textColor : 'text-slate-400'}`}>
                    {st.badge}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-white/10 text-white font-bold' : 'text-slate-500'}`}>
                    {isSelected ? 'Active' : 'Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-3 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <button
          onClick={() => handleTabSwitch('plans')}
          id="tab-study-plans"
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-[#6B4EFF] text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Revision Study Plans</span>
        </button>

        <button
          onClick={() => handleTabSwitch('timetable')}
          id="tab-timetables"
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'timetable'
              ? 'bg-[#6B4EFF] text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Weekly Timetable ({timetable.filter((s) => s.isCompleted).length}/{timetable.length} Done)</span>
        </button>

        <button
          onClick={() => handleTabSwitch('daily-topics')}
          id="tab-daily-cover-topics"
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'daily-topics'
              ? 'bg-[#6B4EFF] text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Daily Cover Topics (Syllabus)</span>
          <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase">
            Today
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: REVISION STUDY PLANS & PHASES */}
      {/* ========================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-8 animate-fade-in">
          {/* Active Plan Detail Card */}
          <div className="rounded-3xl border border-purple-500/30 bg-gradient-to-b from-[#181938] via-[#12142E] to-[#0D0E21] p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Active Study Plan
                  </span>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-cyan-300">
                    {activePlan.intensity}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white">{activePlan.title}</h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{activePlan.tagline}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-center px-3 border-r border-white/10">
                  <div className="text-xl sm:text-2xl font-black text-cyan-400">{activePlan.recommendedDailyHours}h</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Daily Study</div>
                </div>
                <div className="text-center px-3 border-r border-white/10">
                  <div className="text-xl sm:text-2xl font-black text-purple-400">{activePlan.dailyMCQTarget}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Target MCQs</div>
                </div>
                <div className="text-center px-3">
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">{activePlan.progressPercentage}%</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Completed</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="py-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Phase Progress (Day {activePlan.currentDay} of {activePlan.durationDays})</span>
                <span className="text-cyan-300 font-bold">{activePlan.durationDays - activePlan.currentDay} days remaining</span>
              </div>
              <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] via-purple-500 to-[#00F5FF] transition-all duration-500"
                  style={{ width: `${activePlan.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Plan Revision Phases */}
            <div className="space-y-4 pt-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Plan Phases & Milestones</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePlan.phases.map((phase) => (
                  <div
                    key={phase.phaseNumber}
                    className={`rounded-2xl p-5 border transition-all ${
                      phase.status === 'completed'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                        : phase.status === 'in-progress'
                        ? 'border-purple-500/50 bg-[#6B4EFF]/15 text-white shadow-lg shadow-purple-900/30'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        Phase 0{phase.phaseNumber} • {phase.duration}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          phase.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : phase.status === 'in-progress'
                            ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 animate-pulse'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {phase.status === 'completed' ? 'Done ✓' : phase.status === 'in-progress' ? 'Active Phase' : 'Upcoming'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mb-1.5">{phase.title}</h4>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">{phase.focus}</p>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Target: <strong className="text-white">{phase.targetPapers}</strong></span>
                      {phase.status === 'in-progress' && (
                        <button
                          onClick={() => onNavigate('practice')}
                          className="text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          Practice MCQs <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Outcomes Box */}
            <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target Outcomes upon Plan Completion</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200">
                {activePlan.keyOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Switch / Explore Other Curated Study Plans */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Explore Alternative A/L Revision Plans</h3>
                <p className="text-xs text-slate-400">Choose a revision plan that aligns with your timeline and current syllabus readiness.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {studyPlans.map((plan) => {
                const isSelected = plan.id === activePlan.id;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl border p-6 flex flex-col justify-between transition-all backdrop-blur-md ${
                      isSelected
                        ? 'border-purple-500/60 bg-gradient-to-b from-purple-950/40 to-slate-900/60 shadow-xl'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-cyan-300">
                          {plan.durationDays} Days
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300">
                          {plan.intensity}
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-white leading-snug">{plan.title}</h4>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{plan.tagline}</p>

                      <div className="py-2 grid grid-cols-2 gap-2 text-xs border-y border-white/10">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Daily Study</span>
                          <span className="font-bold text-white">{plan.recommendedDailyHours} Hours</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Daily MCQs</span>
                          <span className="font-bold text-white">{plan.dailyMCQTarget} Questions</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-2">
                      {isSelected ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Currently Active Plan</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetActivePlan(plan.id)}
                          className="w-full py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 text-cyan-300" />
                          <span>Switch to this Plan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: INTERACTIVE WEEKLY TIMETABLE */}
      {/* ========================================================= */}
      {activeTab === 'timetable' && (
        <div className="space-y-6 animate-fade-in">
          {/* Day Selector & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Days of Week Pills + All Week (Horizontally scrollable on mobile, flex on desktop) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedDay('All')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  selectedDay === 'All'
                    ? 'bg-[#6B4EFF] text-white shadow-md'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                <span>All Week</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  timetable.filter((s) => s.isCompleted).length === timetable.length && timetable.length > 0
                    ? 'bg-emerald-400/20 text-emerald-300'
                    : 'bg-white/10 text-slate-300'
                }`}>
                  {timetable.filter((s) => s.isCompleted).length}/{timetable.length}
                </span>
              </button>

              {daysOfWeek.map((day) => {
                const isSelected = selectedDay === day;
                const completedInDay = timetable.filter((s) => s.dayOfWeek === day && s.isCompleted).length;
                const totalInDay = timetable.filter((s) => s.dayOfWeek === day).length;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#6B4EFF] text-white shadow-md'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{day.substring(0, 3)}</span>
                    {totalInDay > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        completedInDay === totalInDay && totalInDay > 0
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {completedInDay}/{totalInDay}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* View switcher, Subject filter & Add Slot button */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                <button
                  onClick={() => setTimetableViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    timetableViewMode === 'table'
                      ? 'bg-[#6B4EFF] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Table layout with detailed columns"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setTimetableViewMode('weekly-grid')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    timetableViewMode === 'weekly-grid'
                      ? 'bg-[#6B4EFF] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="7-Day weekly timetable matrix"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Weekly Grid</span>
                </button>
                <button
                  onClick={() => setTimetableViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    timetableViewMode === 'cards'
                      ? 'bg-[#6B4EFF] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Card list layout"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>

              {/* Subject filter */}
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-[#161831] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="All">All Stream Subjects</option>
                {currentStreamInfo.subjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>

              {/* Print / Save Timetable */}
              <button
                onClick={() => window.print()}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-white/10"
                title="Print or Save Timetable as PDF"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>

              {/* Add Slot button */}
              <button
                onClick={() => {
                  setNewSlotDay(selectedDay === 'All' ? 'Monday' : selectedDay);
                  setIsAddSlotModalOpen(true);
                }}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Study Slot</span>
              </button>
            </div>
          </div>

          {/* Daily / Weekly Schedule Banner */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-sm">
                {selectedDay === 'All' ? 'All Week' : selectedDay} Study Schedule
              </span>
              <span className="text-slate-400">• Recommended daily target: 3.5 Hours</span>
            </div>
            <div className="text-slate-300 flex items-center gap-3">
              <span>Slots Completed:</span>
              <span className="font-bold text-emerald-400">
                {filteredSlots.filter((s) => s.isCompleted).length} of {filteredSlots.length}
              </span>
              <div className="w-24 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{
                    width: `${
                      filteredSlots.length > 0
                        ? Math.round((filteredSlots.filter((s) => s.isCompleted).length / filteredSlots.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredSlots.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Study Slots Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No slots match the current filter ({selectedDay === 'All' ? 'All Days' : selectedDay} • {subjectFilter}). Add a custom study block to plan your revision.
              </p>
              <button
                onClick={() => {
                  setNewSlotDay(selectedDay === 'All' ? 'Monday' : selectedDay);
                  setIsAddSlotModalOpen(true);
                }}
                className="py-2 px-4 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Study Slot</span>
              </button>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* OPTION 1: EXCEL SPREADSHEET TABLE VIEW (CONTROLLABLE) */}
              {/* ========================================================= */}
              {timetableViewMode === 'table' && (
                <div className="rounded-2xl border border-emerald-500/30 bg-[#0F141E] shadow-2xl overflow-hidden backdrop-blur-xl">
                  {/* Excel Top Ribbon Header */}
                  <div className="bg-[#107c41] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1 rounded bg-white/15 text-white shadow-inner">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs tracking-wide">
                          AL_Physics_Revision_Schedule.xlsx
                        </span>
                        <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded font-mono text-emerald-200">
                          Sheet1
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {clipboardToast && (
                        <span className="text-[11px] bg-white text-emerald-900 font-bold px-2.5 py-1 rounded shadow animate-bounce flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Copied for Excel / Sheets!</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-100 bg-black/20 px-2.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        <span>Autosaved to Storage</span>
                      </span>
                    </div>
                  </div>

                  {/* Excel Toolbar / Action Controls */}
                  <div className="bg-[#161d2b] border-b border-white/10 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    {/* Primary Spreadsheet Operations */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => handleInsertRow()}
                        className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        title="Insert a new row into timetable"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert Row</span>
                      </button>

                      <button
                        onClick={() => selectedRowId && handleDuplicateRow(selectedRowId)}
                        disabled={!selectedRowId}
                        className={`px-2.5 py-1.5 rounded font-medium inline-flex items-center gap-1 transition-all ${
                          selectedRowId
                            ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 cursor-pointer'
                            : 'bg-slate-800/40 text-slate-500 cursor-not-allowed'
                        }`}
                        title="Duplicate currently selected row"
                      >
                        <CopyPlus className="w-3.5 h-3.5" />
                        <span>Duplicate Row</span>
                      </button>

                      <button
                        onClick={() => selectedRowId && handleDeleteSlot(selectedRowId)}
                        disabled={!selectedRowId}
                        className={`px-2.5 py-1.5 rounded font-medium inline-flex items-center gap-1 transition-all ${
                          selectedRowId
                            ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 cursor-pointer'
                            : 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-transparent'
                        }`}
                        title="Delete selected row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Row</span>
                      </button>

                      <div className="h-4 w-px bg-white/15 mx-1" />

                      <button
                        onClick={handleExportCSV}
                        className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium inline-flex items-center gap-1 border border-white/10 transition-all cursor-pointer"
                        title="Export current view to Excel .CSV file"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Export .CSV</span>
                      </button>

                      <button
                        onClick={handleCopyTSV}
                        className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium inline-flex items-center gap-1 border border-white/10 transition-all cursor-pointer"
                        title="Copy to clipboard in Tab-Separated format to paste into Excel or Google Sheets"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copy for Excel</span>
                      </button>

                      <button
                        onClick={handleResetTimetable}
                        className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-medium inline-flex items-center gap-1 border border-white/10 transition-all cursor-pointer"
                        title="Reset timetable to default GCE A/L schedule"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* In-table Search box */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={tableSearchQuery}
                          onChange={(e) => setTableSearchQuery(e.target.value)}
                          placeholder="Search spreadsheet..."
                          className="pl-8 pr-7 py-1 rounded bg-[#0b0e14] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
                        />
                        {tableSearchQuery && (
                          <button
                            onClick={() => setTableSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Excel Formula Bar */}
                  <div className="bg-[#121722] border-b border-white/10 px-4 py-1.5 flex items-center gap-3 text-xs">
                    {/* Name Box (Coordinate) */}
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-[#0b0e14] border border-white/15 rounded text-emerald-400 font-mono font-bold text-xs min-w-[65px] justify-center shadow-inner">
                      <span>{getActiveCellCoordinate()}</span>
                    </div>

                    <div className="h-4 w-px bg-white/15" />

                    {/* Formula fx symbol */}
                    <span className="font-serif italic font-bold text-slate-400 select-none text-sm">
                      fx
                    </span>

                    {/* Formula Input (updates active cell) */}
                    <input
                      type="text"
                      value={getActiveCellValue()}
                      onChange={(e) => handleFormulaBarChange(e.target.value)}
                      placeholder="Select any cell to edit formula or value..."
                      className="flex-1 bg-[#0b0e14] border border-white/15 rounded px-3 py-1 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />

                    {/* Real-time Formulas / Aggregates */}
                    <div className="hidden md:flex items-center gap-2 text-[11px]">
                      <span className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-mono font-medium">
                        Σ SUM(MCQs) = {processedSlots.reduce((acc, s) => acc + (s.targetMCQCount || 0), 0)}
                      </span>
                      <span className="bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded font-mono font-medium">
                        x̄ AVG = {processedSlots.length > 0 ? (processedSlots.reduce((acc, s) => acc + (s.targetMCQCount || 0), 0) / processedSlots.length).toFixed(1) : 0}
                      </span>
                      <span className="bg-purple-950/40 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-mono font-medium">
                        ✓ DONE = {processedSlots.filter((s) => s.isCompleted).length}/{processedSlots.length}
                      </span>
                    </div>
                  </div>

                  {/* Spreadsheet Main Grid */}
                  <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                    <table className="w-full text-left border-collapse min-w-[1020px] select-text">
                      {/* Column Letters Row (Excel Header) */}
                      <thead className="sticky top-0 z-20">
                        <tr className="bg-[#1a2232] text-[10px] font-bold text-slate-400 border-b border-slate-700">
                          {/* Top-left corner */}
                          <th className="w-10 py-1.5 px-2 bg-[#20293d] border-r border-slate-700 text-center font-mono">
                            #
                          </th>
                          {/* Col A */}
                          <th
                            onClick={() => handleSortColumn('isCompleted')}
                            className="py-1.5 px-2 border-r border-slate-700 cursor-pointer hover:bg-slate-700/50 w-24 text-center transition-colors"
                            title="Click to sort by Status"
                          >
                            <div className="flex items-center justify-center gap-1 font-mono">
                              <span>A</span>
                              <span className="text-slate-300 font-sans font-bold">Status</span>
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                            </div>
                          </th>
                          {/* Col B */}
                          <th
                            onClick={() => handleSortColumn('dayOfWeek')}
                            className="py-1.5 px-2.5 border-r border-slate-700 cursor-pointer hover:bg-slate-700/50 w-32 transition-colors"
                            title="Click to sort by Day"
                          >
                            <div className="flex items-center gap-1 font-mono">
                              <span>B</span>
                              <span className="text-slate-300 font-sans font-bold">Day</span>
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                            </div>
                          </th>
                          {/* Col C */}
                          <th
                            onClick={() => handleSortColumn('startTime')}
                            className="py-1.5 px-2.5 border-r border-slate-700 cursor-pointer hover:bg-slate-700/50 w-28 transition-colors"
                            title="Click to sort by Start Time"
                          >
                            <div className="flex items-center gap-1 font-mono">
                              <span>C</span>
                              <span className="text-slate-300 font-sans font-bold">Start Time</span>
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                            </div>
                          </th>
                          {/* Col D */}
                          <th className="py-1.5 px-2.5 border-r border-slate-700 w-28">
                            <div className="flex items-center gap-1 font-mono">
                              <span>D</span>
                              <span className="text-slate-300 font-sans font-bold">End Time</span>
                            </div>
                          </th>
                          {/* Col E */}
                          <th
                            onClick={() => handleSortColumn('subject')}
                            className="py-1.5 px-2.5 border-r border-slate-700 cursor-pointer hover:bg-slate-700/50 w-36 transition-colors"
                            title="Click to sort by Subject"
                          >
                            <div className="flex items-center gap-1 font-mono">
                              <span>E</span>
                              <span className="text-slate-300 font-sans font-bold">Subject</span>
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                            </div>
                          </th>
                          {/* Col F */}
                          <th
                            onClick={() => handleSortColumn('topic')}
                            className="py-1.5 px-2.5 border-r border-slate-700 cursor-pointer hover:bg-slate-700/50 min-w-[240px] transition-colors"
                            title="Click to sort by Topic"
                          >
                            <div className="flex items-center gap-1 font-mono">
                              <span>F</span>
                              <span className="text-slate-300 font-sans font-bold">Topic / Syllabus Focus</span>
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                            </div>
                          </th>
                          {/* Col G */}
                          <th
                            onClick={() => handleSortColumn('activityType')}
                            className="py-1.5 px-2.5 border-r border-slate-700 cursor-pointer hover:bg-slate-700/50 w-44 transition-colors"
                            title="Click to sort by Activity Type"
                          >
                            <div className="flex items-center gap-1 font-mono">
                              <span>G</span>
                              <span className="text-slate-300 font-sans font-bold">Activity Type</span>
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                            </div>
                          </th>
                          {/* Col H */}
                          <th
                            onClick={() => handleSortColumn('targetMCQCount')}
                            className="py-1.5 px-2 border-r border-slate-700 cursor-pointer hover:bg-slate-700/50 w-24 text-center transition-colors"
                            title="Click to sort by Target MCQs"
                          >
                            <div className="flex items-center justify-center gap-1 font-mono">
                              <span>H</span>
                              <span className="text-slate-300 font-sans font-bold">MCQs</span>
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                            </div>
                          </th>
                          {/* Col I */}
                          <th className="py-1.5 px-2.5 border-r border-slate-700 min-w-[180px]">
                            <div className="flex items-center gap-1 font-mono">
                              <span>I</span>
                              <span className="text-slate-300 font-sans font-bold">Notes / Tips</span>
                            </div>
                          </th>
                          {/* Col J */}
                          <th className="py-1.5 px-2.5 w-24 text-center">
                            <div className="flex items-center justify-center gap-1 font-mono">
                              <span>J</span>
                              <span className="text-slate-300 font-sans font-bold">Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>

                      {/* Spreadsheet Rows */}
                      <tbody className="divide-y divide-slate-800/80 text-xs font-sans">
                        {processedSlots.map((slot, index) => {
                          const rowNum = index + 1;
                          const isRowSelected = selectedRowId === slot.id;
                          const isPhysics = slot.subject.toLowerCase().includes('physic');

                          const cellStyle = (colKey: string) => {
                            const isCellActive =
                              activeCell?.slotId === slot.id && activeCell?.colKey === colKey;
                            return `border-r border-slate-800/80 relative transition-all ${
                              isCellActive
                                ? 'ring-2 ring-emerald-400 bg-emerald-500/10 z-10'
                                : ''
                            }`;
                          };

                          return (
                            <tr
                              key={slot.id}
                              onClick={() => setSelectedRowId(slot.id)}
                              className={`transition-colors ${
                                isRowSelected
                                  ? 'bg-[#182338]'
                                  : slot.isCompleted
                                  ? 'bg-emerald-950/10 hover:bg-[#151c2a]'
                                  : 'hover:bg-[#131a27]'
                              }`}
                            >
                              {/* Row Index (Excel Row Number) */}
                              <td
                                onClick={() => {
                                  setSelectedRowId(slot.id);
                                  setActiveCell({ slotId: slot.id, colKey: 'topic' });
                                }}
                                className={`py-2 px-1 text-center font-mono text-[11px] border-r border-slate-700 select-none cursor-pointer ${
                                  isRowSelected
                                    ? 'bg-emerald-700 text-white font-bold'
                                    : 'bg-[#182030] text-slate-400 hover:text-white'
                                }`}
                              >
                                {rowNum}
                              </td>

                              {/* Col A: Status (Checkbox / Done Toggle) */}
                              <td className={`${cellStyle('isCompleted')} py-2 px-2 text-center`}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSlotCompleted(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'isCompleted' });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer inline-flex items-center gap-1 ${
                                    slot.isCompleted
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                      : 'bg-slate-800 text-slate-400 border-white/10 hover:border-emerald-400 hover:text-white'
                                  }`}
                                  title="Click to toggle status (+25 XP)"
                                >
                                  {slot.isCompleted ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>Done</span>
                                    </>
                                  ) : (
                                    <span>Pending</span>
                                  )}
                                </button>
                              </td>

                              {/* Col B: Day (Inline Dropdown) */}
                              <td className={`${cellStyle('dayOfWeek')} py-1.5 px-2`}>
                                <select
                                  value={slot.dayOfWeek}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'dayOfWeek' });
                                  }}
                                  onChange={(e) =>
                                    handleUpdateSlotCell(slot.id, 'dayOfWeek', e.target.value as TimetableSlot['dayOfWeek'])
                                  }
                                  className="w-full bg-transparent border-0 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer hover:bg-white/5 rounded px-1 py-1"
                                >
                                  {daysOfWeek.map((d) => (
                                    <option key={d} value={d} className="bg-[#1a2232] text-white">
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Col C: Start Time (Inline Input) */}
                              <td className={`${cellStyle('startTime')} py-1.5 px-2`}>
                                <input
                                  type="text"
                                  value={slot.startTime}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'startTime' });
                                  }}
                                  onChange={(e) =>
                                    handleUpdateSlotCell(slot.id, 'startTime', e.target.value)
                                  }
                                  className="w-full bg-transparent border-0 text-cyan-300 font-mono text-xs font-semibold focus:outline-none hover:bg-white/5 rounded px-1 py-1"
                                  placeholder="06:00 AM"
                                />
                              </td>

                              {/* Col D: End Time (Inline Input) */}
                              <td className={`${cellStyle('endTime')} py-1.5 px-2`}>
                                <input
                                  type="text"
                                  value={slot.endTime}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'endTime' });
                                  }}
                                  onChange={(e) =>
                                    handleUpdateSlotCell(slot.id, 'endTime', e.target.value)
                                  }
                                  className="w-full bg-transparent border-0 text-slate-300 font-mono text-xs focus:outline-none hover:bg-white/5 rounded px-1 py-1"
                                  placeholder="07:30 AM"
                                />
                              </td>

                              {/* Col E: Subject (Inline Dropdown) */}
                              <td className={`${cellStyle('subject')} py-1.5 px-2`}>
                                <select
                                  value={slot.subject}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'subject' });
                                  }}
                                  onChange={(e) =>
                                    handleUpdateSlotCell(slot.id, 'subject', e.target.value)
                                  }
                                  className={`w-full bg-transparent border-0 text-xs font-bold focus:outline-none cursor-pointer hover:bg-white/5 rounded px-1 py-1 ${
                                    isPhysics
                                      ? 'text-purple-300'
                                      : slot.subject.toLowerCase().includes('math')
                                      ? 'text-blue-300'
                                      : 'text-emerald-300'
                                  }`}
                                >
                                  <option value="Physics" className="bg-[#1a2232] text-purple-300">
                                    Physics
                                  </option>
                                  <option value="Combined Maths" className="bg-[#1a2232] text-blue-300">
                                    Combined Maths
                                  </option>
                                  <option value="Chemistry" className="bg-[#1a2232] text-emerald-300">
                                    Chemistry
                                  </option>
                                  <option value="ICT" className="bg-[#1a2232] text-cyan-300">
                                    ICT
                                  </option>
                                  <option value="General English" className="bg-[#1a2232] text-amber-300">
                                    General English
                                  </option>
                                </select>
                              </td>

                              {/* Col F: Topic & Syllabus Focus (Direct Editable Input) */}
                              <td className={`${cellStyle('topic')} py-1.5 px-2`}>
                                <input
                                  type="text"
                                  value={slot.topic}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'topic' });
                                  }}
                                  onChange={(e) =>
                                    handleUpdateSlotCell(slot.id, 'topic', e.target.value)
                                  }
                                  className={`w-full bg-transparent border-0 text-xs font-medium focus:outline-none hover:bg-white/5 rounded px-1.5 py-1 ${
                                    slot.isCompleted ? 'line-through text-slate-400' : 'text-white'
                                  }`}
                                  placeholder="Type study topic or past paper year..."
                                />
                              </td>

                              {/* Col G: Activity Type (Inline Dropdown) */}
                              <td className={`${cellStyle('activityType')} py-1.5 px-2`}>
                                <select
                                  value={slot.activityType}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'activityType' });
                                  }}
                                  onChange={(e) =>
                                    handleUpdateSlotCell(
                                      slot.id,
                                      'activityType',
                                      e.target.value as TimetableSlot['activityType']
                                    )
                                  }
                                  className="w-full bg-transparent border-0 text-slate-300 text-xs focus:outline-none cursor-pointer hover:bg-white/5 rounded px-1 py-1"
                                >
                                  <option value="Past Paper MCQ Sprint" className="bg-[#1a2232] text-white">
                                    Past Paper MCQ Sprint
                                  </option>
                                  <option value="Theory Revision" className="bg-[#1a2232] text-white">
                                    Theory Revision
                                  </option>
                                  <option value="Mistake Review & Flashcards" className="bg-[#1a2232] text-white">
                                    Mistake Review & Flashcards
                                  </option>
                                  <option value="Structured Essay Practice" className="bg-[#1a2232] text-white">
                                    Structured Essay Practice
                                  </option>
                                  <option value="Formula Derivations" className="bg-[#1a2232] text-white">
                                    Formula Derivations
                                  </option>
                                  <option value="Full Paper Mock Exam" className="bg-[#1a2232] text-white">
                                    Full Paper Mock Exam
                                  </option>
                                </select>
                              </td>

                              {/* Col H: Target MCQs (Inline Number Input) */}
                              <td className={`${cellStyle('targetMCQCount')} py-1.5 px-2 text-center`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="200"
                                  value={slot.targetMCQCount || 0}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'targetMCQCount' });
                                  }}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    handleUpdateSlotCell(slot.id, 'targetMCQCount', isNaN(val) ? 0 : val);
                                  }}
                                  className="w-16 mx-auto text-center bg-transparent border-0 text-amber-300 font-mono font-bold text-xs focus:outline-none hover:bg-white/5 rounded py-1"
                                />
                              </td>

                              {/* Col I: Notes / Hints (Inline Input) */}
                              <td className={`${cellStyle('notes')} py-1.5 px-2`}>
                                <input
                                  type="text"
                                  value={slot.notes || ''}
                                  onFocus={() => {
                                    setSelectedRowId(slot.id);
                                    setActiveCell({ slotId: slot.id, colKey: 'notes' });
                                  }}
                                  onChange={(e) =>
                                    handleUpdateSlotCell(slot.id, 'notes', e.target.value)
                                  }
                                  placeholder="Add revision hints or formulas..."
                                  className="w-full bg-transparent border-0 text-slate-400 text-xs focus:outline-none hover:bg-white/5 rounded px-1.5 py-1"
                                />
                              </td>

                              {/* Col J: Actions */}
                              <td className="py-1.5 px-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {isPhysics && (
                                    <button
                                      onClick={() => onNavigate('practice')}
                                      className="p-1 rounded bg-purple-600/30 hover:bg-purple-600/60 text-purple-200 transition-colors cursor-pointer"
                                      title="Launch physics quiz for this topic"
                                    >
                                      <Atom className="w-3.5 h-3.5 text-cyan-300" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDuplicateRow(slot.id)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                    title="Duplicate row"
                                  >
                                    <CopyPlus className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Excel Append Row Button */}
                        <tr
                          onClick={() => handleInsertRow()}
                          className="bg-[#121824] hover:bg-[#182338] text-slate-400 hover:text-emerald-300 border-t border-dashed border-slate-700 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                            +
                          </td>
                          <td colSpan={10} className="py-2.5 px-4 text-xs font-medium">
                            <span className="inline-flex items-center gap-2">
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Click here to insert Row {processedSlots.length + 1} into spreadsheet...</span>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Excel Bottom Status Bar */}
                  <div className="bg-[#107c41] text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-sans select-none">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
                        <span>Ready</span>
                      </span>
                      <span className="text-emerald-100 hidden sm:inline">•</span>
                      <span className="text-emerald-100 font-mono hidden sm:inline">
                        Active: [{getActiveCellCoordinate()}]
                      </span>
                      <span className="text-emerald-100 hidden md:inline">•</span>
                      <span className="text-emerald-100 hidden md:inline">
                        Sheet1: Weekly Routine
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-[11px]">
                      <span>COUNT: {processedSlots.length}</span>
                      <span>
                        DONE: {processedSlots.filter((s) => s.isCompleted).length}
                      </span>
                      <span className="font-bold text-amber-200">
                        SUM: {processedSlots.reduce((acc, s) => acc + (s.targetMCQCount || 0), 0)} MCQs
                      </span>
                      <span className="hidden sm:inline">
                        AVG: {processedSlots.length > 0 ? (processedSlots.reduce((acc, s) => acc + (s.targetMCQCount || 0), 0) / processedSlots.length).toFixed(1) : 0}
                      </span>
                      <span className="bg-black/20 px-2 py-0.5 rounded text-[10px] text-emerald-200">
                        100%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* OPTION 2: WEEKLY 7-DAY TIMETABLE GRID MATRIX */}
              {/* ========================================================= */}
              {timetableViewMode === 'weekly-grid' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[960px] text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-3 w-40 text-left border-r border-white/10">Time Slot</th>
                          {daysOfWeek.map((day) => {
                            const dayCompleted = timetable.filter((s) => s.dayOfWeek === day && s.isCompleted).length;
                            const dayTotal = timetable.filter((s) => s.dayOfWeek === day).length;
                            const isCurrentSelected = selectedDay === day;

                            return (
                              <th
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`py-3 px-3 text-center border-r border-white/5 last:border-r-0 cursor-pointer transition-colors ${
                                  isCurrentSelected ? 'bg-[#6B4EFF]/20 text-white' : 'hover:bg-white/[0.02]'
                                }`}
                              >
                                <div className="font-bold text-white text-xs">{day}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {dayCompleted}/{dayTotal} Done
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {[
                          { label: 'Morning', time: '06:00 - 08:00', key: 'Morning (06:00 - 08:00)' },
                          { label: 'Afternoon', time: '14:00 - 16:30', key: 'Afternoon (14:00 - 16:30)' },
                          { label: 'Evening', time: '18:00 - 20:00', key: 'Evening (18:00 - 20:00)' },
                          { label: 'Night', time: '20:30 - 22:30', key: 'Night (20:30 - 22:30)' },
                        ].map((period) => (
                          <tr key={period.key} className="hover:bg-white/[0.01] transition-colors">
                            {/* Time column */}
                            <td className="py-3 px-3 font-semibold text-slate-300 bg-white/[0.02] border-r border-white/10 align-top">
                              <div className="text-cyan-300 font-bold text-xs">{period.label}</div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">{period.time}</div>
                            </td>

                            {/* Days columns */}
                            {daysOfWeek.map((day) => {
                              const matchingSlots = timetable.filter(
                                (s) =>
                                  s.dayOfWeek === day &&
                                  (s.timeSlot === period.key ||
                                    (period.label === 'Morning' && s.startTime.includes('06:')) ||
                                    (period.label === 'Afternoon' && (s.startTime.includes('02:') || s.startTime.includes('03:'))) ||
                                    (period.label === 'Evening' && s.startTime.includes('06:')) ||
                                    (period.label === 'Night' && s.startTime.includes('08:'))) &&
                                  (subjectFilter === 'All' || s.subject === subjectFilter)
                              );

                              return (
                                <td
                                  key={day}
                                  className="p-2 border-r border-white/5 last:border-r-0 align-top min-w-[130px] max-w-[170px]"
                                >
                                  {matchingSlots.length === 0 ? (
                                    <button
                                      onClick={() => {
                                        setNewSlotDay(day);
                                        setNewSlotStartTime(period.time.split(' - ')[0] + (period.label === 'Morning' ? ' AM' : ' PM'));
                                        setNewSlotEndTime(period.time.split(' - ')[1] + (period.label === 'Morning' ? ' AM' : ' PM'));
                                        setIsAddSlotModalOpen(true);
                                      }}
                                      className="w-full py-4 text-[10px] text-slate-600 hover:text-cyan-400 hover:bg-white/5 rounded-lg border border-dashed border-white/5 hover:border-cyan-400/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Add Slot</span>
                                    </button>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {matchingSlots.map((slot) => {
                                        const isPhysics = slot.subject.toLowerCase().includes('physic');

                                        return (
                                          <div
                                            key={slot.id}
                                            className={`p-2 rounded-xl border text-left transition-all ${
                                              slot.isCompleted
                                                ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                                                : 'bg-white/5 border-white/10 hover:border-white/25 text-white'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-1">
                                              <span
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                  isPhysics
                                                    ? 'bg-purple-500/20 text-purple-300'
                                                    : 'bg-blue-500/20 text-blue-300'
                                                }`}
                                              >
                                                {slot.subject}
                                              </span>
                                              <button
                                                onClick={() => handleToggleSlotCompleted(slot.id)}
                                                className={`p-0.5 rounded cursor-pointer ${
                                                  slot.isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-white'
                                                }`}
                                                title={slot.isCompleted ? 'Done' : 'Mark complete'}
                                              >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            <div
                                              className={`text-[11px] font-semibold mt-1 line-clamp-2 ${
                                                slot.isCompleted ? 'line-through text-slate-400' : 'text-white'
                                              }`}
                                            >
                                              {slot.topic}
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-white/5">
                                              <span>{slot.startTime}</span>
                                              {slot.targetMCQCount && (
                                                <span className="text-amber-300 font-bold">{slot.targetMCQCount} Qs</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* OPTION 3: ORIGINAL CARDS VIEW (PRESERVED) */}
              {/* ========================================================= */}
              {timetableViewMode === 'cards' && (
                <div className="space-y-3">
                  {filteredSlots.map((slot) => {
                    const isPhysics = slot.subject.toLowerCase().includes('physic');

                    return (
                      <div
                        key={slot.id}
                        className={`rounded-2xl border p-5 backdrop-blur-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          slot.isCompleted
                            ? 'border-emerald-500/40 bg-emerald-950/15 text-slate-300'
                            : 'border-white/10 bg-white/5 hover:border-white/20 text-white'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Completion toggle button */}
                          <button
                            onClick={() => handleToggleSlotCompleted(slot.id)}
                            className={`mt-0.5 p-1.5 rounded-xl border transition-all cursor-pointer ${
                              slot.isCompleted
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                : 'border-white/20 bg-white/5 hover:border-cyan-400 text-transparent'
                            }`}
                            title={slot.isCompleted ? 'Mark as incomplete' : 'Mark completed (+25 XP)'}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>

                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{slot.startTime} - {slot.endTime}</span>
                              </span>

                              {selectedDay === 'All' && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10 text-slate-300 border border-white/10">
                                  {slot.dayOfWeek}
                                </span>
                              )}

                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                                  isPhysics
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {slot.subject}
                              </span>

                              <span className="text-[11px] font-semibold text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                {slot.activityType}
                              </span>

                              {slot.targetMCQCount && (
                                <span className="text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
                                  Target: {slot.targetMCQCount} MCQs
                                </span>
                              )}
                            </div>

                            <h4
                              className={`text-base font-bold ${
                                slot.isCompleted ? 'line-through text-slate-400' : 'text-white'
                              }`}
                            >
                              {slot.topic}
                            </h4>

                            {slot.notes && (
                              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl bg-black/20 p-2 rounded-lg border border-white/5">
                                💡 <span className="text-slate-300 font-medium">{slot.notes}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                          {isPhysics && (
                            <button
                              onClick={() => onNavigate('practice')}
                              className="py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Atom className="w-3.5 h-3.5 text-cyan-300" />
                              <span>Practice Quiz</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DAILY COVER TOPICS (SYLLABUS CHECKLIST & DRILLS) */}
      {/* ========================================================= */}
      {activeTab === 'daily-topics' && (
        <div className="space-y-6 animate-fade-in">
          {/* Day Picker Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {availableTopicDates.map((item) => {
                const isSelected = effectiveTopicDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    onClick={() => setSelectedTopicDate(item.dateStr)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#6B4EFF] text-white shadow-lg'
                        : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 font-bold uppercase">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => window.print()}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-white/10"
                title="Print or export topic checklist"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Export Checklist</span>
              </button>
              <button
                onClick={() => setIsAddTopicModalOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Topic</span>
              </button>
            </div>
          </div>

          {/* Today's Coverage Progress Summary Card */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 via-purple-950/20 to-white/5 p-5 sm:p-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Syllabus Checklist: {effectiveTopicDate}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Focus for {availableTopicDates.find(d => d.dateStr === effectiveTopicDate)?.label || effectiveTopicDate}
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Core syllabus topics mapped across past examination papers with formulas and structured review.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-black/30 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                  <div className="text-xl font-black text-cyan-300">
                    {totalCoveredForDate} / {filteredTopics.length}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Topics Mastered</div>
                </div>
                <div className="bg-black/30 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                  <div className="text-xl font-black text-purple-300">
                    {filteredTopics.reduce((acc, t) => acc + t.completedMCQs, 0)} / {filteredTopics.reduce((acc, t) => acc + t.targetMCQs, 0)}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Target MCQs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Cover Topic Cards */}
          {filteredTopics.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Topics Scheduled for this Date</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Schedule a custom syllabus topic with formula notes and target MCQ counts.
              </p>
              <button
                onClick={() => setIsAddTopicModalOpen(true)}
                className="py-2 px-4 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold cursor-pointer"
              >
                + Add Topic
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md space-y-5 hover:border-white/20 transition-all shadow-lg"
                >
                  {/* Topic Header Row */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-lg">
                          {topic.syllabusUnit}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                          {topic.syllabusCode}
                        </span>
                        <span className="text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>Key Exam Concept</span>
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-white">{topic.topic}</h4>
                      <p className="text-xs text-slate-400">
                        Frequent exam appearances: <strong className="text-slate-200">{topic.repeatYears.join(', ')}</strong>
                      </p>
                    </div>

                    {/* Direct Practice Button */}
                    <div className="shrink-0 pt-2 lg:pt-0">
                      <button
                        onClick={() => {
                          if (onStartSpecificQuiz) {
                            onStartSpecificQuiz(undefined, topic.topic);
                          } else {
                            onNavigate('practice');
                          }
                        }}
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#6B4EFF] to-[#00F5FF] hover:opacity-90 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-purple-950" />
                        <span>Practice MCQs for this Topic</span>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-950" />
                      </button>
                    </div>
                  </div>

                  {/* Subtopics and Formulas breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-black/30 border border-white/5 p-4 space-y-2">
                      <h5 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Key Concepts & Formulas to Lock</span>
                      </h5>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {topic.subtopics.map((sub, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{sub}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
                      <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Examiner Pitfall & Shortcut Tip</span>
                      </h5>
                      <p className="text-xs text-slate-200 leading-relaxed">{topic.examTips}</p>
                    </div>
                  </div>

                  {/* 3 Interactive Daily Milestone Checkboxes */}
                  <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Checkbox 1: Theory */}
                    <button
                      onClick={() => handleToggleTopicItem(topic.id, 'isTheoryReviewed')}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        topic.isTheoryReviewed
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">1. Theory Reviewed</span>
                        <span className="text-[10px] text-slate-400">Read notes & derivations</span>
                      </div>
                      {topic.isTheoryReviewed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                      )}
                    </button>

                    {/* Checkbox 2: Formulas */}
                    <button
                      onClick={() => handleToggleTopicItem(topic.id, 'isFormulasLocked')}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        topic.isFormulasLocked
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">2. Formulas Locked</span>
                        <span className="text-[10px] text-slate-400">Written from memory</span>
                      </div>
                      {topic.isFormulasLocked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                      )}
                    </button>

                    {/* Checkbox 3: Target MCQs */}
                    <button
                      onClick={() => handleToggleTopicItem(topic.id, 'isMCQsCompleted')}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        topic.isMCQsCompleted
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">3. Target MCQs ({topic.completedMCQs}/{topic.targetMCQs})</span>
                        <span className="text-[10px] text-slate-400">Practiced under time limit</span>
                      </div>
                      {topic.isMCQsCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD CUSTOM TIMETABLE SLOT */}
      {/* ========================================================= */}
      {isAddSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#161831] p-6 sm:p-8 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <span>Add Study Timetable Slot</span>
              </h3>
              <button
                onClick={() => setIsAddSlotModalOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Day of Week</label>
                  <select
                    value={newSlotDay}
                    onChange={(e) => setNewSlotDay(e.target.value as TimetableSlot['dayOfWeek'])}
                    className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {daysOfWeek.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject</label>
                  <select
                    value={newSlotSubject}
                    onChange={(e) => setNewSlotSubject(e.target.value)}
                    className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    {currentStreamInfo.subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
                  <input
                    type="text"
                    value={newSlotStartTime}
                    onChange={(e) => setNewSlotStartTime(e.target.value)}
                    placeholder="e.g. 06:00 AM"
                    className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time</label>
                  <input
                    type="text"
                    value={newSlotEndTime}
                    onChange={(e) => setNewSlotEndTime(e.target.value)}
                    placeholder="e.g. 07:30 AM"
                    className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Topic / Chapter</label>
                <input
                  type="text"
                  value={newSlotTopic}
                  onChange={(e) => setNewSlotTopic(e.target.value)}
                  placeholder="e.g. Mechanics: Rotational Dynamics & Inertia"
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Activity Type</label>
                  <select
                    value={newSlotActivity}
                    onChange={(e) => setNewSlotActivity(e.target.value as TimetableSlot['activityType'])}
                    className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Past Paper MCQ Sprint">Past Paper MCQ Sprint</option>
                    <option value="Theory Revision">Theory Revision</option>
                    <option value="Formula Recall">Formula Recall</option>
                    <option value="Mistake Analysis">Mistake Analysis</option>
                    <option value="Timed Model Paper">Timed Model Paper</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target MCQs</label>
                  <input
                    type="number"
                    value={newSlotMCQs}
                    onChange={(e) => setNewSlotMCQs(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Key Reminder / Notes (Optional)</label>
                <input
                  type="text"
                  value={newSlotNotes}
                  onChange={(e) => setNewSlotNotes(e.target.value)}
                  placeholder="e.g. Review solid cylinder vs hollow ring formula"
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSlotModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white font-bold shadow-lg"
                >
                  Save Timetable Slot (+15 XP)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD CUSTOM DAILY COVER TOPIC */}
      {/* ========================================================= */}
      {isAddTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#161831] p-6 sm:p-8 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <span>Add Daily Cover Topic</span>
              </h3>
              <button
                onClick={() => setIsAddTopicModalOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCoverTopic} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Date</label>
                <input
                  type="date"
                  value={selectedTopicDate}
                  onChange={(e) => setSelectedTopicDate(e.target.value)}
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Syllabus Unit</label>
                <select
                  value={newTopicUnit}
                  onChange={(e) => setNewTopicUnit(e.target.value)}
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Unit 01: Mechanics">Unit 01: Mechanics</option>
                  <option value="Unit 02: Waves & Sound">Unit 02: Waves & Sound</option>
                  <option value="Unit 03: Thermal Physics">Unit 03: Thermal Physics</option>
                  <option value="Unit 04: Electricity & Magnetism">Unit 04: Electricity & Magnetism</option>
                  <option value="Unit 05: Electronics">Unit 05: Electronics</option>
                  <option value="Unit 06: Modern Physics">Unit 06: Modern Physics</option>
                  <option value="Unit 07: Properties of Matter">Unit 07: Properties of Matter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Topic Title</label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="e.g. Poiseuille Flow & Viscosity Coefficient"
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subtopics / Formulas (1 per line)</label>
                <textarea
                  value={newTopicSubtopics}
                  onChange={(e) => setNewTopicSubtopics(e.target.value)}
                  rows={3}
                  placeholder="Rate of flow Q = (pi r^4 delta P) / (8 eta L)&#10;Terminal velocity with Stokes Law"
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Exam Tips / Pitfalls</label>
                <input
                  type="text"
                  value={newTopicExamTips}
                  onChange={(e) => setNewTopicExamTips(e.target.value)}
                  placeholder="e.g. Flow rate scales with radius to the 4th power (r^4)!"
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Daily Target MCQs</label>
                <input
                  type="number"
                  value={newTopicTargetMCQs}
                  onChange={(e) => setNewTopicTargetMCQs(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="w-full bg-[#0D0E21] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTopicModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white font-bold shadow-lg"
                >
                  Schedule Topic (+15 XP)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
