import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import React, { useEffect, useRef, useState } from 'react';
import { api, getAuthToken, getStoredUser } from '../../services/api';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import { Lesson, Progress, CourseEnrollmentRecord, subjects, control, button, panel } from './learning';
import { LessonView } from './LessonView';
import { AdminCourseManager } from './AdminCourseManager';
import { CourseEnrollModal } from './CourseEnrollModal';
import { ShieldCheck, Plus, GraduationCap, Settings, CreditCard, Lock, CheckCircle2, Clock } from 'lucide-react';

export const CourseCatalogScreen: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [enrollments, setEnrollments] = useState<Record<string, CourseEnrollmentRecord>>({});
  const [enrollModalTarget, setEnrollModalTarget] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressError, setProgressError] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [query, setQuery] = useState('');
  const [allSubjects, setAllSubjects] = useState(!getStoredUser()?.stream);
  const [medium, setMedium] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [kind, setKind] = useState('');
  const [active, setActive] = useState<Lesson | null>(null);
  const [opening, setOpening] = useState(false);
  const [revisionOnly, setRevisionOnly] = useState(false);

  const user = getStoredUser();
  const isAdmin = ['admin', 'content_manager'].includes(user?.role);
  const [mode, setMode] = useState<'catalog' | 'admin'>('catalog');

  const request = useRef(0);
  const catalogRequest = useRef(0);

  const mySubjects = getSubjectsForStream(user?.stream || 'Maths', user?.physicalScienceElective || 'Chemistry').map(
    s => (s.name === 'Combined Mathematics' ? 'Combined Maths' : s.name)
  );

  const updateProgress = (p: Progress) => setProgress(prev => ({ ...prev, [p.course]: p }));

  const load = async () => {
    const version = ++catalogRequest.current;
    setLoading(true);
    setError('');
    setProgressError('');
    const results = await Promise.allSettled([
      api.getCourses(),
      getAuthToken() ? api.getCourseProgress() : Promise.resolve({ progress: [] }),
      getAuthToken() ? api.getMyEnrollments() : Promise.resolve({ enrollments: [] }),
    ]);
    if (version !== catalogRequest.current) return;
    if (results[0].status === 'fulfilled') setLessons(results[0].value.courses);
    else setError('Could not load lessons. Please retry.');
    if (results[1].status === 'fulfilled')
      setProgress(Object.fromEntries(results[1].value.progress.map((p: Progress) => [p.course, p])));
    else setProgressError('Saved progress could not be loaded. Retry before continuing.');
    if (results[2].status === 'fulfilled') {
      const eMap: Record<string, CourseEnrollmentRecord> = {};
      for (const e of results[2].value.enrollments || []) {
        const cId = typeof e.course === 'object' ? e.course?._id : e.course;
        if (cId) eMap[cId] = e;
      }
      setEnrollments(eMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    window.addEventListener('mindmaze_courses_updated', load);
    return () => {
      catalogRequest.current++;
      request.current++;
      window.removeEventListener('mindmaze_courses_updated', load);
    };
  }, []);

  const openLesson = async (id: string) => {
    const lesson = lessons.find((l) => l._id === id);
    const enrollment = enrollments[id];
    const isPaid = lesson && !lesson.isFree && (lesson.price || 0) > 0;

    // If paid course and student not admin, check if approved:
    if (isPaid && !isAdmin && (!enrollment || enrollment.status !== 'approved')) {
      if (lesson) setEnrollModalTarget(lesson);
      return;
    }

    const version = ++request.current;
    setOpening(true);
    setError('');
    try {
      const res = await api.getCourseById(id);
      if (version !== request.current) return;
      setActive(res.course);
      setSubject(res.course.subject);
      setTopic(res.course.topic);
      setQuery('');
      setRevisionOnly(false);
      if (getAuthToken()) {
        try {
          const saved = await api.saveCourseProgress(id, {});
          if (version === request.current) updateProgress(saved.progress);
        } catch (e: any) {
          if (version === request.current) setProgressError('Progress was not saved: ' + e.message);
        }
      }
    } catch (e: any) {
      if (version === request.current) setError(e.message);
    } finally {
      if (version === request.current) setOpening(false);
    }
  };

  const navigate = (nextSubject = '', nextTopic = '') => {
    request.current++;
    setOpening(false);
    setActive(null);
    setSubject(nextSubject);
    setTopic(nextTopic);
    setQuery('');
    setRevisionOnly(false);
  };

  const eligible = lessons.filter(
    l =>
      (allSubjects || mySubjects.includes(l.subject)) &&
      (!medium || l.medium === medium) &&
      (!syllabus || l.syllabus === syllabus) &&
      (!kind || (kind === 'video' ? l.videoCount > 0 : kind === 'pdf' ? l.resourceCount > 0 : l.quizCount > 0))
  );

  const visible = eligible.filter(
    l =>
      (query.trim()
        ? [l.title, l.topic, l.subject, l.description].join(' ').toLowerCase().includes(query.trim().toLowerCase())
        : (!subject || l.subject === subject) && (!topic || l.topic === topic)) &&
      (!revisionOnly || progress[l._id]?.needsRevision)
  );

  const resumed = lessons
    .filter(l => progress[l._id] && !progress[l._id].completed)
    .sort((a, b) => Date.parse(progress[b._id].lastOpenedAt) - Date.parse(progress[a._id].lastOpenedAt))[0];

  const reviseCount = lessons.filter(l => progress[l._id]?.needsRevision).length;
  const topicNames = [...new Set(visible.map(l => l.topic))];
  const pagingKey = JSON.stringify([subject, topic, query, medium, syllabus, kind, revisionOnly, allSubjects]);
  const lessonsPage = usePagination(visible, pagingKey);
  const topicsPage = usePagination(topicNames, pagingKey);

  const nextLesson = active
    ? lessons
        .filter(l => l.subject === active.subject && l.topic === active.topic)
        .find((l, i, items) => i > 0 && items[i - 1]._id === active._id)
    : null;

  const stats = (items: Lesson[]) => ({
    done: items.filter(l => progress[l._id]?.completed).length,
    total: items.length,
    minutes: items.reduce((n, l) => n + l.estimatedMinutes, 0),
  });

  const progressBar = (items: Lesson[]) => {
    const s = stats(items);
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-400">
          {s.done} / {s.total} lessons completed · {s.minutes} min
        </p>
        <progress aria-label="Lesson completion" value={s.done} max={s.total || 1} className="w-full h-1.5 accent-cyan-400" />
      </div>
    );
  };

  return (
    <div className="learning-area space-y-6 pb-10">
      {/* Admin Mode Switcher Header */}
      {isAdmin && (
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/80 p-4 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Course & Lesson Management</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {user?.role === 'admin' ? 'Administrator' : 'Content Manager'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between managing lessons (add YouTube videos, PDF notes) and viewing the student catalog.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setMode('catalog');
                setActive(null);
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                mode === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student View</span>
            </button>
            <button
              onClick={() => {
                setMode('admin');
                setActive(null);
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                mode === 'admin'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40'
                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Manage & Add Lessons</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Admin Manager when in admin mode */}
      {isAdmin && mode === 'admin' ? (
        <AdminCourseManager />
      ) : (
        <>
          <header className={panel}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Courses & Media</p>
              {isAdmin && (
                <button
                  onClick={() => setMode('admin')}
                  className="text-xs font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Open Admin Course Manager</span>
                </button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">What will you learn today?</h1>
            <p className="text-sm text-slate-400">Choose a subject, explore a topic, and learn at your own pace.</p>
          </header>

          {error && (
            <div role="alert" className="text-rose-300">
              {error} <button className="underline" onClick={load}>Retry catalogue</button>
            </div>
          )}
          {progressError && (
            <div role="alert" className="text-amber-300 text-sm">
              {progressError} <button className="underline" onClick={load}>Retry progress</button>
            </div>
          )}

          <nav aria-label="Learning navigation" className="flex flex-wrap gap-2 text-sm text-slate-400">
            <button className="text-cyan-300 cursor-pointer" onClick={() => navigate()}>
              Subjects
            </button>
            {subject && (
              <>
                <span>/</span>
                <button className="text-cyan-300 cursor-pointer" onClick={() => navigate(subject)}>
                  {subject}
                </button>
              </>
            )}
            {topic && (
              <>
                <span>/</span>
                <button className="text-cyan-300 cursor-pointer" onClick={() => navigate(subject, topic)}>
                  {topic}
                </button>
              </>
            )}
            {active && (
              <>
                <span>/</span>
                <span>{active.title}</span>
              </>
            )}
          </nav>

          {opening && <p role="status" className="text-cyan-300">Opening lesson…</p>}

          {active ? (
            <LessonView
              key={active._id + ':' + active.revision}
              lesson={active}
              progress={progress[active._id]}
              onProgress={updateProgress}
              onNext={nextLesson ? () => openLesson(nextLesson._id) : undefined}
            />
          ) : (
            <>
              {!subject && !query && !revisionOnly && resumed && (
                <section className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-5 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-300 mb-2">Continue learning</p>
                    <h2 className="text-lg font-bold text-white">{resumed.title}</h2>
                    <p className="text-sm text-slate-400">
                      {resumed.subject} · {resumed.topic}
                    </p>
                  </div>
                  <button disabled={opening} onClick={() => openLesson(resumed._id)} className={button}>
                    Resume lesson →
                  </button>
                </section>
              )}

              <div className={panel}>
                <label className="block text-sm text-slate-300">
                  Search all topics and lessons
                  <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Try cell biology or mechanics"
                    className={control + ' mt-2'}
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-xs text-slate-400">
                    Language
                    <select className={control + ' mt-1'} value={medium} onChange={e => setMedium(e.target.value)}>
                      <option value="">All languages</option>
                      {['English', 'Sinhala', 'Tamil'].map(m => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    Syllabus
                    <select className={control + ' mt-1'} value={syllabus} onChange={e => setSyllabus(e.target.value)}>
                      <option value="">All syllabuses</option>
                      <option value="current">Current syllabus</option>
                      <option value="old">Old syllabus</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-400">
                    Material
                    <select className={control + ' mt-1'} value={kind} onChange={e => setKind(e.target.value)}>
                      <option value="">All materials</option>
                      <option value="video">Video lessons</option>
                      <option value="pdf">PDF notes</option>
                      <option value="quiz">Practice quizzes</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="text-slate-300 flex gap-2 items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSubjects}
                      onChange={e => {
                        setAllSubjects(e.target.checked);
                        navigate();
                      }}
                    />
                    Browse all subjects
                  </label>
                  {reviseCount > 0 && (
                    <button
                      className="text-amber-300 cursor-pointer"
                      onClick={() => {
                        navigate();
                        setAllSubjects(true);
                        setRevisionOnly(!revisionOnly);
                      }}
                    >
                      {revisionOnly ? 'Show all lessons' : `Needs revision (${reviseCount})`}
                    </button>
                  )}
                  {(query || medium || syllabus || kind || revisionOnly) && (
                    <button
                      className="text-cyan-300 cursor-pointer"
                      onClick={() => {
                        setQuery('');
                        setMedium('');
                        setSyllabus('');
                        setKind('');
                        setRevisionOnly(false);
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <p role="status" className="text-slate-400">Loading lessons…</p>
              ) : (
                <>
                  {(subject || query || revisionOnly) && (
                    <Pagination
                      {...(!topic && !query && !revisionOnly ? topicsPage.pagination : lessonsPage.pagination)}
                      label="Courses"
                    />
                  )}
                  <h2 className="text-xl font-bold text-white">
                    {revisionOnly
                      ? 'Needs revision'
                      : query
                      ? 'Search results'
                      : topic
                      ? 'Lessons'
                      : subject
                      ? 'Choose a topic'
                      : 'Choose a subject'}
                  </h2>
                  {visible.length === 0 ? (
                    <div className={panel}>
                      <p className="text-slate-300 font-semibold">No lessons found here yet.</p>
                      <p className="text-sm text-slate-400">Try another subject or clear the filters.</p>
                      {isAdmin && (
                        <div className="pt-4 border-t border-slate-700/60 mt-2">
                          <p className="text-xs text-indigo-300 mb-2.5 font-medium">
                            You are signed in as an Administrator. You can create your first course and lesson now:
                          </p>
                          <button
                            onClick={() => setMode('admin')}
                            className={button + ' bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 flex items-center gap-2'}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create Course & Lessons Now →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {!subject && !query && !revisionOnly
                        ? subjects
                            .filter(s => visible.some(l => l.subject === s))
                            .map(s => {
                              const items = visible.filter(l => l.subject === s);
                              return (
                                <button
                                  key={s}
                                  onClick={() => setSubject(s)}
                                  className={panel + ' text-left hover:border-cyan-400/60 cursor-pointer transition'}
                                >
                                  <span className="text-2xl">
                                    {{
                                      Physics: '⚡',
                                      Chemistry: '🧪',
                                      Biology: '🌿',
                                      'Combined Maths': '📐',
                                      ICT: '💻',
                                    }[s]}
                                  </span>
                                  <h3 className="font-bold text-lg text-white">{s}</h3>
                                  <p className="text-sm text-slate-400">{new Set(items.map(l => l.topic)).size} topics</p>
                                  {progressBar(items)}
                                </button>
                              );
                            })
                        : !topic && !query && !revisionOnly
                        ? topicsPage.items.map((t, i) => {
                            const items = visible.filter(l => l.topic === t);
                            return (
                              <button
                                key={t}
                                onClick={() => setTopic(t)}
                                className={panel + ' text-left hover:border-cyan-400/60 cursor-pointer transition'}
                              >
                                <p className="text-xs text-cyan-300">Topic {topicsPage.offset + i + 1}</p>
                                <h3 className="font-bold text-lg text-white">{t}</h3>
                                {progressBar(items)}
                              </button>
                            );
                          })
                        : lessonsPage.items.map(l => (
                            <button
                              key={l._id}
                              disabled={opening}
                              onClick={() => openLesson(l._id)}
                              className={panel + ' text-left hover:border-cyan-400/60 disabled:opacity-60 cursor-pointer transition'}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-xs text-cyan-300 font-semibold">
                                  {l.subject} · {l.topic}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                      l.isFree || !l.price
                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {l.isFree || !l.price ? 'FREE' : `Rs. ${(l.price || 0).toLocaleString()}`}
                                  </span>

                                  {enrollments[l._id]?.status === 'approved' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      ✓ Enrolled
                                    </span>
                                  )}
                                  {enrollments[l._id]?.status === 'pending' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                      ⏳ Slip Pending
                                    </span>
                                  )}
                                  {enrollments[l._id]?.status === 'rejected' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      ✕ Declined
                                    </span>
                                  )}
                                </div>
                              </div>

                              <h3 className="text-lg font-bold text-white">{l.title}</h3>
                              <p className="text-sm text-slate-400 line-clamp-2">{l.description}</p>
                              <p className="text-xs text-slate-400">
                                {l.estimatedMinutes} min · {l.medium}
                                {l.videoCount > 0 ? ` · ${l.videoCount} videos` : ''}
                                {l.resourceCount > 0 ? ` · ${l.resourceCount} PDFs` : ''}
                                {l.quizCount > 0 ? ` · ${l.quizCount} questions` : ''}
                              </p>

                              <div className="flex items-center justify-between pt-1">
                                <p
                                  className={`text-sm font-semibold ${
                                    progress[l._id]?.completed ? 'text-emerald-300' : 'text-indigo-300'
                                  }`}
                                >
                                  {progress[l._id]?.completed
                                    ? 'Completed ✓'
                                    : progress[l._id]
                                    ? 'In progress →'
                                    : !l.isFree && !isAdmin && (!enrollments[l._id] || enrollments[l._id]?.status !== 'approved')
                                    ? 'Enroll to unlock →'
                                    : 'Start lesson →'}
                                </p>
                                {!l.isFree && !isAdmin && (!enrollments[l._id] || enrollments[l._id]?.status !== 'approved') && (
                                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Bank Slip Required</span>
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Student Enrollment Modal */}
      {enrollModalTarget && (
        <CourseEnrollModal
          course={enrollModalTarget}
          isOpen={Boolean(enrollModalTarget)}
          onClose={() => setEnrollModalTarget(null)}
          onSuccess={async (status) => {
            const target = enrollModalTarget;
            setEnrollModalTarget(null);
            await load();
            if (status === 'approved') {
              openLesson(target._id);
            }
          }}
        />
      )}
    </div>
  );
};
