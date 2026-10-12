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

  const [isPlaying, setIsPlaying] = useState<boolean>(true);

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

  // Active Block based on current active step in the sequential curriculum
  const activeBlock: CurriculumBlock | null =
    activeCurriculumBlocks[activeStepIdx] ||
    (activeCurriculumBlocks.length > 0 ? activeCurriculumBlocks[0] : null) ||
    (lesson.videos && lesson.videos[0]
      ? ({
          type: 'video',
          title: lesson.videos[0].title,
          url: lesson.videos[0].url,
          embedUrl: lesson.videos[0].embedUrl,
          isYouTube: lesson.videos[0].isYouTube,
          description: lesson.videos[0].description,
        } as CurriculumBlock)
      : null);

  // Companion PDF for the active video (if video has companion doc)
  const hasCompanionDoc = Boolean(
    activeBlock &&
      activeBlock.type === 'video' &&
      (activeBlock.pdfUrl ||
        activeBlock.recordingPdfUrl ||
        activeBlock.pdfFileName ||
        activeBlock.recordingPdfFileName)
  );

  const companionPdfUrl =
    activeBlock?.pdfUrl ||
    activeBlock?.recordingPdfUrl ||
    (activeBlock?._id ? `/courses/${lesson._id}/blocks/${activeBlock._id}/download` : '');

  const companionPdfTitle =
    activeBlock?.pdfFileName ||
    activeBlock?.recordingPdfFileName ||
    'This Video Related Documents (PDF)';

  const hasRightSidebar = hasCompanionDoc || liveClasses.length > 0;
  const isCurrentStepUnlocked = isBlockUnlocked(activeStepIdx);

  return (
    <div className="learning-area space-y-6">
      {/* Header matching Diagram 4: Title, Subject, Progress */}
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
              Protected Video & Notes
            </span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{lesson.title}</h2>
        {lesson.description && (
          <p className="whitespace-pre-wrap text-sm text-slate-300 mt-1">{lesson.description}</p>
        )}

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

      {/* TOP ROW: ACTIVE LEARNING STEP (DIAGRAM 4) */}
      {(activeBlock || liveClasses.length > 0) && (
        <section className="space-y-3">
          <div
            className={`grid gap-6 items-start ${
              hasRightSidebar ? 'lg:grid-cols-12' : 'grid-cols-1'
            }`}
          >
            {/* BOX 1 (LEFT): ACTIVE LEARNING CONTENT */}
            {activeBlock && (
              <div
                className={`${
                  hasRightSidebar ? 'lg:col-span-7 xl:col-span-8' : 'w-full'
                } space-y-3`}
              >
                {!isCurrentStepUnlocked ? (
                  /* Locked Step Banner */
                  <div className={`${panel} p-8 text-center space-y-3 border-amber-500/40`}>
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="text-white font-bold text-lg">{activeBlock.title || 'Curriculum Step'} is Locked</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Please complete previous steps in the curriculum first to unlock this section.
                    </p>
                    {(() => {
                      const blk = getBlockingBlock(activeStepIdx);
                      return blk ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveStepIdx(blk.index);
                            window.scrollTo({ top: 100, behavior: 'smooth' });
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
                        >
                          <span>Go to Step {blk.index + 1} ({blk.block.title}) ↑</span>
                        </button>
                      ) : null;
                    })()}
                  </div>
                ) : activeBlock.type === 'video' ? (
                  /* VIDEO STEP */
                  <div
                    className={`${panel} p-4 sm:p-5 overflow-hidden shadow-2xl border-indigo-500/30`}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-2 truncate">
                        <Play className="w-4 h-4 text-cyan-400 shrink-0" />
                        <h3 className="text-white font-bold text-base truncate">
                          {activeBlock.title || 'Video Lecture'}
                        </h3>
                        {activeCurriculumBlocks.length > 0 && (
                          <span className="text-xs text-slate-400">
                            (Step {activeStepIdx + 1} of {totalBlocks})
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60 shrink-0">
                        <Lock className="w-3 h-3 text-cyan-400" />
                        Protected Stream
                      </span>
                    </div>

                    {/* Video screen */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none shadow-inner">
                      {(() => {
                        const targetUrl = activeBlock.embedUrl || activeBlock.url || '';
                        const embed = youtubeEmbed(targetUrl);
                        const hasValidId = Boolean(extractYouTubeId(targetUrl));

                        if (embed || hasValidId) {
                          return isPlaying ? (
                            <CleanVideoPlayer
                              url={targetUrl}
                              title={activeBlock.title || 'Video Lecture'}
                              studentName={currentUser?.name || 'Mind Maze Student'}
                              indexNumber={currentUser?.indexNumber || 'MM-STUDENT'}
                              onEnded={() => {
                                const blockKey = getBlockKey(activeBlock, activeStepIdx);
                                if (!isBlockDone(activeBlock, activeStepIdx)) {
                                  toggleBlockCompletion(blockKey);
                                }
                              }}
                            />
                          ) : (
                            <button
                              className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 to-slate-950 text-cyan-300 font-semibold hover:brightness-110 transition cursor-pointer"
                              onClick={() => setIsPlaying(true)}
                            >
                              <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10">
                                <Play className="w-6 h-6 ml-0.5 fill-cyan-400" />
                              </div>
                              <span className="text-sm font-medium text-white">Watch Video Lecture</span>
                            </button>
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
                                  const blockKey = getBlockKey(activeBlock, activeStepIdx);
                                  if (!isBlockDone(activeBlock, activeStepIdx)) {
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

                    {activeBlock.description && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                        <p className="whitespace-pre-line">{activeBlock.description}</p>
                      </div>
                    )}
                  </div>
                ) : activeBlock.type === 'quiz' ? (
                  /* QUIZ STEP */
                  (() => {
                    const qList: CurriculumQuizQuestion[] =
                      activeBlock.quizQuestions && activeBlock.quizQuestions.length > 0
                        ? activeBlock.quizQuestions
                        : quiz;
                    const reqPass = activeBlock.passPercentage ?? 50;
                    const blockKey = getBlockKey(activeBlock, activeStepIdx);
                    const done = isBlockDone(activeBlock, activeStepIdx);

                    return (
                      <div className={`${panel} p-4 sm:p-6 shadow-2xl border-amber-500/30 space-y-4`}>
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                              <HelpCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-white font-bold text-base">
                                  {activeBlock.title || 'Practice Quiz'}
                                </h3>
                                <span className="text-xs text-slate-400">
                                  (Step {activeStepIdx + 1} of {totalBlocks})
                                </span>
                              </div>
                              <span className="text-xs text-amber-300/80">Passing requirement: {reqPass}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {done && (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Passed ✓</span>
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {qList.length} Questions
                            </span>
                          </div>
                        </div>

                        {/* Quiz Results Banner */}
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
                                    Passing Score Not Met ({result.score} / {result.total} · {result.percentage}%).
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Questions list */}
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
                                        name={`q-top-${activeStepIdx}-${qIndex}`}
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

                        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => submitBlockQuiz(blockKey, qList, reqPass)}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer"
                          >
                            {busy ? 'Submitting...' : 'Submit Quiz Answers'}
                          </button>

                          {done && activeStepIdx + 1 < activeCurriculumBlocks.length && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveStepIdx(activeStepIdx + 1);
                                window.scrollTo({ top: 100, behavior: 'smooth' });
                              }}
                              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                            >
                              <span>Next Step: {activeCurriculumBlocks[activeStepIdx + 1]?.title || 'Next Step'} →</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : activeBlock.type === 'document' ? (
                  /* DOCUMENT STEP */
                  (() => {
                    const blockKey = getBlockKey(activeBlock, activeStepIdx);
                    const done = isBlockDone(activeBlock, activeStepIdx);
                    const docUrl = activeBlock.path || activeBlock.pdfUrl || `/courses/${lesson._id}/download`;

                    return (
                      <div className={`${panel} p-4 sm:p-6 shadow-2xl border-emerald-500/30 space-y-4`}>
                        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white text-base">
                                  {activeBlock.title || activeBlock.pdfFileName || 'Study Notes & Handout'}
                                </h3>
                                <span className="text-xs text-slate-400">
                                  (Step {activeStepIdx + 1} of {totalBlocks})
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">PDF Study Material</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {signedIn && (
                              <a
                                href={api.courseResourceUrl(docUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PDF</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleBlockCompletion(blockKey)}
                              disabled={busy}
                              className={`text-xs font-bold px-4 py-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
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

                        <div className="w-full h-[65vh] rounded-xl overflow-hidden border border-slate-800 bg-white">
                          <iframe
                            src={api.courseResourceUrl(docUrl)}
                            title={activeBlock.title || 'Document'}
                            className="w-full h-full border-0"
                          />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* OVERVIEW / DESCRIPTION STEP */
                  <div className={`${panel} p-5 space-y-3`}>
                    <h3 className="text-white font-bold text-base">{activeBlock.title || 'Lesson Overview'}</h3>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{activeBlock.description}</p>
                    <button
                      type="button"
                      onClick={() => toggleBlockCompletion(getBlockKey(activeBlock, activeStepIdx))}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                    >
                      {isBlockDone(activeBlock, activeStepIdx) ? 'Completed ✓' : 'Mark as Read'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* BOX 2 (RIGHT): COMPANION PDF & LIVE CLASS LINKS */}
            {hasRightSidebar && (
              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                {/* 2A: "This video related documents" (rendered ONLY if video has attached doc as per Diagram 4) */}
                {hasCompanionDoc && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-3.5 bg-slate-950/90 border-b border-emerald-500/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-white truncate">
                          This Video's Related Documents ⟷
                        </span>
                      </div>
                      <a
                        href={api.courseResourceUrl(companionPdfUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
                        title="Open PDF in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open</span>
                      </a>
                    </div>

                    <div className="p-3 space-y-2 bg-slate-950/60">
                      <p className="text-[11px] text-emerald-300 font-semibold truncate">
                        📄 {companionPdfTitle}
                      </p>
                      <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-emerald-500/20 bg-slate-950 relative">
                        <iframe
                          src={`${api.courseResourceUrl(companionPdfUrl)}#toolbar=0`}
                          title={companionPdfTitle}
                          className="w-full h-full border-0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2B: "Live class links" (right below companion document) */}
                {liveClasses.length > 0 && (
                  <div className="rounded-2xl border border-rose-500/30 bg-slate-900/90 shadow-xl p-4 space-y-3">
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
            {activeCurriculumBlocks.length} Learning Steps (Unlock Sequentially)
          </span>
        </div>

        <div className="space-y-4">
          {activeCurriculumBlocks.map((block, idx) => {
            const blockKey = getBlockKey(block, idx);
            const done = isBlockDone(block, idx);
            const unlocked = isBlockUnlocked(idx);
            const blocking = !unlocked ? getBlockingBlock(idx) : null;
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
                      <span>Locked · Complete Step {blocking ? blocking.index + 1 : 'Previous'} First</span>
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
                            Complete Step {blocking ? blocking.index + 1 : 'previous'} first to unlock this section.
                          </p>
                        </div>
                      </div>

                      {blocking && (
                        <button
                          type="button"
                          onClick={() => scrollToStep(blocking.index)}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition hover:text-white"
                        >
                          Go to Step {blocking.index + 1} ↑
                        </button>
                      )}
                    </div>
                  </section>
                ) : (
                  /* Unlocked Step Content */
                  <>
                    {/* VIDEO STEP */}
                    {block.type === 'video' && (
                      <section className={`${panel} flex items-center justify-between flex-wrap gap-4`}>
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-cyan-400" />
                            <h4 className="text-white font-bold text-base">{block.title}</h4>
                            {isCurrentStep && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                                Now Playing Above
                              </span>
                            )}
                          </div>
                          {block.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{block.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepIdx(idx);
                              setIsPlaying(true);
                              window.scrollTo({ top: 120, behavior: 'smooth' });
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>{isCurrentStep ? 'Now Playing Above' : 'Watch in Player Above'}</span>
                          </button>

                          {preview && (
                            <button
                              type="button"
                              onClick={() => toggleBlockCompletion(blockKey)}
                              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 cursor-pointer"
                            >
                              {done ? 'Mark Incomplete' : 'Mark Watched'}
                            </button>
                          )}
                        </div>
                      </section>
                    )}

                    {/* DOCUMENT / NOTES STEP */}
                    {block.type === 'document' && (
                      <section className={`${panel} border-emerald-500/30`}>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-base">
                                  {block.title || block.pdfFileName || 'Study Notes & Handout'}
                                </h4>
                                {isCurrentStep && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                                    Now Open Above
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">PDF Study Material</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveStepIdx(idx);
                                window.scrollTo({ top: 120, behavior: 'smooth' });
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{isCurrentStep ? 'Reading Above' : 'Open in Viewer Above'}</span>
                            </button>
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
                                  {isCurrentStep && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                      Active Above
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-amber-300/80">Passing requirement: {reqPass}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveStepIdx(idx);
                                  window.scrollTo({ top: 120, behavior: 'smooth' });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-850 hover:bg-slate-800 text-amber-300 text-xs font-bold border border-amber-500/30 transition cursor-pointer"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>{isCurrentStep ? 'Taking Quiz Above' : 'Open in Main Screen'}</span>
                              </button>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {qList.length} Questions
                              </span>
                            </div>
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
