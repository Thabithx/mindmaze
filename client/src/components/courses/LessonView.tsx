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
      {(lesson.description || liveClasses.length > 0) && (
        <section className="space-y-4">
          <div
            className={`grid gap-6 items-start ${
              liveClasses.length > 0 ? 'lg:grid-cols-12' : 'grid-cols-1'
            }`}
          >
            {/* LEFT: MAIN COURSE DESCRIPTION */}
            <div className={liveClasses.length > 0 ? 'lg:col-span-7 xl:col-span-8' : 'w-full'}>
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

            {/* RIGHT: LIVE CLASS LINKS */}
            {liveClasses.length > 0 && (
              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
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
              </div>
            )}
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
                        {Boolean(block.pdfUrl || block.recordingPdfUrl || block.pdfFileName || block.recordingPdfFileName) && (
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
                                  href={api.courseResourceUrl(block.pdfUrl || block.recordingPdfUrl || `/courses/${lesson._id}/download`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open PDF</span>
                                </a>
                                {signedIn && (
                                  <a
                                    href={api.courseResourceUrl(block.pdfUrl || block.recordingPdfUrl || `/courses/${lesson._id}/download`)}
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
                                src={`${api.courseResourceUrl(block.pdfUrl || block.recordingPdfUrl || `/courses/${lesson._id}/download`)}#toolbar=0`}
                                title={block.title || 'Document'}
                                className="w-full h-full border-0"
                              />
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {/* DOCUMENT / NOTES STEP */}
                    {block.type === 'document' && (
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
                                href={api.courseResourceUrl(
                                  block.path || block.pdfUrl || `/courses/${lesson._id}/download`
                                )}
                                target="_blank"
                                rel="noreferrer"
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
                            src={api.courseResourceUrl(block.path || block.pdfUrl || `/courses/${lesson._id}/download`)}
                            title={block.title || 'Document'}
                            className="w-full h-full border-0"
                          />
                        </div>
                      </section>
                    )}

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
