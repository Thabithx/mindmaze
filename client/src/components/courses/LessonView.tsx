import React, { useState } from 'react';
import { api, getAuthToken, getStoredUser } from '../../services/api';
import { Lesson, Progress, button, panel, youtubeEmbed, extractYouTubeId, CurriculumBlock } from './learning';
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
  const [answers, setAnswers] = useState<number[]>([]);
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

  const totalBlocks = lesson.curriculumBlocks && lesson.curriculumBlocks.length > 0
    ? lesson.curriculumBlocks.length
    : Math.max(1, (lesson.videos?.length || 0) + (lesson.description ? 1 : 0) + (lesson.quiz?.length ? 1 : 0));

  const completedCount = lesson.curriculumBlocks && lesson.curriculumBlocks.length > 0
    ? lesson.curriculumBlocks.filter((b, idx) => isBlockDone(b, idx)).length
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

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (preview) {
        const results = quiz.map((q, i) => ({
          ...q,
          selectedIndex: answers[i],
          correct: answers[i] === q.correctOptionIndex,
        }));
        setResult({ results, score: results.filter(r => r.correct).length, total: quiz.length });
      } else {
        const res = await api.submitCourseQuiz(lesson._id, answers, lesson.revision);
        setResult(res);
        onProgress(res.progress);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
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
          {lesson.curriculumBlocks && lesson.curriculumBlocks.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Course Curriculum & Schedule</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {lesson.curriculumBlocks.length} Learning Steps
                </span>
              </div>

              <div className="space-y-6">
                {lesson.curriculumBlocks.map((block, idx) => {
                  const blockKey = getBlockKey(block, idx);
                  const blockId = `block-${idx}`;
                  const isPlaying = activeMedia === blockId;
                  const done = isBlockDone(block, idx);

                  return (
                    <div key={idx} className="space-y-2">
                      {/* Step header / indicator */}
                      <div className="flex items-center justify-between gap-2 text-xs font-bold pl-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-black transition-all ${
                              done
                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 ring-2 ring-emerald-500/20'
                                : 'bg-slate-800 border border-slate-700 text-slate-200'
                            }`}
                          >
                            {done ? '✓' : idx + 1}
                          </span>
                          <span className="uppercase tracking-wider text-slate-400">
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
                        {done && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed ✓</span>
                          </span>
                        )}
                      </div>

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

                      {/* BLOCK: LIVE CLASS */}
                      {block.type === 'live_class' && (
                        <section className={`${panel} border-rose-500/30 ring-1 ring-rose-500/10`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {done ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <CheckCircle2 className="w-3 h-3" /> Session Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                  <Radio className="w-3 h-3 animate-pulse" /> Live Class
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                                {block.meetingPlatform || 'Live Classroom'}
                              </span>
                            </div>

                            {block.scheduledTime && (
                              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-800/40">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{block.scheduledTime}</span>
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xl font-bold text-white">{block.title}</h4>
                            {block.description && (
                              <p className="text-sm text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                                {block.description}
                              </p>
                            )}
                          </div>

                          {/* If upcoming & has link, show Join Button */}
                          {!block.isCompleted && block.liveLink && (
                            <div className="pt-2">
                              <a
                                href={block.liveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition cursor-pointer"
                              >
                                <Radio className="w-4 h-4 animate-pulse" />
                                <span>Join Live Classroom on {block.meetingPlatform || 'Online'}</span>
                                <ExternalLink className="w-4 h-4 ml-1" />
                              </a>
                            </div>
                          )}

                          {/* If session has recording, show Clean Player */}
                          {(block.recordingEmbedUrl || block.recordingUrl) && (
                            <div className="mt-4 space-y-2 pt-3 border-t border-white/5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Play className="w-4 h-4 text-cyan-400" />
                                  <h5 className="font-bold text-white text-sm">Class Recording (Rewatch)</h5>
                                </div>
                                <span className="text-[11px] text-slate-400">Stream protected</span>
                              </div>

                              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none">
                                {isPlaying ? (
                                  <CleanVideoPlayer
                                    url={block.recordingEmbedUrl || block.recordingUrl || ''}
                                    title={`${block.title} (Live Recording)`}
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
                                    <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 shadow-lg shadow-rose-500/10">
                                      <Play className="w-6 h-6 ml-0.5 fill-rose-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white">Watch Session Recording</span>
                                    <span className="text-xs text-slate-400">Recorded live class video</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs text-slate-400">Attended or watched this live session?</span>
                            <button
                              onClick={() => toggleBlockCompletion(blockKey)}
                              disabled={busy || (!signedIn && !preview)}
                              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                                done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/40'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{done ? 'Session Attended ✓' : 'Mark as Attended'}</span>
                            </button>
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
                            <span className="text-xs text-slate-400">Done watching this video lecture?</span>
                            <button
                              onClick={() => toggleBlockCompletion(blockKey)}
                              disabled={busy || (!signedIn && !preview)}
                              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                                done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/40'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{done ? 'Video Watched ✓' : 'Mark as Watched'}</span>
                            </button>
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
                      {block.type === 'quiz' && (
                        <section className={`${panel} border-amber-500/30 ring-1 ring-amber-500/10 space-y-4`}>
                          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                                <HelpCircle className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-white font-bold text-base">{block.title || 'Practice Quiz'}</h4>
                                <span className="text-xs text-amber-300/80">Check your understanding</span>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {(block.quizQuestions?.length || quiz.length)} Questions
                            </span>
                          </div>

                          {block.description && (
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                              {block.description}
                            </p>
                          )}

                          {result ? (
                            <div className="space-y-3">
                              <p role="status" className="text-emerald-300 font-bold text-sm">
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
                                  onClick={() => setMistakesOnly((v) => !v)}
                                >
                                  {mistakesOnly ? 'Show all answers' : 'Review mistakes'}
                                </button>
                              </div>
                              {mistakesOnly && result.score === result.total && (
                                <p className="text-slate-300 text-xs">All answers correct. You’re ready for the next section!</p>
                              )}
                              {result.results
                                .filter((r: any) => !mistakesOnly || !r.correct)
                                .map((r: any, i: number) => (
                                   <div key={i} className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-1.5 text-xs">
                                    <p className="font-semibold text-white">
                                      {r.correct ? '✓' : '↻'} {r.questionText}
                                    </p>
                                    <p className="text-slate-300">Your answer: {r.options[r.selectedIndex]}</p>
                                    {!r.correct && (
                                      <p className="text-emerald-300">
                                        Correct answer: {r.options[r.correctOptionIndex]}
                                      </p>
                                    )}
                                    {r.explanation && <p className="text-slate-400 mt-1 italic">{r.explanation}</p>}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {(block.quizQuestions && block.quizQuestions.length > 0 ? block.quizQuestions : quiz).map((q, i) => (
                                <fieldset key={i} disabled={busy} className="space-y-2 border-t border-slate-800 pt-3">
                                  <legend className="text-xs font-bold text-white mb-2">
                                    {i + 1}. {q.questionText}
                                  </legend>
                                  {q.options.map((o, j) => (
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
                                  ))}
                                </fieldset>
                              ))}

                              <button
                                className={button}
                                disabled={busy || (!signedIn && !preview) || (block.quizQuestions && block.quizQuestions.length > 0 ? block.quizQuestions : quiz).some((_, i) => answers[i] === undefined)}
                                onClick={submit}
                              >
                                {busy ? 'Checking…' : 'Check answers'}
                              </button>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs text-slate-400">Finished this practice quiz?</span>
                            <button
                              onClick={() => toggleBlockCompletion(blockKey)}
                              disabled={busy || (!signedIn && !preview)}
                              className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                                done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500/40'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{done ? 'Quiz Completed ✓' : 'Mark Quiz as Done'}</span>
                            </button>
                          </div>
                        </section>
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
                          <span className="text-xs text-slate-400">Done watching this video lesson?</span>
                          <button
                            onClick={() => toggleBlockCompletion(`video-${i}`)}
                            disabled={busy || (!signedIn && !preview)}
                            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                              isLegacyDone(`video-${i}`)
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/40'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isLegacyDone(`video-${i}`) ? 'Video Watched ✓' : 'Mark as Watched'}</span>
                          </button>
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
              <span className="text-xs text-slate-400">Ready for the next lesson?</span>
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <span>Next Lesson →</span>
              </button>
            </div>
          )}
        </div>

        {/* Aside: Downloadable Study Notes & Papers with Watermark info */}
        <aside className="space-y-5">
          <section className={panel}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Lesson Notes (PDF)
              </h3>
            </div>

            {lesson.resources?.length ? (
              <div className="space-y-2.5">
                {lesson.resources.map(r => (
                  <a
                    key={r.id}
                    className="block rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/60 p-3 text-sm text-cyan-300 hover:text-cyan-200 transition group"
                    href={api.courseResourceUrl(r.path)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium group-hover:underline">{r.title}</span>
                      <span className="text-xs text-cyan-400 font-semibold">Download ↗</span>
                    </div>
                    <span className="block text-xs text-slate-400 mt-1">
                      PDF document {r.size ? `· ${(r.size / 1024 / 1024).toFixed(1)} MiB` : ''}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No notes attached yet.</p>
            )}
          </section>

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
            <button className={`${button} w-full`} onClick={onNext}>
              Next lesson →
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
