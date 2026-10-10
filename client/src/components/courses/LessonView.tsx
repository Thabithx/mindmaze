import React, { useState } from 'react';
import { api, getAuthToken, getStoredUser } from '../../services/api';
import { Lesson, Progress, button, panel, youtubeEmbed, extractYouTubeId } from './learning';
import { CleanVideoPlayer } from './CleanVideoPlayer';
import { Shield, Lock, Play, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            Protected Video & Material
          </span>
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
          {/* Video Lessons Section */}
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
                        /* Direct protected HTML5 video fallback with downloads strictly disabled */
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

          {/* Quiz Section */}
          {!!quiz.length && (
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
