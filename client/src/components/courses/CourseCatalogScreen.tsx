import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { BookOpen, FileText, Video, HelpCircle, CheckCircle, Search, Filter, Loader2, ExternalLink, Play } from 'lucide-react';

interface Course {
  _id: string;
  title: string;
  description: string;
  subject: string;
  stream: string;
  pdfUrl?: string;
  pdfFileName?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  quiz?: Array<{
    _id?: string;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  }>;
  createdAt: string;
}

export const CourseCatalogScreen: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  useEffect(() => {
    fetchCourses();
    const handleUpdate = () => fetchCourses();
    window.addEventListener('mindmaze_courses_updated', handleUpdate);
    return () => window.removeEventListener('mindmaze_courses_updated', handleUpdate);
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCourses();
      // Only show real DB courses — no hardcoded fallbacks
      setCourses(res.courses || []);
    } catch (err: any) {
      setError('Failed to load courses. Please try again.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = (courses || []).filter((c) => {
    if (!c) return false;
    if (selectedSubject !== 'All' && c.subject !== selectedSubject) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (c.title || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const subjects = ['All', ...Array.from(new Set((courses || []).map((c) => c && c.subject).filter(Boolean)))];

  const handleQuizAnswer = (optionIdx: number) => {
    if (selectedQuizOption !== null) return;
    setSelectedQuizOption(optionIdx);
    if (activeCourse?.quiz && optionIdx === activeCourse.quiz[activeQuizIndex].correctOptionIndex) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const nextQuizQuestion = () => {
    if (!activeCourse?.quiz) return;
    if (activeQuizIndex + 1 < activeCourse.quiz.length) {
      setActiveQuizIndex((prev) => prev + 1);
      setSelectedQuizOption(null);
    } else {
      setShowQuizResult(true);
    }
  };

  const resetQuiz = () => {
    setActiveQuizIndex(0);
    setSelectedQuizOption(null);
    setShowQuizResult(false);
    setQuizScore(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/15 shadow-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-400" /> A/L Courses & Study Materials
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access curated study PDFs, video tutorials, and topic quizzes provided by instructors.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-sm cursor-pointer"
            >
              {subjects.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content / Modal */}
      {activeCourse ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
          <button
            onClick={() => {
              setActiveCourse(null);
              resetQuiz();
            }}
            className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
          >
            ← Back to All Courses
          </button>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {activeCourse.subject}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300">
                  {activeCourse.stream}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">{activeCourse.title}</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{activeCourse.description}</p>

              {/* PDF Document View */}
              {activeCourse.pdfUrl && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-rose-400" />
                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        {activeCourse.pdfFileName || 'Course Study Material (PDF)'}
                      </h4>
                      <p className="text-xs text-slate-400">Cloudinary Secured Document</p>
                    </div>
                  </div>
                  <a
                    href={activeCourse.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-all"
                  >
                    View / Download PDF <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Video Player */}
              {activeCourse.videoUrl && (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    <Video className="w-5 h-5 text-cyan-400" /> Video Lesson
                  </h4>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    {activeCourse.videoUrl.includes('youtube.com') || activeCourse.videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={activeCourse.videoUrl.replace('watch?v=', 'embed/')}
                        className="w-full h-full"
                        allowFullScreen
                        title="Course Video"
                      />
                    ) : (
                      <a
                        href={activeCourse.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl font-bold text-sm"
                      >
                        <Play className="w-5 h-5 fill-current" /> Watch Lesson Video
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Attached Course Quiz */}
            {activeCourse.quiz && activeCourse.quiz.length > 0 && (
              <div className="w-full lg:w-96 p-5 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-400" /> Course Quiz
                </h3>

                {!showQuizResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Question {activeQuizIndex + 1} of {activeCourse.quiz.length}</span>
                      <span>Score: {quizScore}</span>
                    </div>

                    <p className="font-medium text-white text-sm">
                      {activeCourse.quiz[activeQuizIndex].questionText}
                    </p>

                    <div className="space-y-2">
                      {activeCourse.quiz[activeQuizIndex].options.map((opt, idx) => {
                        const isCorrect = idx === activeCourse.quiz![activeQuizIndex].correctOptionIndex;
                        const isSelected = selectedQuizOption === idx;

                        let btnBg = 'bg-slate-900 hover:bg-slate-700 text-slate-200';
                        if (selectedQuizOption !== null) {
                          if (isCorrect) btnBg = 'bg-emerald-600/30 border-emerald-500 text-emerald-300';
                          else if (isSelected) btnBg = 'bg-rose-600/30 border-rose-500 text-rose-300';
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleQuizAnswer(idx)}
                            className={`w-full text-left p-3 rounded-xl border border-slate-700 text-xs font-medium transition-all ${btnBg}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {selectedQuizOption !== null && (
                      <div className="pt-2 space-y-3">
                        {activeCourse.quiz[activeQuizIndex].explanation && (
                          <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700">
                            {activeCourse.quiz[activeQuizIndex].explanation}
                          </p>
                        )}
                        <button
                          onClick={nextQuizQuestion}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow"
                        >
                          Next Question →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h4 className="text-xl font-bold text-white">Quiz Completed!</h4>
                    <p className="text-sm text-slate-300">
                      You scored <strong className="text-emerald-400">{quizScore}</strong> out of {activeCourse.quiz.length}
                    </p>
                    <button
                      onClick={resetQuiz}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Course Grid */
        <div>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p>Loading course catalog...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-semibold text-white">No courses found</p>
              <p className="text-xs text-slate-500 mt-1">Admin will upload study PDFs and courses soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((c) => (
                <div
                  key={c._id}
                  onClick={() => setActiveCourse(c)}
                  className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/80 p-5 hover:border-indigo-500/50 hover:bg-slate-900 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {c.subject}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">{c.stream}</span>
                    </div>

                    <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {c.title}
                    </h3>

                    <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      {c.pdfUrl && <span className="flex items-center gap-1 text-rose-400 font-semibold"><FileText className="w-3.5 h-3.5" /> PDF</span>}
                      {c.videoUrl && <span className="flex items-center gap-1 text-cyan-400 font-semibold"><Video className="w-3.5 h-3.5" /> Video</span>}
                      {c.quiz && c.quiz.length > 0 && <span className="flex items-center gap-1 text-amber-400 font-semibold"><HelpCircle className="w-3.5 h-3.5" /> Quiz ({c.quiz.length})</span>}
                    </div>

                    <span className="text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                      Open →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
