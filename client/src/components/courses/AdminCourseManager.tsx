import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Upload, Plus, Trash2, FileText, Video, HelpCircle, Check, Loader2, BookOpen, Info } from 'lucide-react';

interface QuizQuestionInput {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

// Same defaults shown to students when no DB courses exist
const DEFAULT_COURSES = [
  {
    _id: 'c1',
    title: 'Combined Mathematics Pure Algebra & Calculus',
    description: 'Complete video walkthrough of Pure Mathematics Paper I topics with model questions and solved integrals.',
    subject: 'Combined Mathematics',
    stream: 'Physical Science',
    isDefault: true,
  },
  {
    _id: 'c2',
    title: 'Physics Mechanics & Newton Laws Masterclass',
    description: 'Master vectors, momentum, work-energy, and circular motion with step-by-step problem sets.',
    subject: 'Physics',
    stream: 'Physical Science',
    isDefault: true,
  },
  {
    _id: 'c3',
    title: 'Organic Chemistry Reactions & Mechanisms',
    description: 'Comprehensive guide covering alkenes, alcohols, carbonyls, and synthesis paths for A/L Paper II.',
    subject: 'Chemistry',
    stream: 'Physical Science',
    isDefault: true,
  },
];

export const AdminCourseManager: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [stream, setStream] = useState('Physical Science');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Quiz Builder State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionInput[]>([]);
  const [qText, setQText] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.getCourses();
      // Show DB courses if any, otherwise show the built-in defaults
      // (same logic as student-side CourseCatalogScreen)
      setCourses(res.courses && res.courses.length > 0 ? res.courses : DEFAULT_COURSES);
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setCourses(DEFAULT_COURSES);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestionToQuiz = () => {
    if (!qText.trim() || !opt0.trim() || !opt1.trim()) {
      alert('Please fill out the question text and at least 2 options.');
      return;
    }
    const options = [opt0, opt1, opt2, opt3].filter((o) => o.trim().length > 0);
    setQuizQuestions((prev) => [
      ...prev,
      {
        questionText: qText,
        options,
        correctOptionIndex: correctIdx,
        explanation,
      },
    ]);
    // Reset inputs
    setQText('');
    setOpt0('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
    setCorrectIdx(0);
    setExplanation('');
  };

  const handleRemoveQuizQuestion = (index: number) => {
    setQuizQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setMessage({ type: 'error', text: 'Title and description are required.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('subject', subject);
      formData.append('stream', stream);
      if (videoUrl) formData.append('videoUrl', videoUrl);
      if (pdfFile) formData.append('pdfFile', pdfFile);
      if (quizQuestions.length > 0) {
        formData.append('quizJson', JSON.stringify(quizQuestions));
      }

      await api.createCourse(formData);

      setMessage({ type: 'success', text: 'Course uploaded & created successfully with Cloudinary PDF storage!' });
      // Reset form
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setPdfFile(null);
      setQuizQuestions([]);

      fetchCourses();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload course.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string, isDefault?: boolean) => {
    if (isDefault) {
      alert('This is a built-in demo course. When you publish your first real course, students will see your custom course.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this course and its Cloudinary media?')) return;
    try {
      await api.deleteCourse(id);
      fetchCourses();
    } catch (err: any) {
      alert('Error deleting course: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-400" /> Admin Course Manager
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Upload PDF study guides to Cloudinary, attach video links, and add course quizzes.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Course Creation Form */}
      <form onSubmit={handleSubmitCourse} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">Create New Course</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Course Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Physics Mechanics Masterclass 2026"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Combined Maths">Combined Maths</option>
                <option value="Biology">Biology</option>
                <option value="ICT">ICT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Stream</label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
              >
                <option value="Physical Science">Physical Science</option>
                <option value="Biological Science">Biological Science</option>
                <option value="Maths">Maths</option>
                <option value="Bio">Bio</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Overview of syllabus coverage, recommended study hours, and key concepts..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Media Upload Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* PDF File Picker */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-400" /> Upload PDF Material (Cloudinary)
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
            />
            {pdfFile && <p className="text-[11px] text-emerald-400">Selected: {pdfFile.name}</p>}
          </div>

          {/* Video URL */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Video className="w-4 h-4 text-cyan-400" /> Video Lesson URL (Optional)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Quiz Builder Sub-Section */}
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 space-y-4">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" /> Attach Quiz Questions ({quizQuestions.length} added)
          </h4>

          {quizQuestions.length > 0 && (
            <div className="space-y-2">
              {quizQuestions.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl text-xs text-slate-200">
                  <div>
                    <span className="font-bold text-indigo-400">Q{idx + 1}: </span> {q.questionText} ({q.options.length} options)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuizQuestion(idx)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Question text..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={opt0}
                onChange={(e) => setOpt0(e.target.value)}
                placeholder="Option 1"
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
              <input
                type="text"
                value={opt1}
                onChange={(e) => setOpt1(e.target.value)}
                placeholder="Option 2"
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
              <input
                type="text"
                value={opt2}
                onChange={(e) => setOpt2(e.target.value)}
                placeholder="Option 3 (optional)"
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
              <input
                type="text"
                value={opt3}
                onChange={(e) => setOpt3(e.target.value)}
                placeholder="Option 4 (optional)"
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-300">Correct Option:</label>
              <select
                value={correctIdx}
                onChange={(e) => setCorrectIdx(Number(e.target.value))}
                className="bg-slate-800 text-xs text-white px-3 py-1 rounded-lg border border-slate-700"
              >
                <option value={0}>Option 1</option>
                <option value={1}>Option 2</option>
                <option value={2}>Option 3</option>
                <option value={3}>Option 4</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddQuestionToQuiz}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question to Quiz
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Uploading to Cloudinary & Publishing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" /> Publish Course
            </>
          )}
        </button>
      </form>

      {/* Existing Courses List */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base">Existing Courses ({courses.length})</h3>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading courses...</div>
        ) : courses.length === 0 ? (
          <p className="text-xs text-slate-500">No courses uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c._id} className="flex items-center justify-between p-4 bg-slate-800/80 rounded-xl border border-slate-700">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-sm">{c.title}</h4>
                    {c.isDefault && (
                      <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-medium flex items-center gap-1">
                        <Info className="w-3 h-3" /> Built-in Demo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Subject: {c.subject} | Stream: {c.stream} | {c.pdfUrl ? 'PDF Uploaded' : 'No PDF'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteCourse(c._id, c.isDefault)}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title={c.isDefault ? "Built-in Demo Course" : "Delete Course"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
