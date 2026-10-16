import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import React, { useEffect, useRef, useState } from 'react';
import { api, getAuthToken, getStoredUser } from '../../services/api';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import { Lesson, Progress, CourseEnrollmentRecord, subjects, control, button, panel } from './learning';
import { LessonView } from './LessonView';
import { AdminCourseManager } from './AdminCourseManager';
import { CourseEnrollModal } from './CourseEnrollModal';
import {
  ShieldCheck,
  Plus,
  GraduationCap,
  Settings,
  CreditCard,
  Lock,
  CheckCircle2,
  Clock,
  Search,
  X,
  Layers,
  Calendar,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Video,
  FileText,
} from 'lucide-react';

export const CourseCatalogScreen: React.FC = () => {
  // Main classes list (Level 1 - Diagram 3)
  const [mainCourses, setMainCourses] = useState<Lesson[]>([]);
  // Selected main class with populated subCourses (Level 2 - Diagram 2)
  const [selectedMainClass, setSelectedMainClass] = useState<Lesson | null>(null);
  // Active monthly class currently in learning view (Level 3 - Diagram 4)
  const [activeMonthlyClass, setActiveMonthlyClass] = useState<Lesson | null>(null);

  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [enrollments, setEnrollments] = useState<Record<string, CourseEnrollmentRecord>>({});
  const [enrollModalTarget, setEnrollModalTarget] = useState<Lesson | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [progressError, setProgressError] = useState('');

  // Filters for Main Courses
  const [subject, setSubject] = useState('');
  const [query, setQuery] = useState('');

  const user = getStoredUser();
  const isAdmin = ['admin', 'content_manager'].includes(user?.role);
  const [mode, setMode] = useState<'catalog' | 'admin'>('catalog');

  const catalogRequest = useRef(0);

  const updateProgress = (p: Progress) => {
    const cId = typeof p.course === 'object' && p.course !== null ? (p.course as any)._id : p.course;
    if (cId) {
      setProgress((prev) => ({ ...prev, [cId]: p }));
    }
  };

  const load = async () => {
    const version = ++catalogRequest.current;
    setLoading(true);
    setError('');
    setProgressError('');

    try {
      const results = await Promise.allSettled([
        api.getCourses(),
        getAuthToken() ? api.getCourseProgress() : Promise.resolve({ progress: [] }),
        getAuthToken() ? api.getMyEnrollments() : Promise.resolve({ enrollments: [] }),
      ]);

      if (version !== catalogRequest.current) return;

      if (results[0].status === 'fulfilled') {
        setMainCourses(results[0].value.courses);
      } else {
        setError('Could not load courses. Please retry.');
      }

      if (results[1].status === 'fulfilled') {
        const pMap: Record<string, Progress> = {};
        for (const p of results[1].value.progress || []) {
          const cId = typeof p.course === 'object' && p.course !== null ? (p.course as any)._id : p.course;
          if (cId) pMap[cId] = p;
        }
        setProgress(pMap);
      } else {
        setProgressError('Saved progress could not be loaded.');
      }

      if (results[2].status === 'fulfilled') {
        const eMap: Record<string, CourseEnrollmentRecord> = {};
        for (const e of results[2].value.enrollments || []) {
          const cId = typeof e.course === 'object' ? e.course?._id : e.course;
          if (cId) eMap[cId] = e;
        }
        setEnrollments(eMap);
      }
    } finally {
      if (version === catalogRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('mindmaze_courses_updated', load);
    return () => {
      catalogRequest.current++;
      window.removeEventListener('mindmaze_courses_updated', load);
    };
  }, []);

  // Open a Main Course into Diagram 2 (Main Class Page)
  const openMainClass = async (mainCourseId: string) => {
    setLoadingDetails(true);
    setError('');
    try {
      const res = await api.getCourseById(mainCourseId);
      setSelectedMainClass(res.course);
      setActiveMonthlyClass(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Could not load main class details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open a Monthly Class into Diagram 4 (LessonView)
  const openMonthlyClass = async (monthlyCourse: Lesson) => {
    const enr = enrollments[monthlyCourse._id];
    const isEnrolledApproved = enr?.status === 'approved' || isAdmin;
    const isExpired = Boolean(
      enr?.isExpired || (enr?.expiresAt && new Date(enr.expiresAt).getTime() < Date.now())
    );

    // If not approved or expired, open enrollment modal
    if (!isEnrolledApproved || isExpired) {
      setEnrollModalTarget(monthlyCourse);
      return;
    }

    setLoadingDetails(true);
    setError('');
    try {
      const res = await api.getCourseById(monthlyCourse._id);
      setActiveMonthlyClass(res.course);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (getAuthToken()) {
        try {
          const saved = await api.saveCourseProgress(monthlyCourse._id, {});
          updateProgress(saved.progress);
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Could not open monthly class.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filter Main Courses
  const visibleMainCourses = mainCourses.filter(
    (c) =>
      (!subject || c.subject === subject) &&
      (!query.trim() || [c.title, c.subject, c.description].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  );

  const pagingKey = JSON.stringify([subject, query]);
  const mainCoursesPage = usePagination(visibleMainCourses, pagingKey);

  return (
    <div className="learning-area space-y-6 pb-12">
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
                Switch between managing course structure and previewing the student views.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setMode('catalog');
                setActiveMonthlyClass(null);
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
                setActiveMonthlyClass(null);
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                mode === 'admin'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40'
                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Manage Courses</span>
            </button>
          </div>
        </div>
      )}

      {/* RENDER ADMIN COURSE MANAGER WHEN IN ADMIN MODE */}
      {isAdmin && mode === 'admin' ? (
        <AdminCourseManager />
      ) : activeMonthlyClass ? (
        /* LEVEL 3: DIAGRAM 4 - MONTHLY CLASS LEARNING VIEW */
        <div className="space-y-4">
          <button
            onClick={() => setActiveMonthlyClass(null)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back to {selectedMainClass?.title || 'Main Course'}</span>
          </button>

          <LessonView
            key={activeMonthlyClass._id + ':' + activeMonthlyClass.revision}
            lesson={activeMonthlyClass}
            progress={progress[activeMonthlyClass._id]}
            onProgress={updateProgress}
            onBack={() => setActiveMonthlyClass(null)}
          />
        </div>
      ) : selectedMainClass ? (
        /* LEVEL 2: DIAGRAM 2 - MAIN CLASS PAGE WITH MONTHLY CLASSES */
        <div className="space-y-6">
          <nav aria-label="Learning navigation" className="flex items-center gap-2 text-sm text-slate-400">
            <button
              className="text-cyan-300 hover:underline cursor-pointer flex items-center gap-1.5"
              onClick={() => setSelectedMainClass(null)}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Courses</span>
            </button>
            <span>/</span>
            <span className="text-white font-bold truncate">{selectedMainClass.title}</span>
          </nav>

          {/* Diagram 2 Header Card: Picture, Title, Description, Monthly Fee */}
          <div className="rounded-2xl border border-white/10 bg-[#161831]/80 backdrop-blur-md p-6 shadow-2xl overflow-hidden">
            <div className="grid md:grid-cols-12 gap-6 items-center">
              {selectedMainClass.thumbnailUrl ? (
                <div className="md:col-span-4 aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg">
                  <img
                    src={selectedMainClass.thumbnailUrl}
                    alt={selectedMainClass.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="md:col-span-4 aspect-video rounded-xl bg-gradient-to-br from-purple-900/40 to-slate-900 border border-slate-800 flex items-center justify-center text-purple-400">
                  <Layers className="w-12 h-12" />
                </div>
              )}

              <div className={`${selectedMainClass.thumbnailUrl ? 'md:col-span-8' : 'md:col-span-12'} space-y-3`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {selectedMainClass.subject}
                  </span>
                  {selectedMainClass.stream && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {selectedMainClass.stream} Stream
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Rs. {(selectedMainClass.monthlyFee || selectedMainClass.price || 0).toLocaleString()} / month
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  {selectedMainClass.title}
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedMainClass.description}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Classes Section matching Diagram 2 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <span>Monthly Classes ({(selectedMainClass.subCourses || []).length})</span>
              </h3>
              <span className="text-xs text-slate-400">Enroll per month to access videos & notes</span>
            </div>

            {(!selectedMainClass.subCourses || selectedMainClass.subCourses.length === 0) ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 text-slate-400 text-sm space-y-2">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-300">No monthly classes published yet.</p>
                <p className="text-xs text-slate-500">Upcoming monthly schedules will appear here soon!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedMainClass.subCourses.map((sc) => {
                  const enr = enrollments[sc._id];
                  const isApproved = enr?.status === 'approved' || isAdmin;
                  const isPending = enr?.status === 'pending';
                  const isDeclined = enr?.status === 'rejected';
                  const isExpired = Boolean(
                    enr?.isExpired || (enr?.expiresAt && new Date(enr.expiresAt).getTime() < Date.now())
                  );

                  return (
                    <div
                      key={sc._id}
                      className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-xl"
                    >
                      <div className="space-y-3">
                        {/* Picture / Thumbnail */}
                        {sc.thumbnailUrl ? (
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                            <img src={sc.thumbnailUrl} alt={sc.title} className="w-full h-full object-cover" />
                          </div>
                        ) : null}

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{sc.targetMonth || 'Monthly Class'}</span>
                          </span>

                          <span className="text-xs font-black text-amber-300">
                            Rs. {(sc.price || selectedMainClass.monthlyFee || 0).toLocaleString()}
                          </span>
                        </div>

                        <h4 className="font-bold text-white text-base leading-snug">{sc.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{sc.description}</p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 font-medium border-t border-white/5">
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

                      {/* Enrollment Actions */}
                      <div className="pt-3 border-t border-white/5">
                        {isApproved && !isExpired ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>✓ Enrolled</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openMonthlyClass(sc)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                            >
                              <span>Enter Class →</span>
                            </button>
                          </div>
                        ) : isPending ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>⏳ Slip Pending</span>
                            </span>
                            <span className="text-[11px] text-slate-500">Under Admin Review</span>
                          </div>
                        ) : isDeclined ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-rose-400">✕ Declined</span>
                            <button
                              type="button"
                              onClick={() => setEnrollModalTarget(sc)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
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
                              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer"
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
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-purple-600/30 flex items-center gap-1.5"
                            >
                              <span>Enroll Now →</span>
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
      ) : (
        /* LEVEL 1: DIAGRAM 3 - MAIN COURSES CATALOG */
        <>
          <header className={panel}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Courses</p>
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
            <p className="text-sm text-slate-400">
              Select your subject and join master class programs with monthly lecture recordings.
            </p>
          </header>

          {error && (
            <div role="alert" className="text-rose-300">
              {error} <button className="underline cursor-pointer" onClick={load}>Retry</button>
            </div>
          )}

          {/* Search & Subject Filters */}
          <div className={`${panel} space-y-4`}>
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search main courses by title or subject..."
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
                    onClick={() => setSubject('')}
                    className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    Reset subject
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubject('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    !subject
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/25'
                      : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                  }`}
                >
                  <span>All Subjects</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
                    {mainCourses.length}
                  </span>
                </button>
                {subjects.map((s) => {
                  const count = mainCourses.filter((c) => c.subject === s).length;
                  const icon =
                    {
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
                      onClick={() => setSubject(isSelected ? '' : s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/25'
                          : 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <span>
                        {icon} {s}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-black/30' : 'bg-slate-900/80 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Diagram 3: Main Courses Cards Grid */}
          {loading ? (
            <p role="status" className="text-slate-400">Loading courses…</p>
          ) : visibleMainCourses.length === 0 ? (
            <div className={panel}>
              <p className="text-slate-300 font-semibold">No main courses found for this filter.</p>
              <p className="text-sm text-slate-400">Try choosing a different subject or clearing your search.</p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setQuery('');
                    setSubject('');
                  }}
                  className={button + ' text-xs py-2 px-3'}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mainCoursesPage.items.map((course) => (
                <button
                  key={course._id}
                  disabled={loadingDetails}
                  onClick={() => openMainClass(course._id)}
                  className={
                    panel +
                    ' text-left hover:border-purple-500/60 disabled:opacity-60 cursor-pointer transition group flex flex-col justify-between overflow-hidden shadow-xl'
                  }
                >
                  <div className="space-y-3 w-full">
                    {/* Picture / Thumbnail (Diagram 3) */}
                    {course.thumbnailUrl ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 -mt-1 group-hover:scale-[1.01] transition-transform duration-200">
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-video rounded-xl bg-gradient-to-br from-purple-900/40 via-slate-900 to-indigo-950 border border-slate-800/80 -mt-1 flex items-center justify-center text-purple-400">
                        <Layers className="w-12 h-12" />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-cyan-300 font-bold">
                        {course.subject} {course.stream ? `• ${course.stream}` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Rs. {(course.monthlyFee || course.price || 0).toLocaleString()} / mo
                      </span>
                    </div>

                    {/* Title & Description (Diagram 3) */}
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{course.description}</p>
                  </div>

                  {/* Monthly Classes badge & Browse button (Diagram 3) */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/5 w-full">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>{course.subCourseCount || 0} Monthly Classes</span>
                    </span>

                    <span className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-1">
                      <span>Browse Classes →</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {mainCoursesPage.pagination.totalPages > 1 && (
            <div className="pt-2">
              <Pagination {...mainCoursesPage.pagination} label="Courses" />
            </div>
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
              openMonthlyClass(target);
            }
          }}
        />
      )}
    </div>
  );
};
