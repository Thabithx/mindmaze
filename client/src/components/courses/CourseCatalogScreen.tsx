import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import React, { useEffect, useRef, useState } from 'react';
import { api, getAuthToken, getStoredUser } from '../../services/api';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import { Lesson, Progress, CourseEnrollmentRecord, subjects, control, button, panel } from './learning';
import { LessonView } from './LessonView';
import { AdminCourseManager } from './AdminCourseManager';
import { CourseEnrollModal } from './CourseEnrollModal';
import { ShieldCheck, Plus, GraduationCap, Settings, CreditCard, Lock, CheckCircle2, Clock, Search, X, Layers, Calendar, ChevronRight } from 'lucide-react';

export const CourseCatalogScreen: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [enrollments, setEnrollments] = useState<Record<string, CourseEnrollmentRecord>>({});
  const [enrollModalTarget, setEnrollModalTarget] = useState<Lesson | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Lesson | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressError, setProgressError] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [query, setQuery] = useState('');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid' | 'monthly'>('all');
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

  const updateProgress = (p: Progress) => {
    const cId = typeof p.course === 'object' && p.course !== null ? (p.course as any)._id : p.course;
    if (cId) {
      setProgress(prev => ({ ...prev, [cId]: p }));
    }
  };

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
    if (results[1].status === 'fulfilled') {
      const pMap: Record<string, Progress> = {};
      for (const p of results[1].value.progress || []) {
        const cId = typeof p.course === 'object' && p.course !== null ? (p.course as any)._id : p.course;
        if (cId) pMap[cId] = p;
      }
      setProgress(pMap);
    } else {
      setProgressError('Saved progress could not be loaded. Retry before continuing.');
    }
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

  const openProgram = async (programId: string) => {
    setLoadingProgram(true);
    setError('');
    try {
      const res = await api.getCourseById(programId);
      setSelectedProgram(res.course);
    } catch (err: any) {
      setError(err.message || 'Could not load monthly program classes.');
    } finally {
      setLoadingProgram(false);
    }
  };

  const openLesson = async (id: string, directLesson?: Lesson) => {
    const lesson = directLesson || lessons.find((l) => l._id === id) || (selectedProgram?.subCourses || []).find((sc) => sc._id === id);
    const enrollment = enrollments[id];
    const isPaid = lesson && !lesson.isFree && (lesson.price || 0) > 0;
    const isExpired = Boolean(enrollment?.isExpired || (enrollment?.expiresAt && new Date(enrollment.expiresAt).getTime() < Date.now()));

    // If student is not admin:
    // If paid course and not approved or expired -> open enroll modal:
    if (isPaid && !isAdmin && (!enrollment || enrollment.status !== 'approved' || isExpired)) {
      if (lesson) setEnrollModalTarget(lesson);
      return;
    }

    // If free course and student not enrolled yet -> open enroll modal so student enrolls:
    if (!isPaid && !isAdmin && (!enrollment || enrollment.status !== 'approved')) {
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
      setSelectedProgram(null);
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

  const matchesPricing = (l: Lesson, filter: 'all' | 'free' | 'paid' | 'monthly') => {
    if (filter === 'all') return true;
    if (filter === 'free') return Boolean(l.isFree || !l.price || l.price <= 0);
    if (filter === 'paid') return Boolean(!l.isFree && (l.price || 0) > 0 && l.billingType !== 'monthly' && !l.isMonthlyProgram && l.courseType !== 'monthly');
    if (filter === 'monthly') return Boolean(l.isMonthlyProgram || l.billingType === 'monthly' || l.courseType === 'monthly' || enrollments[l._id]?.paymentType === 'partial');
    return true;
  };

  const eligibleByPricing = lessons.filter(l => matchesPricing(l, pricingFilter));
  const eligibleBySubject = lessons.filter(l => !subject || l.subject === subject);

  const visible = lessons.filter(
    l =>
      (!subject || l.subject === subject) &&
      (!topic || l.topic === topic) &&
      matchesPricing(l, pricingFilter) &&
      (!revisionOnly || progress[l._id]?.needsRevision) &&
      (!query.trim() || [l.title, l.topic, l.subject, l.description].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  );

  const resumed = lessons
    .filter(l => progress[l._id] && !progress[l._id].completed)
    .sort((a, b) => Date.parse(progress[b._id].lastOpenedAt) - Date.parse(progress[a._id].lastOpenedAt))[0];

  const reviseCount = lessons.filter(l => progress[l._id]?.needsRevision).length;
  const topicNames = [...new Set(lessons.filter(l => !subject || l.subject === subject).map(l => l.topic).filter(Boolean))];
  const pagingKey = JSON.stringify([subject, topic, query, pricingFilter, revisionOnly]);
  const lessonsPage = usePagination(visible, pagingKey);

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
    const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
    return (
      <div className="space-y-1.5 mt-2.5 pt-2 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">
            {s.done} / {s.total} lessons completed
          </span>
          <span className={`font-black text-xs ${pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
            {pct}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              pct === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : pct > 0
                ? 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
                : 'bg-transparent'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400">{s.minutes} min total</p>
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

            {lessons.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Your Learning Progress:</span>
                  <span className="text-xs font-bold text-white">
                    {lessons.filter(l => progress[l._id]?.completed).length} of {lessons.length} lessons completed
                  </span>
                </div>
                <div className="w-full sm:w-64 space-y-1">
                  {(() => {
                    const done = lessons.filter(l => progress[l._id]?.completed).length;
                    const pct = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0;
                    return (
                      <>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">Overall Completion</span>
                          <span className={`font-black ${pct === 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>{pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 border border-slate-750 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              pct === 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
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

          <nav aria-label="Learning navigation" className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <button className="text-cyan-300 hover:underline cursor-pointer" onClick={() => navigate()}>
              Subjects
            </button>
            {subject && (
              <>
                <span>/</span>
                <button
                  className={`${active || topic ? 'text-cyan-300 hover:underline cursor-pointer' : 'text-white font-bold'}`}
                  onClick={() => navigate(subject)}
                >
                  {subject}
                </button>
              </>
            )}
            {topic && (
              <>
                <span>/</span>
                <button
                  className={`${active ? 'text-cyan-300 hover:underline cursor-pointer' : 'text-white font-bold'}`}
                  onClick={() => navigate(subject, topic)}
                >
                  {topic}
                </button>
              </>
            )}
            {active && (
              <>
                <span>/</span>
                <span className="text-white font-bold">{active.title}</span>
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

              <div className={`${panel} space-y-4`}>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search courses by title, topic, subject or description..."
                    className={control + ' pl-10'}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Subject Filter Pills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Subject
                    </span>
                    {subject && (
                      <button
                        onClick={() => { setSubject(''); setTopic(''); }}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Reset subject
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setSubject(''); setTopic(''); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        !subject
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/25'
                          : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span>All Subjects</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                        {eligibleByPricing.length}
                      </span>
                    </button>
                    {subjects.map(s => {
                      const count = eligibleByPricing.filter(l => l.subject === s).length;
                      const icon = {
                        Physics: '⚡',
                        Chemistry: '🧪',
                        Biology: '🌿',
                        'Combined Maths': '📐',
                        ICT: '💻',
                      }[s] || '📖';
                      const isSelected = subject === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSubject(isSelected ? '' : s);
                            setTopic('');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/25'
                              : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span>{icon} {s}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/30' : 'bg-slate-900/80 text-slate-400'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Course Type / Pricing Filter Pills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Course Type & Pricing
                    </span>
                    {pricingFilter !== 'all' && (
                      <button
                        onClick={() => setPricingFilter('all')}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Reset pricing
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPricingFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        pricingFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span>🌟 All Types</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                        {eligibleBySubject.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingFilter(pricingFilter === 'free' ? 'all' : 'free')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        pricingFilter === 'free'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                          : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      <span>Free Courses</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${pricingFilter === 'free' ? 'bg-black/30' : 'bg-slate-900/80 text-emerald-400'}`}>
                        {eligibleBySubject.filter(l => l.isFree || !l.price || l.price <= 0).length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingFilter(pricingFilter === 'paid' ? 'all' : 'paid')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        pricingFilter === 'paid'
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black'
                          : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Paid Courses (Full)</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${pricingFilter === 'paid' ? 'bg-black/30' : 'bg-slate-900/80 text-amber-400'}`}>
                        {eligibleBySubject.filter(l => !l.isFree && (l.price || 0) > 0 && l.billingType !== 'monthly').length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingFilter(pricingFilter === 'monthly' ? 'all' : 'monthly')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        pricingFilter === 'monthly'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black'
                          : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Monthly Paid</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${pricingFilter === 'monthly' ? 'bg-black/30' : 'bg-slate-900/80 text-purple-400'}`}>
                        {eligibleBySubject.filter(l => l.billingType === 'monthly' || enrollments[l._id]?.paymentType === 'partial').length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sub-filters / Actions Bar */}
                {(query || subject || topic || pricingFilter !== 'all' || revisionOnly || reviseCount > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      {reviseCount > 0 && (
                        <button
                          type="button"
                          className={`cursor-pointer px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                            revisionOnly
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                          onClick={() => setRevisionOnly(!revisionOnly)}
                        >
                          <span>Needs revision ({reviseCount})</span>
                        </button>
                      )}
                    </div>

                    {(query || subject || topic || pricingFilter !== 'all' || revisionOnly) && (
                      <button
                        type="button"
                        className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-semibold flex items-center gap-1"
                        onClick={() => {
                          setQuery('');
                          setSubject('');
                          setTopic('');
                          setPricingFilter('all');
                          setRevisionOnly(false);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear all filters</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {loading ? (
                <p role="status" className="text-slate-400">Loading courses…</p>
              ) : (
                <>
                  {lessonsPage.pagination.totalPages > 1 && (
                    <Pagination
                      {...lessonsPage.pagination}
                      label="Courses"
                    />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {revisionOnly
                          ? 'Needs revision'
                          : query
                          ? `Search results (${visible.length})`
                          : subject
                          ? `${subject} Courses`
                          : pricingFilter === 'free'
                          ? 'Free Courses'
                          : pricingFilter === 'paid'
                          ? 'Paid Courses'
                          : pricingFilter === 'monthly'
                          ? 'Monthly Paid Courses'
                          : 'All Courses'}
                      </h2>
                      {topic && (
                        <p className="text-xs text-cyan-300 mt-0.5">
                          Filtered by topic: <span className="font-bold">{topic}</span>
                        </p>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      {visible.length} {visible.length === 1 ? 'course' : 'courses'} found
                    </span>
                  </div>

                  {/* Topic Filter Pills when a subject is active and has multiple topics */}
                  {subject && topicNames.length > 1 && !query && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 pb-1">
                      <span className="text-xs font-semibold text-slate-400">Filter Topic:</span>
                      <button
                        onClick={() => setTopic('')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          !topic
                            ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                      >
                        All ({lessons.filter((l) => l.subject === subject && matchesPricing(l, pricingFilter)).length})
                      </button>
                      {topicNames.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTopic(topic === t ? '' : t)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            topic === t
                              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                              : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                          }`}
                        >
                          {t} ({lessons.filter((l) => l.subject === subject && l.topic === t && matchesPricing(l, pricingFilter)).length})
                        </button>
                      ))}
                    </div>
                  )}

                  {visible.length === 0 ? (
                    <div className={panel}>
                      <p className="text-slate-300 font-semibold">No courses match your selected filters.</p>
                      <p className="text-sm text-slate-400">Try changing the subject, pricing filter, or search keywords.</p>
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setQuery('');
                            setSubject('');
                            setTopic('');
                            setPricingFilter('all');
                            setRevisionOnly(false);
                          }}
                          className={button + ' text-xs py-2 px-3'}
                        >
                          Reset Filters
                        </button>
                      </div>
                      {isAdmin && (
                        <div className="pt-4 border-t border-slate-700/60 mt-2">
                          <p className="text-xs text-indigo-300 mb-2.5 font-medium">
                            You are signed in as an Administrator. You can create a new course now:
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
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {lessonsPage.items.map(l => {
                          const isProgram = Boolean(l.isMonthlyProgram);
                          return (
                            <button
                              key={l._id}
                              disabled={opening || loadingProgram}
                              onClick={() => {
                                if (isProgram) {
                                  openProgram(l._id);
                                } else {
                                  openLesson(l._id);
                                }
                              }}
                              className={panel + ' text-left hover:border-cyan-400/60 disabled:opacity-60 cursor-pointer transition group flex flex-col justify-between overflow-hidden'}
                            >
                              <div className="space-y-3 w-full">
                                {l.thumbnailUrl ? (
                                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 -mt-1 group-hover:scale-[1.01] transition-transform duration-200">
                                    <img
                                      src={l.thumbnailUrl}
                                      alt={l.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                                  </div>
                                ) : null}

                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <p className="text-xs text-cyan-300 font-semibold">
                                    {l.subject} · {l.topic}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isProgram ? (
                                      <>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                                          <Layers className="w-3 h-3 text-purple-400" />
                                          <span>Master Program</span>
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                          Rs. {(l.monthlyFee || l.price || 0).toLocaleString()} / mo
                                        </span>
                                      </>
                                    ) : (
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                          l.isFree || !l.price
                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                            : l.billingType === 'monthly'
                                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                        }`}
                                      >
                                        {l.isFree || !l.price
                                          ? 'FREE'
                                          : l.billingType === 'monthly'
                                          ? `Rs. ${(l.monthlyFee || l.price || 0).toLocaleString()} / mo`
                                          : `Rs. ${(l.price || 0).toLocaleString()}`}
                                      </span>
                                    )}

                                    {(() => {
                                      const p = progress[l._id];
                                      const completedCount = p?.completedBlocks?.length || 0;
                                      const totalSections = l.curriculumBlocks && l.curriculumBlocks.length > 0
                                        ? l.curriculumBlocks.length
                                        : ((l.videoCount || 0) + (l.description ? 1 : 0) + (l.quizCount > 0 ? 1 : 0));

                                      if (p?.completed) {
                                        return (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            <span>Completed ✓</span>
                                          </span>
                                        );
                                      }
                                      if (completedCount > 0) {
                                        return (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                            <span>{completedCount}/{totalSections} Done</span>
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
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
                                  {l.curriculumBlocks?.length
                                    ? ` · ${l.curriculumBlocks.length} sections`
                                    : `${l.videoCount > 0 ? ` · ${l.videoCount} videos` : ''}${l.resourceCount > 0 ? ` · ${l.resourceCount} PDFs` : ''}${l.quizCount > 0 ? ` · ${l.quizCount} questions` : ''}`}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/5 w-full">
                                {(() => {
                                  if (isProgram) {
                                    return (
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                          <Layers className="w-3.5 h-3.5 text-purple-400" />
                                          <span>{l.subCourseCount || 0} Monthly Classes</span>
                                        </span>
                                        <span className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-1">
                                          <span>Browse Classes →</span>
                                        </span>
                                      </div>
                                    );
                                  }

                                  const enr = enrollments[l._id];
                                  const isEnrolledApproved = enr?.status === 'approved' || isAdmin;
                                  const isPending = enr?.status === 'pending';
                                  const isDeclined = enr?.status === 'rejected';

                                  if (progress[l._id]?.completed) {
                                    return (
                                      <p className="text-sm font-semibold flex items-center gap-1.5 text-emerald-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span>Completed ✓</span>
                                      </p>
                                    );
                                  }

                                  if ((progress[l._id]?.completedBlocks?.length || 0) > 0) {
                                    return (
                                      <p className="text-sm font-semibold flex items-center gap-1.5 text-cyan-300">
                                        <span className="font-bold">
                                          {progress[l._id]?.completedBlocks?.length}/{l.curriculumBlocks?.length || l.videoCount || 1} sections done
                                        </span>
                                        <span>· Continue →</span>
                                      </p>
                                    );
                                  }

                                  if (!isEnrolledApproved) {
                                    if (isDeclined) {
                                      return (
                                        <div className="flex items-center justify-between w-full">
                                          <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                                            ✕ Declined · Check Reason
                                          </span>
                                          <span className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30">
                                            Re-apply →
                                          </span>
                                        </div>
                                      );
                                    }
                                    if (isPending) {
                                      return (
                                        <div className="flex items-center justify-between w-full">
                                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 animate-pulse">
                                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Slip Pending Review</span>
                                          </span>
                                          <span className="text-[11px] text-slate-400 font-medium">Under Verification</span>
                                        </div>
                                      );
                                    }
                                    // Not enrolled yet
                                    if (l.isFree || !l.price) {
                                      return (
                                        <div className="flex items-center justify-between w-full">
                                          <span className="text-xs font-semibold text-slate-400">Free Course</span>
                                          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Enroll for Free →</span>
                                          </span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                                          <span>
                                            {l.billingType === 'monthly'
                                              ? `Rs. ${(l.monthlyFee || l.price || 0).toLocaleString()} / mo`
                                              : `Rs. ${(l.price || 0).toLocaleString()}`}
                                          </span>
                                        </span>
                                        <span className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30">
                                          Enroll Now →
                                        </span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <p className="text-sm font-semibold text-indigo-300 flex items-center gap-1">
                                      <span>Start lesson →</span>
                                    </p>
                                  );
                                })()}
                              </div>
                            </button>
                          );
                        })}
                        </div>

                        {lessonsPage.pagination.totalPages > 1 && (
                          <div className="pt-2">
                            <Pagination
                              {...lessonsPage.pagination}
                              label="Courses"
                            />
                          </div>
                        )}
                      </>
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
          existingEnrollment={enrollments[enrollModalTarget._id]}
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

      {/* Monthly Program / Master Category Sub-Courses Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Layers className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                    {selectedProgram.subject} • Master Monthly Program
                  </span>
                  <h3 className="text-lg font-bold text-white leading-tight">{selectedProgram.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProgram(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Program Details Banner */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid md:grid-cols-12 gap-5 items-center p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                {selectedProgram.thumbnailUrl && (
                  <div className="md:col-span-4 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                    <img
                      src={selectedProgram.thumbnailUrl}
                      alt={selectedProgram.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className={`${selectedProgram.thumbnailUrl ? 'md:col-span-8' : 'md:col-span-12'} space-y-2`}>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedProgram.description}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap pt-1">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Rs. {(selectedProgram.monthlyFee || selectedProgram.price || 0).toLocaleString()} / month
                    </span>
                    <span className="text-xs text-slate-400">
                      ⚡ Select your target month class below to enroll and watch lectures
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Courses List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>Monthly Classes ({(selectedProgram.subCourses || []).length})</span>
                  </h4>
                  <span className="text-xs text-slate-400">Enroll per month</span>
                </div>

                {(!selectedProgram.subCourses || selectedProgram.subCourses.length === 0) ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-400 text-sm space-y-2">
                    <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No monthly classes have been published for this program yet.</p>
                    <p className="text-xs text-slate-500">Check back soon when new month schedules are released!</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {selectedProgram.subCourses.map((sc) => {
                      const enr = enrollments[sc._id];
                      const isApproved = enr?.status === 'approved' || isAdmin;
                      const isPending = enr?.status === 'pending';
                      const isDeclined = enr?.status === 'rejected';
                      const isExpired = Boolean(enr?.isExpired || (enr?.expiresAt && new Date(enr.expiresAt).getTime() < Date.now()));

                      return (
                        <div
                          key={sc._id}
                          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {sc.targetMonth ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{sc.targetMonth}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">{sc.topic || 'Class'}</span>
                              )}

                              <span className="text-xs font-black text-amber-300">
                                Rs. {(sc.price || selectedProgram.monthlyFee || selectedProgram.price || 0).toLocaleString()}
                              </span>
                            </div>

                            <h5 className="font-bold text-white text-sm line-clamp-1">{sc.title}</h5>
                            <p className="text-xs text-slate-400 line-clamp-2">{sc.description}</p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 font-medium">
                              <span>🎬 {sc.videoCount || 0} Videos</span>
                              <span>•</span>
                              <span>📄 {sc.resourceCount || 0} PDFs</span>
                              <span>•</span>
                              <span>
                                ⏱️{' '}
                                {sc.validityPeriod === '1_month'
                                  ? '1 mo validity'
                                  : sc.validityPeriod === '3_months'
                                  ? '3 mo validity'
                                  : sc.validityPeriod === '6_months'
                                  ? '6 mo validity'
                                  : sc.validityPeriod === '1_year'
                                  ? '1 yr validity'
                                  : 'Lifetime'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                            {isApproved && !isExpired ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>✓ Enrolled</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openLesson(sc._id, sc)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/20"
                                >
                                  Open Class →
                                </button>
                              </div>
                            ) : isPending ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>⏳ Slip Pending</span>
                                </span>
                                <span className="text-[11px] text-slate-500">Under Review</span>
                              </div>
                            ) : isDeclined ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold text-rose-400">✕ Declined</span>
                                <button
                                  type="button"
                                  onClick={() => setEnrollModalTarget(sc)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                                >
                                  Re-apply →
                                </button>
                              </div>
                            ) : isExpired ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-bold text-amber-400">Access Expired</span>
                                <button
                                  type="button"
                                  onClick={() => setEnrollModalTarget(sc)}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer"
                                >
                                  Renew Access →
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs text-slate-400">Not enrolled</span>
                                <button
                                  type="button"
                                  onClick={() => setEnrollModalTarget(sc)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1"
                                >
                                  <span>Enroll for {sc.targetMonth || 'This Month'} →</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Mind Maze A/L Platform • Monthly Paid Class System
              </span>
              <button
                type="button"
                onClick={() => setSelectedProgram(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
