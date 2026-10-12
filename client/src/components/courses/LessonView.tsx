import React, { useState } from 'react';
import { api, getAuthToken, getStoredUser } from '../../services/api';
import { Lesson, Progress, button, panel, control, youtubeEmbed, extractYouTubeId, CurriculumBlock, CurriculumQuizQuestion } from './learning';
import { CleanVideoPlayer } from './CleanVideoPlayer';
import {
  Shield,
  Lock,
  Play,
  FileText,
  CheckCircle2,
  AlertCircle,
  Radio,
  Calendar,
  Clock,
  ExternalLink,
  BookOpen,
  Layers,
  Download,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  Maximize2,
  Award,
  FileSpreadsheet,
  Upload,
  Send,
} from 'lucide-react';

export function LessonView({
  lesson,
  progress,
  onProgress,
  onNext,
  onBack,
  preview = false,
}: {
  lesson: Lesson;
  progress?: Progress;
  onProgress: (p: Progress) => void;
  onNext?: () => void;
  onBack?: () => void;
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mistakesOnly, setMistakesOnly] = useState(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  // Paper submission state
  const [paperFiles, setPaperFiles] = useState<{ [blockKey: string]: File }>({});
  const [paperNotes, setPaperNotes] = useState<{ [blockKey: string]: string }>({});
  const [submittingPaperKey, setSubmittingPaperKey] = useState<string | null>(null);
  const [paperSubmitMessage, setPaperSubmitMessage] = useState<{ [blockKey: string]: string }>({});
  const [localProgress, setLocalProgress] = useState<Progress | undefined>(progress);

  React.useEffect(() => {
    setLocalProgress(progress);
  }, [progress]);

  const currentUser = getStoredUser();
  const signedIn = Boolean(getAuthToken());
  const quiz = lesson.quiz || [];

  // Main sequential curriculum: excludes live classes which live in the dedicated live class box
  const activeCurriculumBlocks = (lesson.curriculumBlocks || []).filter((b) => b.type !== 'live_class');

  // Helper to identify a block
  const getBlockKey = (block: any, idx: number): string => {
    return block?._id ? String(block._id) : `block-${idx}`;
  };

  const isBlockDone = (block: any, idx: number): boolean => {
    if (progress?.completed) return true;
    const key = getBlockKey(block, idx);
    const fallbackKey = `block-${idx}`;
    return (progress?.completedBlocks || []).includes(key) || (progress?.completedBlocks || []).includes(fallbackKey);
  };

  const isLegacyDone = (key: string): boolean => {
    if (progress?.completed) return true;
    return (progress?.completedBlocks || []).includes(key);
  };

  const getBlockPaperSubmission = (block: any, idx: number) => {
    const key = getBlockKey(block, idx);
    const fallbackKey = `block-${idx}`;
    const allSubs = localProgress?.paperSubmissions || progress?.paperSubmissions || [];
    return allSubs.find((s) => s.blockKey === key || s.blockKey === fallbackKey || (block._id && s.blockKey === String(block._id)));
  };

  const paperBlocks = activeCurriculumBlocks
    .map((block, idx) => ({ block, idx }))
    .filter(({ block }) => block.type === 'paper');

  const hasPaperSection =
    paperBlocks.length > 0 ||
    Boolean(localProgress?.paperSubmissions?.length) ||
    Boolean(progress?.paperSubmissions?.length);

  const handleSubmitPaper = async (block: CurriculumBlock, idx: number) => {
    const blockKey = getBlockKey(block, idx);
    const file = paperFiles[blockKey];
    const notes = paperNotes[blockKey] || '';
    if (!file && !notes.trim()) {
      alert('Please select an answer document (PDF/Image) or type your notes to submit.');
      return;
    }
    try {
      setSubmittingPaperKey(blockKey);
      const formData = new FormData();
      if (file) formData.append('submissionFile', file);
      if (notes) formData.append('studentNotes', notes);
      formData.append('blockTitle', block.title || 'Paper');

      const targetId = block._id || String(idx);
      const res = await api.submitCoursePaper(lesson._id, targetId, formData);
      if (res.progress) {
        setLocalProgress(res.progress);
        onProgress(res.progress);
      }
      setPaperSubmitMessage((prev) => ({
        ...prev,
        [blockKey]: 'Paper submitted successfully! Teacher will review and update your results.',
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to submit paper. Please try again.');
    } finally {
      setSubmittingPaperKey(null);
    }
  };

  // Check if a live class has expired (5 hours after scheduledTime)
  const isLiveClassExpired = (scheduledTime?: string): boolean => {
    if (!scheduledTime) return false;
    const time = Date.parse(scheduledTime);
    if (isNaN(time)) return false;
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    return Date.now() > time + fiveHoursMs;
  };

  const formatScheduleTime = (val?: string): string => {
    if (!val) return '';
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      return d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    return val;
  };

  // Live classes for Diagram 4 right sidebar (unexpired, within 5 hours of schedule)
  const liveClasses = (lesson.curriculumBlocks || [])
    .map((b, originalIndex) => ({ ...b, originalIndex }))
    .filter((b) => b.type === 'live_class' && !isLiveClassExpired(b.scheduledTime));

  // Check if a curriculum block is sequentially unlocked
  const isBlockUnlocked = (idx: number): boolean => {
    if (preview) return true;
    if (lesson.enforceSequentialProgression === false) return true;
    if (progress?.completed) return true;

    const block = activeCurriculumBlocks[idx];
    if (!block) return true;

    // If already marked as done, always accessible for review
    if (isBlockDone(block, idx)) return true;

    // Check all previous blocks in the sequential curriculum
    for (let i = 0; i < idx; i++) {
      const prev = activeCurriculumBlocks[i];
      if (prev && !isBlockDone(prev, i)) {
        return false;
      }
    }

    return true;
  };

  // Find the preceding incomplete block that is keeping block `idx` locked
  const getBlockingBlock = (idx: number): { index: number; block: CurriculumBlock } | null => {
    for (let i = 0; i < idx; i++) {
      const prev = activeCurriculumBlocks[i];
      if (prev && !isBlockDone(prev, i)) {
        return { index: i, block: prev };
      }
    }
    return null;
  };

  // Active Curriculum Step Index (defaults to the first incomplete unlocked step in sequential order)
  const [activeStepIdx, setActiveStepIdx] = useState<number>(() => {
    if (activeCurriculumBlocks.length === 0) return 0;
    for (let i = 0; i < activeCurriculumBlocks.length; i++) {
      const b = activeCurriculumBlocks[i];
      if (!isBlockDone(b, i) && isBlockUnlocked(i)) {
        return i;
      }
    }
    return 0;
  });

  const scrollToStep = (stepIdx: number) => {
    const el = document.getElementById(`learning-step-${stepIdx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const totalBlocks =
    activeCurriculumBlocks.length > 0
      ? activeCurriculumBlocks.length
      : Math.max(1, (lesson.videos?.length || 0) + (lesson.description ? 1 : 0) + (lesson.quiz?.length ? 1 : 0));

  const completedCount =
    activeCurriculumBlocks.length > 0
      ? activeCurriculumBlocks.filter((b, idx) => isBlockDone(b, idx)).length
      : (lesson.videos || []).filter((_, i) => isLegacyDone(`video-${i}`)).length +
        (lesson.description && isLegacyDone('description') ? 1 : 0) +
        (lesson.quiz?.length && isLegacyDone('quiz') ? 1 : 0);

  const progressPct = totalBlocks > 0 ? Math.min(100, Math.round((completedCount / totalBlocks) * 100)) : 0;

  const toggleBlockCompletion = async (blockKey: string) => {
    setBusy(true);
    setError('');
    setCompletionNotice(null);

    const currentBlocks = progress?.completedBlocks || [];
    const isCurrentlyDone = currentBlocks.includes(blockKey);
    const nextBlocks = isCurrentlyDone
      ? currentBlocks.filter((k) => k !== blockKey)
      : [...currentBlocks, blockKey];

    const allDone = nextBlocks.length >= totalBlocks;

    try {
      if (preview) {
        onProgress({
          ...(progress || {
            course: lesson._id,
            lastOpenedAt: new Date().toISOString(),
            quizScore: null,
            quizTotal: 0,
            needsRevision: false,
          }),
          completed: allDone,
          completedBlocks: nextBlocks,
        } as Progress);
        setCompletionNotice(!isCurrentlyDone ? '🎉 Section marked as completed!' : 'Section marked as incomplete.');
        return;
      }

      const res = await api.saveCourseProgress(lesson._id, {
        completed: allDone,
        completedBlocks: nextBlocks,
      });
      onProgress(res.progress);
      window.dispatchEvent(new CustomEvent('mindmaze_courses_updated'));
      setCompletionNotice(!isCurrentlyDone ? '🎉 Section marked as completed!' : 'Section marked as incomplete.');
    } catch (e: any) {
      setError(e.message || 'Could not update completion status.');
    } finally {
      setBusy(false);
    }
  };

  const submitBlockQuiz = async (blockKey: string, questions: CurriculumQuizQuestion[], passPercentage = 50) => {
    setBusy(true);
    setError('');
    try {
      if (preview) {
        let score = 0;
        let hasOpenEnded = false;
        const results = questions.map((q, i) => {
          if (q.questionType === 'text') {
            hasOpenEnded = true;
            return {
              questionText: q.questionText,
              questionType: 'text',
              textAnswer: String(answers[i] || '').trim(),
              explanation: q.explanation || '',
              isCorrect: true,
              correct: true,
            };
          }
          const isCorrect = answers[i] === q.correctOptionIndex;
          if (isCorrect) score += 1;
          return {
            questionText: q.questionText,
            questionType: 'mcq',
            options: q.options || [],
            selectedIndex: answers[i],
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation || '',
            isCorrect,
            correct: isCorrect,
          };
        });
        const pct = Math.round((score / questions.length) * 100);
        const passed = !hasOpenEnded && pct >= passPercentage;
        setResult({
          results,
          score,
          total: questions.length,
          percentage: pct,
          passPercentage,
          hasOpenEnded,
          status: hasOpenEnded ? 'pending_review' : passed ? 'passed' : 'failed',
        });
        if (passed) {
          toggleBlockCompletion(blockKey);
          if (activeStepIdx + 1 < activeCurriculumBlocks.length) {
            setActiveStepIdx(activeStepIdx + 1);
          }
        }
      } else {
        const res = await api.submitCourseQuiz(lesson._id, answers, lesson.revision, blockKey);
        setResult(res);
        if (res.progress) {
          onProgress(res.progress);
          window.dispatchEvent(new CustomEvent('mindmaze_courses_updated'));
          if (res.passed && activeStepIdx + 1 < activeCurriculumBlocks.length) {
            setActiveStepIdx(activeStepIdx + 1);
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Could not submit quiz.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="learning-area space-y-6">
      {/* Header: Title, Subject, Progress (Only Name & Progress bar at top) */}
      <header className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition cursor-pointer mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            <p className="text-xs font-semibold text-cyan-300">
              {lesson.subject} {lesson.targetMonth ? `• ${lesson.targetMonth}` : ''} • {lesson.medium} •{' '}
              {lesson.estimatedMinutes} min
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Protected Course
            </span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{lesson.title}</h2>

        {/* Section-by-Section Progress Bar */}
        <div className="pt-3 mt-3 border-t border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">Progress:</span>
              <span className="font-extrabold text-cyan-300">
                {completedCount} of {totalBlocks} steps completed
              </span>
              {progressPct === 100 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 100% Completed
                </span>
              )}
            </div>
            <span className={`font-black text-xs ${progressPct === 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {progressPct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPct === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      {completionNotice && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/50 p-4 text-xs font-medium text-emerald-200 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm">{completionNotice}</span>
          </div>
          <button
            onClick={() => setCompletionNotice(null)}
            className="text-emerald-400 hover:text-white font-bold text-xs cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-rose-300">{error}</p>}

      {/* COURSE MAIN DESCRIPTION & LIVE CLASS LINKS (MIDDLE SECTION) */}
      {/* COURSE MAIN DESCRIPTION & LIVE CLASS / RESULTS (MIDDLE SECTION) */}
      {(lesson.description || liveClasses.length > 0 || hasPaperSection) && (
        <section className="space-y-4">
          <div
            className={`grid gap-6 items-start ${
              liveClasses.length > 0 || hasPaperSection ? 'lg:grid-cols-12' : 'grid-cols-1'
            }`}
          >
            {/* LEFT: MAIN COURSE DESCRIPTION */}
            <div className={liveClasses.length > 0 || hasPaperSection ? 'lg:col-span-7 xl:col-span-7' : 'w-full'}>
              <div className={`${panel} border-indigo-500/30 p-5 sm:p-6 space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-white text-base">Course Description & Overview</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {lesson.subject} • {lesson.medium}
                  </span>
                </div>

                {lesson.description ? (
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                    {lesson.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Welcome to {lesson.title}! Follow the sequential curriculum below to complete your studies.
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: LIVE CLASS LINKS & PAPER RESULTS SECTION (RIGHT BELOW LIVE CLASS) */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-4">
              {/* LIVE CLASS LINKS */}
              {liveClasses.length > 0 && (
                <div className="rounded-2xl border border-rose-500/30 bg-slate-900/90 shadow-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span>Live Class Links</span>
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Scheduled
                    </span>
                  </div>

                  <div className="space-y-3">
                    {liveClasses.map((lc, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{lc.title}</span>
                          {lc.scheduledTime && (
                            <div className="flex items-center gap-1 text-[10px] text-rose-300 font-semibold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{formatScheduleTime(lc.scheduledTime)}</span>
                            </div>
                          )}
                        </div>

                        {lc.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">{lc.description}</p>
                        )}

                        {lc.liveLink && (
                          <a
                            href={lc.liveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition cursor-pointer"
                          >
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                            <span>Join Live Classroom</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-1" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAPER & ASSIGNMENT RESULTS SECTION (PLACED RIGHT BELOW LIVE CLASS) */}
              {hasPaperSection && (
                <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 shadow-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Paper & Assignment Results</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">Official Results & Marking Schemes</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Results
                    </span>
                  </div>

                  <div className="space-y-3">
                    {paperBlocks.map(({ block: pBlock, idx: pIdx }) => {
                      const pKey = getBlockKey(pBlock, pIdx);
                      const sub = getBlockPaperSubmission(pBlock, pIdx);
                      const isGraded = sub && sub.status === 'reviewed';
                      const isPendingGrading = sub && sub.status === 'pending';
                      const hasResultSheet = Boolean(sub?.resultSheetUrl || pBlock.resultSheetUrl);

                      return (
                        <div
                          key={pKey}
                          className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">
                                {pBlock.title || `Paper Step ${pIdx + 1}`}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Total: {pBlock.totalMarks || 100} Marks
                              </span>
                            </div>

                            {/* Status Badge */}
                            {isGraded ? (
                              <div className="flex items-center gap-1.5">
                                {sub.grade && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                                    Grade: {sub.grade}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                                  {sub.marks ?? 0} / {sub.maxMarks ?? pBlock.totalMarks ?? 100}
                                </span>
                              </div>
                            ) : isPendingGrading ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ⏳ In Review
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                Not Submitted
                              </span>
                            )}
                          </div>

                          {/* Teacher Feedback Quote if graded */}
                          {isGraded && sub.adminFeedback && (
                            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200">
                              <span className="font-bold text-emerald-400 block mb-0.5">Teacher Feedback:</span>
                              <p className="italic leading-relaxed">"{sub.adminFeedback}"</p>
                            </div>
                          )}

                          {/* Result Sheet / Marking Scheme Download Button with Watermark */}
                          {hasResultSheet && (
                            <a
                              href={api.courseBlockResultSheetDownloadUrl(lesson._id, pKey)}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Download Official Result Sheet</span>
                              <Download className="w-3.5 h-3.5 ml-1" />
                            </a>
                          )}

                          {/* Jump to curriculum step if not submitted */}
                          {!sub && (
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`learning-step-${pIdx}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 text-xs font-bold transition cursor-pointer border border-indigo-500/20"
                            >
                              <span>Go to Paper Submission Step ↓</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* BOTTOM ROW: SEQUENTIAL CURRICULUM TIMELINE (DIAGRAM 4) */}
      <section className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Course Curriculum & Schedule</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {activeCurriculumBlocks.length} Learning Steps{' '}
            {lesson.enforceSequentialProgression !== false
              ? '(Unlock Sequentially)'
              : '(Free Exploration · All Unlocked)'}
          </span>
        </div>

        <div className="space-y-4">
          {activeCurriculumBlocks.map((block, idx) => {
            const blockKey = getBlockKey(block, idx);
            const done = isBlockDone(block, idx);
            const unlocked = isBlockUnlocked(idx);
            const isCurrentStep = activeStepIdx === idx;

            return (
              <div key={idx} id={`learning-step-${idx}`} className="space-y-2 scroll-mt-24">
                {/* Step Header */}
                <div className="flex items-center justify-between gap-2 text-xs font-bold pl-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-black transition-all ${
                        done
                          ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20'
                          : !unlocked
                          ? 'bg-slate-900 border border-slate-700/80 text-amber-400'
                          : 'bg-slate-800 border border-slate-700 text-slate-200'
                      }`}
                    >
                      {done ? '✓' : !unlocked ? <Lock className="w-3 h-3 text-amber-400" /> : idx + 1}
                    </span>
                    <span className={`uppercase tracking-wider ${!unlocked ? 'text-slate-500' : 'text-slate-400'}`}>
                      {block.type === 'video'
                        ? 'Video Lecture'
                        : block.type === 'document'
                        ? 'Study Notes PDF'
                        : block.type === 'quiz'
                        ? 'Practice Quiz'
                        : block.type === 'paper'
                        ? 'Paper / Assignment'
                        : 'Overview Guidance'}
                    </span>
                  </div>

                  {done ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Completed ✓</span>
                    </span>
                  ) : !unlocked ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      <span>Locked · Complete Step {idx} First</span>
                    </span>
                  ) : null}
                </div>

                {/* Locked Card */}
                {!unlocked ? (
                  <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-base">{block.title || 'Curriculum Step'}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Complete Step {idx} first to unlock this section.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollToStep(idx - 1)}
                        className="shrink-0 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span>Complete Step {idx} ↑</span>
                      </button>
                    </div>
                  </section>
                ) : (
                  /* Unlocked Step Content */
                  <>
                    {/* VIDEO STEP */}
                    {block.type === 'video' && (
                      <section className={`${panel} border-indigo-500/30 p-4 sm:p-5 space-y-4`}>
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2 truncate">
                            <Play className="w-4 h-4 text-cyan-400 shrink-0" />
                            <h4 className="text-white font-bold text-base truncate">{block.title || 'Video Lecture'}</h4>
                            <span className="text-xs text-slate-400">(Step {idx + 1} of {totalBlocks})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                              <Lock className="w-3 h-3 text-cyan-400" />
                              Protected Stream
                            </span>
                            {preview && (
                              <button
                                type="button"
                                onClick={() => toggleBlockCompletion(blockKey)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
                              >
                                {done ? 'Mark Incomplete' : 'Mark Watched'}
                              </button>
                            )}
                          </div>
                        </div>

                        {block.description && (
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{block.description}</p>
                        )}

                        {/* Protected Video Screen */}
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none shadow-inner">
                          {(() => {
                            const targetUrl = block.embedUrl || block.url || '';
                            const embed = youtubeEmbed(targetUrl);
                            const hasValidId = Boolean(extractYouTubeId(targetUrl));

                            if (embed || hasValidId) {
                              return (
                                <CleanVideoPlayer
                                  url={targetUrl}
                                  title={block.title || 'Video Lecture'}
                                  studentName={currentUser?.name || 'Mind Maze Student'}
                                  indexNumber={currentUser?.indexNumber || 'MM-STUDENT'}
                                  onEnded={() => {
                                    if (!isBlockDone(block, idx)) {
                                      toggleBlockCompletion(blockKey);
                                    }
                                  }}
                                />
                              );
                            }

                            if (targetUrl) {
                              return (
                                <div className="relative w-full h-full">
                                  <video
                                    src={targetUrl}
                                    controls
                                    controlsList="nodownload noplaybackrate"
                                    disablePictureInPicture
                                    className="w-full h-full bg-black"
                                    onContextMenu={(e) => e.preventDefault()}
                                    onEnded={() => {
                                      if (!isBlockDone(block, idx)) {
                                        toggleBlockCompletion(blockKey);
                                      }
                                    }}
                                  />
                                  {currentUser && (
                                    <div className="pointer-events-none absolute bottom-4 right-4 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] text-white/50 font-mono">
                                      {currentUser.name} • {currentUser.indexNumber || 'STD'}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
                                Video link is being prepared by the teacher.
                              </div>
                            );
                          })()}
                        </div>

                        {/* Companion PDF Document (if attached to this video) */}
                        {Boolean(block.pdfUrl || block.recordingPdfUrl || block.pdfFileName || block.recordingPdfFileName) && (() => {
                          const companionPath =
                            block.pdfPath ||
                            (block._id ? `/courses/${lesson._id}/blocks/${block._id}/download` : (block.path || `/courses/${lesson._id}/download`));
                          return (
                            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-emerald-400" />
                                  <span className="text-xs font-bold text-white">
                                    {block.pdfFileName || block.recordingPdfFileName || 'Video Companion Notes (PDF)'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={api.courseResourceUrl(companionPath, { inline: true })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open PDF</span>
                                  </a>
                                  {signedIn && (
                                    <a
                                      href={api.courseResourceUrl(companionPath, { download: true })}
                                      target="_blank"
                                      rel="noreferrer"
                                      download
                                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border border-emerald-500/20 bg-slate-950">
                                <iframe
                                  src={`${api.courseResourceUrl(companionPath, { inline: true })}#toolbar=0`}
                                  title={block.title || 'Document'}
                                  className="w-full h-full border-0"
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </section>
                    )}

                    {/* DOCUMENT / NOTES STEP */}
                    {block.type === 'document' && (() => {
                      const docPath =
                        block.pdfPath ||
                        block.path ||
                        (block._id ? `/courses/${lesson._id}/blocks/${block._id}/download` : `/courses/${lesson._id}/download`);
                      return (
                        <section className={`${panel} border-emerald-500/30 space-y-4`}>
                          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/5 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white text-base">
                                    {block.title || block.pdfFileName || 'Study Notes & Handout'}
                                  </h4>
                                  <span className="text-xs text-slate-400">(Step {idx + 1} of {totalBlocks})</span>
                                </div>
                                <p className="text-xs text-slate-400">PDF Study Material</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {signedIn && (
                                <a
                                  href={api.courseResourceUrl(docPath, { download: true })}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download PDF</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleBlockCompletion(blockKey)}
                                disabled={busy}
                                className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                                  done
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{done ? 'Read ✓' : 'Mark as Read'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="w-full h-[55vh] rounded-xl overflow-hidden border border-slate-800 bg-white">
                            <iframe
                              src={api.courseResourceUrl(docPath, { inline: true })}
                              title={block.title || 'Document'}
                              className="w-full h-full border-0"
                            />
                          </div>
                        </section>
                      );
                    })()}

                    {/* PRACTICE QUIZ STEP */}
                    {block.type === 'quiz' && (() => {
                      const qList: CurriculumQuizQuestion[] =
                        block.quizQuestions && block.quizQuestions.length > 0 ? block.quizQuestions : quiz;
                      const reqPass = block.passPercentage ?? 50;

                      return (
                        <section className={`${panel} border-amber-500/30 space-y-4`}>
                          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                                <HelpCircle className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-white font-bold text-base">{block.title || 'Practice Quiz'}</h4>
                                  <span className="text-xs text-slate-400">(Step {idx + 1} of {totalBlocks})</span>
                                </div>
                                <span className="text-xs text-amber-300/80">Passing requirement: {reqPass}%</span>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {qList.length} Questions
                            </span>
                          </div>

                          {/* Quiz results banner */}
                          {result && (
                            <div
                              className={`p-4 rounded-xl border space-y-1 ${
                                result.status === 'passed'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : result.status === 'pending_review'
                                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 font-bold text-sm">
                                {result.status === 'passed' ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Quiz Passed! ({result.score} / {result.total} · {result.percentage}%)</span>
                                  </>
                                ) : result.status === 'pending_review' ? (
                                  <>
                                    <Clock className="w-4 h-4 text-indigo-400" />
                                    <span>Submitted for Teacher Review!</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                    <span>
                                      Passing Score Not Met ({result.score} / {result.total} · {result.percentage}%)
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Questions */}
                          <div className="space-y-4">
                            {qList.map((q, qIndex) => (
                              <div
                                key={qIndex}
                                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
                              >
                                <p className="font-bold text-white text-sm">
                                  {qIndex + 1}. {q.questionText}
                                </p>

                                {q.imageUrl && (
                                  <div className="max-w-md rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-1">
                                    <img src={q.imageUrl} alt="Diagram" className="max-h-56 object-contain" />
                                  </div>
                                )}

                                {q.questionType === 'text' ? (
                                  <textarea
                                    rows={3}
                                    className={`${control} text-xs`}
                                    placeholder="Write your explanation or calculations here..."
                                    value={String(answers[qIndex] || '')}
                                    onChange={(e) => {
                                      const next = [...answers];
                                      next[qIndex] = e.target.value;
                                      setAnswers(next);
                                    }}
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    {q.options.map((opt, optIndex) => (
                                      <label
                                        key={optIndex}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                                          answers[qIndex] === optIndex
                                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`q-${idx}-${qIndex}`}
                                          checked={answers[qIndex] === optIndex}
                                          onChange={() => {
                                            const next = [...answers];
                                            next[qIndex] = optIndex;
                                            setAnswers(next);
                                          }}
                                          className="text-indigo-500"
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => submitBlockQuiz(blockKey, qList, reqPass)}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer"
                          >
                            {busy ? 'Submitting...' : 'Submit Quiz Answers'}
                          </button>
                        </section>
                      );
                    })()}

                    {/* DESCRIPTION / GUIDE STEP */}
                    {block.type === 'description' && (
                      <section className={panel}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <h4 className="text-white font-bold">{block.title || 'Lesson Overview'}</h4>
                          <button
                            type="button"
                            onClick={() => toggleBlockCompletion(blockKey)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                              done
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-indigo-600 text-white border-indigo-500/40'
                            }`}
                          >
                            {done ? 'Read ✓' : 'Mark as Read'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed mt-2 whitespace-pre-line">
                          {block.description}
                        </p>
                      </section>
                    )}

                    {/* PAPER / ASSIGNMENT STEP */}
                    {block.type === 'paper' && (() => {
                      const sub = getBlockPaperSubmission(block, idx);
                      const isGraded = sub && sub.status === 'reviewed';
                      const isPending = sub && sub.status === 'pending';
                      const isSubmitting = submittingPaperKey === blockKey;
                      const submitMsg = paperSubmitMessage[blockKey];

                      return (
                        <section className={`${panel} border-indigo-500/30 p-4 sm:p-6 space-y-6`}>
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 flex-wrap border-b border-white/5 pb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-base">
                                  {block.title || 'Paper / Assignment'}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-purple-300 font-semibold">
                                    Total Marks: {block.totalMarks || 100}
                                  </span>
                                  {block.deadline && (
                                    <span className="text-[11px] text-slate-400">
                                      • Due: {new Date(block.deadline).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleBlockCompletion(blockKey)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                                done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                              }`}
                            >
                              {done ? 'Step Completed ✓' : 'Mark as Done'}
                            </button>
                          </div>

                          {/* Question Paper Documents & Instructions */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-cyan-400" />
                                <span>Question Paper & Assignment Details</span>
                              </h5>
                              {block.paperUrl && (
                                <a
                                  href={api.courseBlockDownloadUrl(lesson._id, blockKey)}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={getAttributedFileName(block.paperFileName || `${block.title || 'Paper'}_Questions`, '.pdf')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download Question Paper PDF</span>
                                </a>
                              )}
                            </div>

                            {block.description ? (
                              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                                {block.description}
                              </div>
                            ) : !block.paperUrl ? (
                              <p className="text-xs text-slate-400 italic">No specific questions entered for this paper.</p>
                            ) : null}
                          </div>

                          {/* Submission & Results Desk */}
                          <div className="pt-2 border-t border-white/5 space-y-4">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                              <Upload className="w-4 h-4 text-emerald-400" />
                              <span>Your Paper Submission & Results</span>
                            </h5>

                            {/* If Graded */}
                            {isGraded && (
                              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Paper Evaluated & Graded</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {sub.grade && (
                                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                                        Grade: {sub.grade}
                                      </span>
                                    )}
                                    <span className="px-3 py-1 rounded-lg text-sm font-black bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-mono">
                                      Marks: {sub.marks ?? 0} / {sub.maxMarks ?? block.totalMarks ?? 100}
                                    </span>
                                  </div>
                                </div>

                                {sub.adminFeedback && (
                                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200">
                                    <span className="font-bold text-emerald-400 block mb-0.5">Teacher Feedback:</span>
                                    <p className="italic leading-relaxed">"{sub.adminFeedback}"</p>
                                  </div>
                                )}

                                {(sub.resultSheetUrl || block.resultSheetUrl) && (
                                  <a
                                    href={api.courseBlockResultSheetDownloadUrl(lesson._id, blockKey)}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={getAttributedFileName(sub.resultSheetFileName || block.resultSheetFileName || `${block.title || 'Paper'}_Result_Sheet`, '.pdf')}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
                                  >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>Download Official Marking Scheme / Result Sheet (Watermarked)</span>
                                    <Download className="w-3.5 h-3.5 ml-1" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* If Pending Review */}
                            {isPending && (
                              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                                    <span>Answer Paper Submitted · Pending Teacher Grading</span>
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Submitted on {new Date(sub.submittedAt).toLocaleString()}
                                  </span>
                                </div>

                                {sub.submissionFileName && (
                                  <div className="text-xs text-slate-300 font-mono">
                                    Submitted file: <span className="text-cyan-300 font-semibold">{sub.submissionFileName}</span>
                                  </div>
                                )}

                                {sub.studentNotes && (
                                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 italic">
                                    "{sub.studentNotes}"
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Submission Form (Shown when not submitted or allowed to re-upload) */}
                            {(!sub || isPending) && (
                              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3.5">
                                <span className="text-xs font-bold text-slate-200 block">
                                  {isPending ? 'Update or Re-upload Answer Paper:' : 'Upload Your Answer Paper:'}
                                </span>

                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                      Answer Document (PDF / Image / Scan)
                                    </label>
                                    <input
                                      type="file"
                                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) setPaperFiles((prev) => ({ ...prev, [blockKey]: f }));
                                      }}
                                      className="block w-full text-xs text-slate-400 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600/30 file:text-indigo-200 hover:file:bg-indigo-600/50 cursor-pointer"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                      Student Index / Notes (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={paperNotes[blockKey] || ''}
                                      onChange={(e) => setPaperNotes((prev) => ({ ...prev, [blockKey]: e.target.value }))}
                                      placeholder="e.g. Index 10001, completed Sections A & B"
                                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                                    />
                                  </div>
                                </div>

                                {submitMsg && (
                                  <p className="text-xs text-emerald-400 font-semibold">{submitMsg}</p>
                                )}

                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleSubmitPaper(block, idx)}
                                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>{isSubmitting ? 'Uploading Answer Paper...' : 'Submit Paper for Grading'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </section>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Related Past Papers */}
      {!!lesson.relatedPapers?.length && (
        <section className={panel}>
          <h3 className="text-white font-bold flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Related Past Papers</span>
          </h3>
          <div className="space-y-2">
            {lesson.relatedPapers.map((p) => (
              <a
                key={p._id}
                href={api.courseResourceUrl(p.pdfPath)}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-slate-800/70 hover:bg-slate-750 p-2.5 text-sm text-cyan-300 hover:underline transition"
              >
                {p.title} ↗
              </a>
            ))}
          </div>
        </section>
      )}

      {onNext && (
        <button
          className={`${button} w-full flex items-center justify-center gap-1.5 ${
            progressPct < 100 && !progress?.completed && !preview ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          disabled={progressPct < 100 && !progress?.completed && !preview}
          onClick={onNext}
        >
          {progressPct < 100 && !progress?.completed && !preview ? (
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          ) : null}
          <span>Next lesson →</span>
        </button>
      )}
    </div>
  );
}
