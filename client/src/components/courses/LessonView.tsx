import React, { useState } from 'react';
import { api, getAuthToken, getStoredUser } from '../../services/api';
import { Lesson, Progress, button, panel, youtubeEmbed, extractYouTubeId, CurriculumBlock, CurriculumQuizQuestion } from './learning';
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
} from 'lucide-react';

export function LessonView({
  lesson,
  progress,
  onProgress,
  onNext,
  preview = false,
}: {
  lesson: Lesson;
  progress?: Progress;
  onProgress: (p: Progress) => void;
  onNext?: () => void;
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState<number | null>(0); // Auto-load first video for seamless viewing
  const [activeMedia, setActiveMedia] = useState<string | null>(() => {
    if (lesson.curriculumBlocks && lesson.curriculumBlocks.length > 0) {
      const firstMediaIdx = lesson.curriculumBlocks.findIndex(
        b => b.type === 'video' || (b.type === 'live_class' && (b.recordingEmbedUrl || b.recordingUrl))
      );
      return firstMediaIdx >= 0 ? `block-${firstMediaIdx}` : null;
    }
    return 'legacy-0';
  });
  const [mistakesOnly, setMistakesOnly] = useState(false);

  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  const currentUser = getStoredUser();
  const signedIn = Boolean(getAuthToken());
  const quiz = lesson.quiz || [];

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

  // Main sequential curriculum: excludes live classes which live in the dedicated right sidebar
  const activeCurriculumBlocks = (lesson.curriculumBlocks || []).filter(b => b.type !== 'live_class');

  // Live classes for the right sidebar (unexpired, within 5 hours of schedule)
  const liveClasses = (lesson.curriculumBlocks || [])
    .map((b, originalIndex) => ({ ...b, originalIndex }))
    .filter(b => b.type === 'live_class' && !isLiveClassExpired(b.scheduledTime));

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

  const scrollToStep = (stepIdx: number) => {
    const el = document.getElementById(`learning-step-${stepIdx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Determine if a downloadable resource/note is unlocked based on curriculum progression
  const getResourceBlockInfo = (r: any, rIdx: number) => {
    if (preview || progress?.completed) {
      return { isUnlocked: true, blocking: null, blockIndex: -1 };
    }

    if (!activeCurriculumBlocks.length) {
      return { isUnlocked: true, blocking: null, blockIndex: -1 };
    }

    // 1. Try to match by path or URL
    let targetIndex = activeCurriculumBlocks.findIndex(
      b => b.type === 'document' && (
        (b.pdfUrl && r.path && (b.pdfUrl === r.path || b.pdfUrl.includes(r.path) || r.path.includes(b.pdfUrl))) ||
        (b.path && r.path && (b.path === r.path || b.path.includes(r.path) || r.path.includes(b.path)))
      )
    );

    // 2. Try to match by title
    if (targetIndex < 0 && r.title) {
      targetIndex = activeCurriculumBlocks.findIndex(
        b => b.type === 'document' && (
          (b.title && b.title.trim().toLowerCase() === r.title.trim().toLowerCase()) ||
          (b.pdfFileName && b.pdfFileName.trim().toLowerCase() === r.title.trim().toLowerCase())
        )
      );
    }

    // 3. Match by ordinal position among all 'document' blocks
    if (targetIndex < 0) {
      const docBlockIndices = activeCurriculumBlocks
        .map((b, idx) => ({ b, idx }))
        .filter(item => item.b.type === 'document')
        .map(item => item.idx);
      if (docBlockIndices[rIdx] !== undefined) {
        targetIndex = docBlockIndices[rIdx];
      }
    }

    // 4. Fallback: first document block if available
    if (targetIndex < 0) {
      const firstDocIdx = activeCurriculumBlocks.findIndex(b => b.type === 'document');
      if (firstDocIdx >= 0) {
        targetIndex = firstDocIdx;
      }
    }

    // If there are still no document blocks in curriculum at all
    if (targetIndex < 0) {
      return { isUnlocked: true, blocking: null, blockIndex: -1 };
    }

    const unlocked = isBlockUnlocked(targetIndex);
    const blocking = !unlocked ? getBlockingBlock(targetIndex) : null;
    return {
      isUnlocked: unlocked,
      blocking,
      blockIndex: targetIndex,
    };
  };

  const totalBlocks = activeCurriculumBlocks.length > 0
    ? activeCurriculumBlocks.length
    : Math.max(1, (lesson.videos?.length || 0) + (lesson.description ? 1 : 0) + (lesson.quiz?.length ? 1 : 0));

  const completedCount = activeCurriculumBlocks.length > 0
    ? activeCurriculumBlocks.filter((b, idx) => isBlockDone(b, idx)).length
    : ((lesson.videos || []).filter((_, i) => isLegacyDone(`video-${i}`)).length +
       (lesson.description && isLegacyDone('description') ? 1 : 0) +
       (lesson.quiz?.length && isLegacyDone('quiz') ? 1 : 0));

  const progressPct = totalBlocks > 0 ? Math.min(100, Math.round((completedCount / totalBlocks) * 100)) : 0;

  const toggleBlockCompletion = async (blockKey: string) => {
    setBusy(true);
    setError('');
    setCompletionNotice(null);

    const currentBlocks = progress?.completedBlocks || [];
    const isCurrentlyDone = currentBlocks.includes(blockKey);
    const nextBlocks = isCurrentlyDone
      ? currentBlocks.filter(k => k !== blockKey)
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
        setCompletionNotice(
          !isCurrentlyDone
            ? '🎉 Section marked as completed!'
            : 'Section marked as incomplete.'
        );
        return;
      }

      const res = await api.saveCourseProgress(lesson._id, {
        completed: allDone,
        completedBlocks: nextBlocks,
      });
      onProgress(res.progress);
      window.dispatchEvent(new CustomEvent('mindmaze_courses_updated'));
      setCompletionNotice(
        !isCurrentlyDone
          ? '🎉 Section marked as completed!'
          : 'Section marked as incomplete.'
      );
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
        }
      } else {
        const res = await api.submitCourseQuiz(lesson._id, answers, lesson.revision, blockKey);
        setResult(res);
        if (res.progress) {
          onProgress(res.progress);
          window.dispatchEvent(new CustomEvent('mindmaze_courses_updated'));
        }
      }
    } catch (e: any) {
      setError(e.message || 'Could not submit quiz.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    submitBlockQuiz('quiz', (lesson.quiz || []) as any, 50);
  };

  return (
    <div className="learning-area space-y-6">
      <header className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-cyan-300">
            {lesson.subject} / {lesson.topic} · {lesson.medium} · {lesson.estimatedMinutes} min
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                lesson.isFree || !lesson.price
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              {lesson.isFree || !lesson.price ? 'FREE' : `Rs. ${(lesson.price || 0).toLocaleString()}`}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Protected Video & Material
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">{lesson.title}</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-300">{lesson.description}</p>
        {/* Clean Section-by-Section Progress Bar */}
        <div className="pt-3 border-t border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">Lesson Progress:</span>
              <span className="font-extrabold text-cyan-300">
                {completedCount} of {totalBlocks} sections completed
              </span>
              {progressPct === 100 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Lesson 100% Completed
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
          {preview ? (
            <span className="text-amber-300 text-xs font-medium block">
              Student preview mode · Mark sections to test progress tracking
            </span>
          ) : !signedIn ? (
            <p className="text-xs text-amber-300">
              Sign in to save your section progress and download notes.
            </p>
          ) : null}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-6 min-w-0">
          {/* Coursera-style Sequential Curriculum Timeline OR Legacy View */}
          {activeCurriculumBlocks.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Course Curriculum & Schedule</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {activeCurriculumBlocks.length} Learning Steps
                </span>
              </div>

              <div className="space-y-6">
                {activeCurriculumBlocks.map((block, idx) => {
                  const blockKey = getBlockKey(block, idx);
                  const blockId = `block-${idx}`;
                  const isPlaying = activeMedia === blockId;
                  const done = isBlockDone(block, idx);
                  const unlocked = isBlockUnlocked(idx);
                  const blocking = !unlocked ? getBlockingBlock(idx) : null;

                  return (
                    <div key={idx} id={`learning-step-${idx}`} className="space-y-2 scroll-mt-24">
                      {/* Step header / indicator */}
                      <div className="flex items-center justify-between gap-2 text-xs font-bold pl-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-black transition-all ${
                              done
                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 ring-2 ring-emerald-500/20'
                                : !unlocked
                                ? 'bg-slate-900 border border-slate-700/80 text-amber-400'
                                : 'bg-slate-800 border border-slate-700 text-slate-200'
                            }`}
                          >
                            {done ? '✓' : !unlocked ? <Lock className="w-3 h-3 text-amber-400" /> : idx + 1}
                          </span>
                          <span className={`uppercase tracking-wider ${!unlocked ? 'text-slate-500' : 'text-slate-400'}`}>
                            {block.type === 'live_class'
                              ? 'Live Class Session'
                              : block.type === 'video'
                              ? 'Video Lesson'
                              : block.type === 'document'
                              ? 'Study Notes & Document'
                              : block.type === 'quiz'
                              ? 'Practice Quiz'
                              : 'Lesson Overview & Guide'}
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

                      {!unlocked ? (
                        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 sm:p-6 backdrop-blur-md">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Lock className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-white font-bold text-base">
                                    {block.title || (
                                      block.type === 'video'
                                        ? 'Video Lecture'
                                        : block.type === 'document'
                                        ? 'Study Notes & Document'
                                        : block.type === 'quiz'
                                        ? 'Practice Quiz'
                                        : 'Lesson Section'
                                    )}
                                  </h4>
                                  <span className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Locked
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {blocking ? (
                                    <>
                                      Please complete Step {blocking.index + 1}:{' '}
                                      <span className="text-cyan-300 font-semibold">
                                        "{blocking.block.title || (blocking.block.type === 'video' ? 'Video Lecture' : blocking.block.type === 'document' ? 'Study Notes' : blocking.block.type === 'quiz' ? 'Quiz' : 'Lesson Overview')}"
                                      </span>{' '}
                                      first to unlock this section.
                                    </>
                                  ) : (
                                    'Please complete the previous learning steps in order to unlock this content.'
                                  )}
                                </p>
                              </div>
                            </div>

                            {blocking && (
                              <button
                                type="button"
                                onClick={() => {
                                  document.getElementById(`learning-step-${blocking.index}`)?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="shrink-0 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <span>Go to Step {blocking.index + 1}</span>
                                <span>↑</span>
                              </button>
                            )}
                          </div>
                        </section>
                      ) : (
                        <>
                          {/* BLOCK: DESCRIPTION / GUIDE */}
                          {block.type === 'description' && (
                        <section className={panel}>
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                              <BookOpen className="w-4 h-4" />
                              <h4 className="text-white font-bold">{block.title || 'Lesson Introduction & Overview'}</h4>
                            </div>
                            <button
                              onClick={() => toggleBlockCompletion(blockKey)}
                              disabled={busy || (!signedIn && !preview)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                                done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/40 shadow-sm shadow-indigo-600/20'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{done ? 'Overview Read ✓' : 'Mark as Read'}</span>
                            </button>
                          </div>
                          <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                            {block.description}
                          </div>
                        </section>
                      )}


                      {/* BLOCK: VIDEO LESSON */}
                      {block.type === 'video' && (
                        <section className={`${panel} overflow-hidden`} onContextMenu={e => e.preventDefault()}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Play className="w-4 h-4 text-cyan-400" />
                              <h4 className="text-white font-bold">{block.title}</h4>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                              <Lock className="w-3 h-3 text-cyan-400" />
                              Stream Only · Non-downloadable
                            </span>
                          </div>

                          {(() => {
                            const targetUrl = block.embedUrl || block.url || '';
                            const embed = youtubeEmbed(targetUrl);
                            const hasValidId = Boolean(extractYouTubeId(targetUrl));

                            return (
                              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none">
                                {embed || hasValidId ? (
                                  isPlaying ? (
                                    <CleanVideoPlayer
                                      url={targetUrl}
                                      title={block.title || 'Video Lecture'}
                                      studentName={currentUser?.name || 'Mind Maze Student'}
                                      indexNumber={currentUser?.indexNumber || 'MM-STUDENT'}
                                      onEnded={() => {
                                        if (!done) {
                                          toggleBlockCompletion(blockKey);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <button
                                      className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 to-slate-950 text-cyan-300 font-semibold hover:from-slate-850 hover:to-slate-900 transition cursor-pointer"
                                      onClick={() => setActiveMedia(blockId)}
                                    >
                                      <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10">
                                        <Play className="w-6 h-6 ml-0.5 fill-cyan-400" />
                                      </div>
                                      <span className="text-sm font-medium text-white">Watch Video Lecture</span>
                                      <span className="text-xs text-slate-400">Stream protected video</span>
                                    </button>
                                  )
                                ) : targetUrl ? (
                                  <div className="relative w-full h-full">
                                    <video
                                      src={targetUrl}
                                      controls
                                      controlsList="nodownload noplaybackrate"
                                      disablePictureInPicture
                                      className="w-full h-full bg-black"
                                      onContextMenu={e => e.preventDefault()}
                                      onEnded={() => {
                                        if (!done) {
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
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
                                    Video link is being prepared by the teacher.
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {block.description && (
                            <div className="mt-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                              <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Video Notes & Key Points</span>
                              </div>
                              <p className="whitespace-pre-line text-slate-300">{block.description}</p>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs text-slate-400">
                              {done ? 'Video lecture completed' : 'Watch video to the end to complete this lesson'}
                            </span>
                            {done ? (
                              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Watched ✓</span>
                              </span>
                            ) : preview ? (
                              <button
                                onClick={() => toggleBlockCompletion(blockKey)}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Preview: Mark Watched</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                                <Play className="w-3 h-3 text-cyan-400" />
                                <span>Auto-completes after playback</span>
                              </span>
                            )}
                          </div>
                        </section>
                      )}

                      {/* BLOCK: DOCUMENT / NOTES */}
                      {block.type === 'document' && (
                        <section className={`${panel} border-emerald-500/30`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-base">
                                  {block.title || block.pdfFileName || 'Study Notes & Handout'}
                                </h4>
                                <p className="text-xs text-slate-400">
                                  {block.size ? `${(block.size / (1024 * 1024)).toFixed(2)} MB · ` : ''}PDF Document
                                </p>
                              </div>
                            </div>

                            {signedIn ? (
                              <a
                                href={api.courseResourceUrl(block.path || block.pdfUrl || `/courses/${lesson._id}/download`)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download Note (PDF)</span>
                              </a>
                            ) : (
                              <span className="text-xs text-amber-300 font-semibold bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-800/40">
                                Sign in to download notes
                              </span>
                            )}
                          </div>

                          {block.description && (
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                              {block.description}
                            </p>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs text-slate-400">Done studying this document?</span>
                            <button
                              onClick={() => toggleBlockCompletion(blockKey)}
                              disabled={busy || (!signedIn && !preview)}
                              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                                done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{done ? 'Document Read ✓' : 'Mark as Read'}</span>
                            </button>
                          </div>
                        </section>
                      )}

                      {/* BLOCK: PRACTICE QUIZ / MCQS */}
                      {block.type === 'quiz' && (() => {
                        const qList: CurriculumQuizQuestion[] =
                          block.quizQuestions && block.quizQuestions.length > 0 ? block.quizQuestions : quiz;
                        const reqPass = block.passPercentage ?? 50;
                        const hasUnanswered = qList.some((q, i) => {
                          if (q.questionType === 'text') {
                            return !answers[i] || String(answers[i]).trim().length === 0;
                          }
                          return answers[i] === undefined;
                        });

                        return (
                          <section className={`${panel} border-amber-500/30 ring-1 ring-amber-500/10 space-y-4`}>
                            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                                  <HelpCircle className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-white font-bold text-base">{block.title || 'Practice Quiz'}</h4>
                                  <span className="text-xs text-amber-300/80">
                                    Passing requirement: {reqPass}% score
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {done && (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Passed ✓
                                  </span>
                                )}
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {qList.length} Questions
                                </span>
                              </div>
                            </div>

                            {block.description && (
                              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                                {block.description}
                              </p>
                            )}

                            {result ? (
                              <div className="space-y-4">
                                {result.status === 'passed' ? (
                                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                      <span>Quiz Passed! ({result.score} / {result.total} · {result.percentage}%)</span>
                                    </div>
                                    <p className="text-xs text-emerald-200/80">
                                      Required passing score: {result.passPercentage ?? reqPass}%. Excellent work! This step is marked as complete.
                                    </p>
                                  </div>
                                ) : result.status === 'pending_review' ? (
                                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                      <Clock className="w-4 h-4 text-indigo-400" />
                                      <span>Submitted for Teacher Review!</span>
                                    </div>
                                    <p className="text-xs text-indigo-200/80">
                                      Your written responses were submitted successfully. Once your teacher reviews and passes your submission (requires {result.passPercentage ?? reqPass}%), this section will automatically unlock.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                      <AlertCircle className="w-4 h-4 text-rose-400" />
                                      <span>Passing Score Not Reached ({result.score} / {result.total} · {result.percentage}%)</span>
                                    </div>
                                    <p className="text-xs text-rose-200/80">
                                      Required passing score: {result.passPercentage ?? reqPass}%. Please review your mistakes below and try again to unlock the next section.
                                    </p>
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    className={button}
                                    onClick={() => {
                                      setResult(null);
                                      setAnswers([]);
                                      setMistakesOnly(false);
                                    }}
                                  >
                                    Try again
                                  </button>
                                  <button
                                    className="text-cyan-300 text-sm cursor-pointer"
                                    onClick={() => setMistakesOnly((v) => !v)}
                                  >
                                    {mistakesOnly ? 'Show all answers' : 'Review mistakes'}
                                  </button>
                                </div>

                                {result.results
                                  ?.filter((r: any) => !mistakesOnly || !r.correct)
                                  .map((r: any, i: number) => (
                                    <div key={i} className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2 text-xs">
                                      <p className="font-semibold text-white">
                                        {r.correct ? '✓' : '↻'} {r.questionText}
                                      </p>
                                      {r.imageUrl && (
                                        <div className="my-2 max-w-sm rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 p-1">
                                          <img
                                            src={r.imageUrl}
                                            alt={r.questionText}
                                            className="w-full max-h-48 object-contain rounded"
                                            loading="lazy"
                                          />
                                        </div>
                                      )}
                                      {r.questionType === 'text' ? (
                                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                                          <span className="text-[11px] text-cyan-400 font-semibold block">Your Answer:</span>
                                          <p className="text-slate-200 whitespace-pre-wrap">{r.textAnswer || '(No written answer)'}</p>
                                          {r.adminGraded ? (
                                            <p className={`text-[11px] font-bold ${r.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                              {r.isCorrect ? '✓ Graded by teacher: Correct' : '✗ Graded by teacher: Incorrect'}
                                            </p>
                                          ) : (
                                            <p className="text-[11px] text-amber-400 italic">Teacher grading pending</p>
                                          )}
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="text-slate-300">
                                            Your answer: {r.options && r.options[r.selectedIndex]}
                                          </p>
                                          {!r.correct && (
                                            <p className="text-emerald-300">
                                              Correct answer: {r.options && r.options[r.correctOptionIndex]}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {r.explanation && <p className="text-slate-400 mt-1 italic">{r.explanation}</p>}
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {qList.map((q, i) => (
                                  <fieldset key={i} disabled={busy} className="space-y-2 border-t border-slate-800 pt-3">
                                    <legend className="text-xs font-bold text-white mb-2 flex items-center justify-between">
                                      <span>{i + 1}. {q.questionText}</span>
                                      {q.questionType === 'text' && (
                                        <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                                          Written Answer
                                        </span>
                                      )}
                                    </legend>

                                    {/* Question Diagram / Image */}
                                    {q.imageUrl && (
                                      <div className="my-2 max-w-md rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-1">
                                        <img
                                          src={q.imageUrl}
                                          alt={q.questionText}
                                          className="w-full max-h-64 object-contain rounded-lg"
                                          loading="lazy"
                                        />
                                      </div>
                                    )}

                                    {q.questionType === 'text' ? (
                                      <div className="space-y-1.5">
                                        <textarea
                                          value={typeof answers[i] === 'string' ? (answers[i] as string) : ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setAnswers((prev) => {
                                              const next = [...prev];
                                              next[i] = val;
                                              return next;
                                            });
                                          }}
                                          placeholder="Type your answer, formula, or steps here..."
                                          rows={3}
                                          className="w-full rounded-xl bg-slate-950 border border-slate-700/80 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-y"
                                        />
                                        <p className="text-[11px] text-slate-400">
                                          💡 This answer will be sent to your instructor for review and grading.
                                        </p>
                                      </div>
                                    ) : (
                                      (q.options || []).map((o, j) => (
                                        <label
                                          key={j}
                                          className={`flex items-start gap-3 rounded-xl p-2.5 text-xs cursor-pointer transition ${
                                            answers[i] === j
                                              ? 'bg-indigo-600/25 border border-indigo-500/40 text-white'
                                              : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border border-slate-700/60'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name={`quiz-block-${blockId}-q-${i}`}
                                            checked={answers[i] === j}
                                            onChange={() =>
                                              setAnswers((a) => {
                                                const next = [...a];
                                                next[i] = j;
                                                return next;
                                              })
                                            }
                                          />
                                          <span>{o}</span>
                                        </label>
                                      ))
                                    )}
                                  </fieldset>
                                ))}

                                <button
                                  className={button}
                                  disabled={busy || (!signedIn && !preview) || hasUnanswered}
                                  onClick={() => submitBlockQuiz(blockKey, qList, reqPass)}
                                >
                                  {busy ? 'Submitting & Grading…' : 'Submit Quiz Answers'}
                                </button>
                              </div>
                            )}

                            {/* Section Completion Status Indicator (No manual bypass) */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                              <span className="text-slate-400">
                                {done ? 'Quiz passed and completed' : `Score at least ${reqPass}% to unlock next step`}
                              </span>
                              {done ? (
                                <span className="font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Quiz Completed ✓</span>
                                </span>
                              ) : preview ? (
                                <button
                                  onClick={() => toggleBlockCompletion(blockKey)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/40 flex items-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Preview: Mark Quiz Done</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Auto-completes after passing</span>
                                </span>
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
            </div>
          ) : (
            <>
              {/* Legacy Video Lessons Section */}
              {(lesson.videos || []).length > 0 && (
                <div className="space-y-4">
                  {(lesson.videos || []).map((video, i) => {
                    const targetUrl = video.embedUrl || video.url || '';
                    const embed = youtubeEmbed(targetUrl);
                    const hasValidId = Boolean(extractYouTubeId(targetUrl));
                    const isVideoUnlocked = preview || progress?.completed || i === 0 || isLegacyDone(`video-${i - 1}`);

                    if (!isVideoUnlocked) {
                      return (
                        <section key={i} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 sm:p-6 backdrop-blur-md">
                          <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                              <Lock className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold text-base">{video.title || `Video Part ${i + 1}`}</h4>
                                <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Locked
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                Complete Video Part {i} first to unlock this video lecture.
                              </p>
                            </div>
                          </div>
                        </section>
                      );
                    }

                    return (
                      <section
                        key={i}
                        className={`${panel} overflow-hidden`}
                        onContextMenu={e => e.preventDefault()}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-white font-bold">{video.title}</h3>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                            <Lock className="w-3 h-3 text-cyan-400" />
                            Stream Only · Non-downloadable
                          </span>
                        </div>

                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none">
                          {embed || hasValidId ? (
                            playing === i ? (
                              <CleanVideoPlayer
                                url={targetUrl}
                                title={video.title}
                                studentName={currentUser?.name || 'Mind Maze Student'}
                                indexNumber={currentUser?.indexNumber || 'MM-STUDENT'}
                                onEnded={() => {
                                  const vKey = `video-${i}`;
                                  if (!isLegacyDone(vKey)) {
                                    toggleBlockCompletion(vKey);
                                  }
                                }}
                              />
                            ) : (
                              <button
                                className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 to-slate-950 text-cyan-300 font-semibold hover:from-slate-850 hover:to-slate-900 transition cursor-pointer"
                                onClick={() => setPlaying(i)}
                              >
                                <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10">
                                  <Play className="w-6 h-6 ml-0.5 fill-cyan-400" />
                                </div>
                                <span className="text-sm font-medium text-white">Watch Video Lesson</span>
                                <span className="text-xs text-slate-400">Stream protected video</span>
                              </button>
                            )
                          ) : targetUrl ? (
                            <div className="relative w-full h-full">
                              <video
                                src={targetUrl}
                                controls
                                controlsList="nodownload noplaybackrate"
                                disablePictureInPicture
                                className="w-full h-full bg-black"
                                onContextMenu={e => e.preventDefault()}
                                onEnded={() => {
                                  const vKey = `video-${i}`;
                                  if (!isLegacyDone(vKey)) {
                                    toggleBlockCompletion(vKey);
                                  }
                                }}
                              />
                              {currentUser && (
                                <div className="pointer-events-none absolute bottom-4 right-4 z-20 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] text-white/50 font-mono">
                                  {currentUser.name} • {currentUser.indexNumber || 'STD'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
                              Video link is being prepared by the teacher.
                            </div>
                          )}
                        </div>
                        {video.description && (
                          <div className="mt-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                            <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Video Notes & Details</span>
                            </div>
                            <p className="whitespace-pre-line text-slate-300">{video.description}</p>
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs text-slate-400">
                            {isLegacyDone(`video-${i}`) ? 'Video lecture completed' : 'Watch video to the end to complete this lesson'}
                          </span>
                          {isLegacyDone(`video-${i}`) ? (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Watched ✓</span>
                            </span>
                          ) : preview ? (
                            <button
                              onClick={() => toggleBlockCompletion(`video-${i}`)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Preview: Mark Watched</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                              <Play className="w-3 h-3 text-cyan-400" />
                              <span>Auto-completes after playback</span>
                            </span>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              {/* Dedicated Lesson Overview & Detailed Notes Section */}
              {lesson.description && (
                <section className={panel}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                      <FileText className="w-4 h-4" />
                      <h3>Lesson Overview & Study Notes</h3>
                    </div>
                    <button
                      onClick={() => toggleBlockCompletion('description')}
                      disabled={busy || (!signedIn && !preview)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                        isLegacyDone('description')
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/40 shadow-sm shadow-indigo-600/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isLegacyDone('description') ? 'Overview Read ✓' : 'Mark as Read'}</span>
                    </button>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                    {lesson.description}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Quiz Section (Fallback for legacy lessons without curriculum quiz blocks) */}
          {!!quiz.length && !lesson.curriculumBlocks?.some((b) => b.type === 'quiz') && (
            <section className={panel}>
              <h3 className="font-bold text-white text-lg">Check your understanding</h3>
              {result ? (
                <>
                  <p role="status" className="text-emerald-300">
                    You scored {result.score} / {result.total}.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={button}
                      onClick={() => {
                        setResult(null);
                        setAnswers([]);
                        setMistakesOnly(false);
                      }}
                    >
                      Try again
                    </button>
                    <button
                      className="text-cyan-300 text-sm cursor-pointer"
                      onClick={() => setMistakesOnly(v => !v)}
                    >
                      {mistakesOnly ? 'Show all answers' : 'Review mistakes'}
                    </button>
                  </div>
                  {mistakesOnly && result.score === result.total && (
                    <p className="text-slate-300">All answers correct. You’re ready for the next lesson.</p>
                  )}
                  {result.results
                    .filter((r: any) => !mistakesOnly || !r.correct)
                    .map((r: any, i: number) => (
                      <div key={i} className="rounded-xl bg-slate-800 p-4 space-y-2 text-sm">
                        <p className="font-semibold text-white">
                          {r.correct ? '✓' : '↻'} {r.questionText}
                        </p>
                        <p className="text-slate-300">Your answer: {r.options[r.selectedIndex]}</p>
                        {!r.correct && (
                          <p className="text-emerald-300">
                            Correct answer: {r.options[r.correctOptionIndex]}
                          </p>
                        )}
                        {r.explanation && <p className="text-slate-300">{r.explanation}</p>}
                      </div>
                    ))}
                </>
              ) : (
                <>
                  {quiz.map((q, i) => (
                    <fieldset key={i} disabled={busy} className="space-y-2 border-t border-slate-700 pt-4">
                      <legend className="text-sm font-semibold text-white">
                        {i + 1}. {q.questionText}
                      </legend>
                      {q.options.map((o, j) => (
                        <label
                          key={j}
                          className={`flex items-start gap-3 rounded-xl p-3 text-sm cursor-pointer transition ${
                            answers[i] === j
                              ? 'bg-indigo-600/25 border border-indigo-500/40 text-white'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${i}`}
                            checked={answers[i] === j}
                            onChange={() =>
                              setAnswers(a => {
                                const next = [...a];
                                next[i] = j;
                                return next;
                              })
                            }
                          />
                          {o}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <button
                    className={button}
                    disabled={busy || (!signedIn && !preview) || quiz.some((_, i) => answers[i] === undefined)}
                    onClick={submit}
                  >
                    {busy ? 'Checking…' : 'Check answers'}
                  </button>
                </>
              )}
            </section>
          )}

          {/* Clean Next Lesson navigation */}
          {onNext && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <div>
                <span className="text-xs text-slate-400 block">Ready for the next lesson?</span>
                {progressPct < 100 && !progress?.completed && !preview && (
                  <span className="text-[11px] text-amber-300 font-medium">Complete all sections above to proceed</span>
                )}
              </div>
              <button
                onClick={onNext}
                disabled={progressPct < 100 && !progress?.completed && !preview}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                  progressPct === 100 || progress?.completed || preview
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                {progressPct < 100 && !progress?.completed && !preview ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : null}
                <span>Next Lesson →</span>
              </button>
            </div>
          )}
        </div>

        {/* Aside: Downloadable Study Notes & Papers with Watermark info */}
        <aside className="space-y-5">
          <section className={`${panel} space-y-3`}>
            {(() => {
              const totalRes = lesson.resources?.length || 0;
              const unlockedResCount = (lesson.resources || []).filter(
                (r, idx) => getResourceBlockInfo(r, idx).isUnlocked
              ).length;
              const allNotesLocked = totalRes > 0 && unlockedResCount === 0;

              return (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span>Lesson Notes (PDF)</span>
                    </h3>
                    {totalRes > 0 && (
                      allNotesLocked ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          {unlockedResCount}/{totalRes} Unlocked
                        </span>
                      )
                    )}
                  </div>

                  {allNotesLocked && (
                    <div className="rounded-xl bg-amber-950/40 border border-amber-500/30 p-2.5 text-xs text-amber-300 flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                      <span>Complete earlier learning steps to unlock notes for download.</span>
                    </div>
                  )}

                  {lesson.resources?.length ? (
                    <div className="space-y-2.5">
                      {lesson.resources.map((r, rIdx) => {
                        const { isUnlocked, blocking, blockIndex } = getResourceBlockInfo(r, rIdx);

                        if (!isUnlocked) {
                          return (
                            <div
                              key={r.id || rIdx}
                              onClick={() => blocking && scrollToStep(blocking.index)}
                              className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3 space-y-2 cursor-pointer group hover:border-amber-500/40 transition select-none"
                              title={blocking ? `Locked. Complete Step ${blocking.index + 1} first.` : 'Locked'}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="font-medium text-xs text-slate-300 truncate group-hover:text-amber-200 transition">
                                    {r.title}
                                  </span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Locked</span>
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-white/5">
                                <span>
                                  {blocking
                                    ? `Unlocks at Step ${blockIndex >= 0 ? blockIndex + 1 : 'next'}`
                                    : 'Complete previous step'}
                                </span>
                                <span className="text-amber-400/90 font-semibold group-hover:underline flex items-center gap-1">
                                  Go to Step {blocking ? blocking.index + 1 : ''} →
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <a
                            key={r.id || rIdx}
                            className="block rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/60 p-3 text-sm text-cyan-300 hover:text-cyan-200 transition group"
                            href={api.courseResourceUrl(r.path)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium group-hover:underline flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span className="truncate">{r.title}</span>
                              </span>
                              <span className="text-xs text-cyan-400 font-semibold shrink-0 ml-2">Download ↗</span>
                            </div>
                            <span className="block text-xs text-slate-400 mt-1 pl-5.5">
                              PDF document {r.size ? `· ${(r.size / 1024 / 1024).toFixed(1)} MiB` : ''}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No notes attached yet.</p>
                  )}
                </>
              );
            })()}
          </section>

          {/* Live Classes Section (Right side under Lesson Notes) */}
          {liveClasses.length > 0 && (
            <section className={`${panel} border-rose-500/30 ring-1 ring-rose-500/10 space-y-3.5`}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>Live Class Classroom</span>
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Live
                </span>
              </div>

              <div className="space-y-3">
                {liveClasses.map((lc, idx) => {
                  const isDone = isBlockDone(lc, lc.originalIndex);
                  const isPlaying = activeMedia === `live-${lc.originalIndex}`;
                  const targetRecording = lc.recordingEmbedUrl || lc.recordingUrl;

                  return (
                    <div
                      key={idx}
                      className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 hover:border-rose-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          {lc.meetingPlatform || 'Zoom / Online'}
                        </span>

                        {lc.scheduledTime && (
                          <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-semibold bg-rose-950/40 px-2.5 py-0.5 rounded-md border border-rose-800/40">
                            <Clock className="w-3 h-3" />
                            <span>{formatScheduleTime(lc.scheduledTime)}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-sm leading-snug">{lc.title || 'Live Class Session'}</h4>
                        {lc.description && (
                          <p className="text-xs text-slate-300 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                            {lc.description}
                          </p>
                        )}
                      </div>

                      {!lc.isCompleted && lc.liveLink && (
                        <a
                          href={lc.liveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Join Live Classroom</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </a>
                      )}

                      {targetRecording && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                            <Play className="w-3 h-3" /> Class Recording
                          </span>
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800 select-none">
                            {isPlaying ? (
                              <CleanVideoPlayer
                                url={targetRecording}
                                title={`${lc.title} (Recording)`}
                                studentName={currentUser?.name || 'Mind Maze Student'}
                                indexNumber={currentUser?.indexNumber || 'MM-STUDENT'}
                              />
                            ) : (
                              <button
                                className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-900 to-slate-950 text-cyan-300 font-semibold hover:from-slate-850 hover:to-slate-900 transition cursor-pointer text-xs"
                                onClick={() => setActiveMedia(`live-${lc.originalIndex}`)}
                              >
                                <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 shadow">
                                  <Play className="w-4 h-4 ml-0.5 fill-rose-400" />
                                </div>
                                <span>Watch Recording</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Attended live?</span>
                        <button
                          type="button"
                          onClick={() => toggleBlockCompletion(getBlockKey(lc, lc.originalIndex))}
                          disabled={busy || (!signedIn && !preview)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isDone ? 'Attended ✓' : 'Mark Attended'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {!!lesson.relatedPapers?.length && (
            <section className={panel}>
              <h3 className="text-white font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Related Past Papers
              </h3>
              <div className="space-y-2">
                {lesson.relatedPapers.map(p => (
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
        </aside>
      </div>
    </div>
  );
}
