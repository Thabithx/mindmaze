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

  const currentUser = getStoredUser();
  const signedIn = Boolean(getAuthToken());
  const quiz = lesson.quiz || [];

  const saveCompletion = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.saveCourseProgress(lesson._id, { completed: !progress?.completed });
      onProgress(res.progress);
    } catch (e: any) {
      setError(e.message);
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
        {preview ? (
          <p className="text-amber-300 text-sm">
            Student preview mode — progress is not saved.
          </p>
        ) : !signedIn ? (
          <p className="text-sm text-amber-300">
            Sign in to save your progress and download personalized watermarked notes.
          </p>
        ) : (
          <button disabled={busy} className={button} onClick={saveCompletion}>
            {progress?.completed ? 'Completed ✓ — mark unfinished' : 'Mark lesson completed'}
          </button>
        )}
      </header>

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
                  const blockId = `block-${idx}`;
                  const isPlaying = activeMedia === blockId;

                  return (
                    <div key={idx} className="space-y-2">
                      {/* Step header / indicator */}
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 pl-1">
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-[11px] flex items-center justify-center font-black">
                          {idx + 1}
                        </span>
                        <span className="uppercase tracking-wider">
                          {block.type === 'live_class'
                            ? 'Live Class Session'
                            : block.type === 'video'
                            ? 'Video Lesson'
                            : block.type === 'document'
                            ? 'Study Notes & Document'
                            : 'Lesson Overview & Guide'}
                        </span>
                      </div>

                      {/* BLOCK: DESCRIPTION / GUIDE */}
                      {block.type === 'description' && (
                        <section className={panel}>
                          <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
                            <BookOpen className="w-4 h-4" />
                            <h4 className="text-white font-bold">{block.title || 'Module Guide'}</h4>
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
                              {block.isCompleted ? (
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
                                <span>Download Watermarked Notes</span>
                              </a>
                            ) : (
                              <span className="text-xs text-amber-300 font-semibold bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-800/40">
                                Sign in to download notes
                              </span>
                            )}
                          </div>

                          {currentUser && currentUser.indexNumber && (
                            <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/30 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>
                                Anti-piracy protected: Your name & Index ({currentUser.indexNumber}) will be watermarked on every page.
                              </span>
                            </div>
                          )}

                          {block.description && (
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                              {block.description}
                            </p>
                          )}
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
                                          : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border border-transparent'
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
                      </section>
                    );
                  })}
                </div>
              )}

              {/* Dedicated Lesson Overview & Detailed Notes Section */}
              {lesson.description && (
                <section className={panel}>
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                    <FileText className="w-4 h-4" />
                    <h3>Lesson Overview & Study Notes</h3>
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

            {currentUser && currentUser.indexNumber && (
              <div className="rounded-xl bg-cyan-950/40 border border-cyan-800/40 p-2.5 text-xs text-cyan-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Downloads will be dynamically watermarked with your Name & Index: <strong className="font-mono text-white">{currentUser.indexNumber}</strong>
                </span>
              </div>
            )}

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
