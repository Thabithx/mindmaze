import React, { useEffect, useState } from 'react';
import { Pagination } from '../common/Pagination';
import { usePagedResource } from '../../hooks/usePagedResource';
import { api, apiFetch } from '../../services/api';
import { Lesson, subjects, control, button, panel, extractYouTubeId, getYouTubeThumbnail, CurriculumBlock } from './learning';
import { LessonView } from './LessonView';
import {
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Lock,
  Layers,
  ArrowRight,
  Edit,
  Eye,
  RefreshCw,
  CreditCard,
  Radio,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Calendar,
  Clock,
  Link as LinkIcon,
  CheckSquare,
} from 'lucide-react';

type Question = {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
};

type VideoItem = {
  title: string;
  url: string;
  description: string;
};

const DEFAULT_BANK_DETAILS = `Bank: Commercial Bank / Bank of Ceylon
Account Name: Mind Maze Education
Account Number: 8009234567
Branch: Colombo Fort
Deposit the fee and upload the bank transfer receipt / deposit slip.`;

const initialForm = () => ({
  title: '',
  description: '',
  subject: 'Physics',
  stream: 'Both',
  topic: '',
  topicOrder: 1,
  lessonOrder: 1,
  estimatedMinutes: 20,
  medium: 'English',
  syllabus: 'current',
  status: 'published' as 'draft' | 'published',
  price: 0,
  isFree: true,
  bankDetails: DEFAULT_BANK_DETAILS,
});

export const AdminCourseManager: React.FC = () => {
  const [form, setForm] = useState(initialForm());
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Active form section tab
  const [activeTab, setActiveTab] = useState<'info' | 'curriculum'>('info');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Content state
  const [curriculumBlocks, setCurriculumBlocks] = useState<CurriculumBlock[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [resources, setResources] = useState<NonNullable<Lesson['resources']>>([]);
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [related, setRelated] = useState<string[]>([]);
  const [preview, setPreview] = useState<Lesson | null>(null);
  const [fileKey, setFileKey] = useState(0);

  // Filters & listings
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const lessonsPage = usePagedResource<Lesson>(
    '/courses/admin/list',
    'courses',
    { q: search, subject: filterSubject, status: filterStatus },
    'mindmaze_courses_updated'
  );

  const [paperSearch, setPaperSearch] = useState('');
  const [selectedPapersOnly, setSelectedPapersOnly] = useState(false);
  const [topicChoices, setTopicChoices] = useState<{ subject: string; topic: string; topicOrder: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadTopics = () =>
      apiFetch('/courses/admin/topics')
        .then((r) => {
          if (!cancelled) setTopicChoices(r.topics || []);
        })
        .catch(() => {});
    loadTopics();
    window.addEventListener('mindmaze_courses_updated', loadTopics);
    return () => {
      cancelled = true;
      window.removeEventListener('mindmaze_courses_updated', loadTopics);
    };
  }, []);

  const papersPage = usePagedResource<any>(
    '/past-papers',
    'papers',
    selectedPapersOnly ? { ids: related.join(','), q: paperSearch } : { subject: form.subject, q: paperSearch },
    'mindmaze_papers_updated'
  );

  const lessons = lessonsPage.items;
  const papers = papersPage.items;
  const loading = lessonsPage.loading;
  const load = lessonsPage.reload;

  const reset = () => {
    setForm(initialForm());
    setEditing(null);
    setCurriculumBlocks([]);
    setVideos([]);
    setFiles([]);
    setResources([]);
    setQuiz([]);
    setRelated([]);
    setFileKey((k) => k + 1);
    setError('');
    setActiveTab('info');
  };

  const edit = (lesson: Lesson) => {
    setEditing(lesson);
    setForm({
      title: lesson.title,
      description: lesson.description,
      subject: lesson.subject,
      stream: lesson.stream,
      topic: lesson.topic,
      topicOrder: lesson.topicOrder,
      lessonOrder: lesson.lessonOrder,
      estimatedMinutes: lesson.estimatedMinutes,
      medium: lesson.medium,
      syllabus: lesson.syllabus,
      status: (lesson.status as 'draft' | 'published') || 'published',
      price: lesson.price ?? 0,
      isFree: lesson.isFree ?? ((lesson.price ?? 0) === 0),
      bankDetails: lesson.bankDetails || DEFAULT_BANK_DETAILS,
    });

    // Populate curriculum blocks, or seamlessly convert legacy lesson contents into the curriculum
    let blocks: CurriculumBlock[] = [];
    if (lesson.curriculumBlocks && lesson.curriculumBlocks.length > 0) {
      blocks = lesson.curriculumBlocks.map((b, i) => ({
        ...b,
        order: b.order ?? i,
      }));
    } else {
      if (lesson.description?.trim()) {
        blocks.push({
          type: 'description',
          title: 'Lesson Introduction & Overview',
          description: lesson.description.trim(),
          order: blocks.length,
        });
      }
      (lesson.videos || []).forEach((v, idx) => {
        blocks.push({
          type: 'video',
          title: v.title || `Video Part ${idx + 1}`,
          url: v.url || '',
          description: v.description || '',
          order: blocks.length,
        });
      });
      (lesson.resources || []).forEach((r, idx) => {
        blocks.push({
          type: 'document',
          title: r.title || `Study Notes ${idx + 1}`,
          pdfUrl: r.path,
          pdfFileName: r.title,
          size: r.size,
          order: blocks.length,
        });
      });
      if (lesson.quiz && lesson.quiz.length > 0) {
        blocks.push({
          type: 'quiz',
          title: 'Practice Quiz & Knowledge Check',
          quizQuestions: lesson.quiz.map((q) => ({
            questionText: q.questionText,
            options: [...q.options],
            correctOptionIndex: q.correctOptionIndex ?? 0,
            explanation: q.explanation || '',
          })),
          order: blocks.length,
        });
      }
    }
    setCurriculumBlocks(blocks);

    setVideos(
      (lesson.videos || []).map((v) => ({
        title: v.title || '',
        url: v.url || '',
        description: v.description || '',
      }))
    );
    setResources(lesson.resources || []);
    setFiles([]);
    setQuiz(
      (lesson.quiz || []).map((q) => ({
        questionText: q.questionText,
        options: [...q.options],
        correctOptionIndex: q.correctOptionIndex ?? 0,
        explanation: q.explanation || '',
      }))
    );
    setRelated(lesson.relatedPaperIds || []);
    setFileKey((k) => k + 1);
    setError('');
    setMessage('');
    setActiveTab('info');
    document.getElementById('lesson-editor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));

      // Collect and sync all quiz questions across quiz blocks
      const allQuizQuestions = curriculumBlocks
        .filter((b) => b.type === 'quiz')
        .flatMap((b) => b.quizQuestions || []);
      body.append('quizJson', JSON.stringify(allQuizQuestions));

      // Collect and sync all video lectures across video blocks
      const allVideos = curriculumBlocks
        .filter((b) => b.type === 'video')
        .map((b) => ({ title: b.title || 'Video', url: b.url || '', description: b.description || '' }));
      body.append('videosJson', JSON.stringify(allVideos));

      // Append files uploaded directly on document blocks
      curriculumBlocks.forEach((b) => {
        if (b.type === 'document' && b.pendingFile) {
          body.append('pdfFiles', b.pendingFile);
        }
      });
      files.forEach((f) => body.append('pdfFiles', f));

      // Clean curriculum blocks for JSON transmission
      const cleanBlocks = curriculumBlocks.map(({ pendingFile, ...b }) => b);
      body.append('curriculumBlocksJson', JSON.stringify(cleanBlocks));

      body.append('relatedPaperIds', JSON.stringify(related));
      body.append('keepResourceIds', JSON.stringify(resources.map((r) => r.id)));
      if (editing) body.append('revision', String(editing.revision));

      const result = editing ? await api.updateCourse(editing._id, body) : await api.createCourse(body);
      load();
      reset();
      setMessage(
        result.course.status === 'draft'
          ? 'Draft saved successfully. (Hidden from students)'
          : 'Lesson published successfully! Students can access it now.'
      );
      window.dispatchEvent(new Event('mindmaze_courses_updated'));
    } catch (e: any) {
      setError(e.message || 'Could not save lesson.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (lesson: Lesson) => {
    if (!window.confirm(`Are you sure you want to delete "${lesson.title}" and its progress?`)) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteCourse(lesson._id);
      load();
      if (editing?._id === lesson._id) reset();
      setMessage('Lesson deleted.');
      window.dispatchEvent(new Event('mindmaze_courses_updated'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addVideo = () => {
    setVideos((prev) => [...prev, { title: `Part ${prev.length + 1}`, url: '', description: '' }]);
  };

  const addCurriculumBlock = (type: CurriculumBlock['type']) => {
    const newBlock: CurriculumBlock = {
      type,
      title:
        type === 'live_class'
          ? 'Live Class Discussion'
          : type === 'video'
          ? `Video Lecture ${curriculumBlocks.filter((b) => b.type === 'video').length + 1}`
          : type === 'document'
          ? 'Lecture Notes (PDF)'
          : type === 'quiz'
          ? 'Practice Quiz & Knowledge Check'
          : 'Module Guidance & Overview',
      description: '',
      order: curriculumBlocks.length,
      ...(type === 'live_class'
        ? {
            meetingPlatform: 'Zoom',
            liveLink: '',
            scheduledTime: '',
            isCompleted: false,
            recordingUrl: '',
          }
        : {}),
      ...(type === 'video' ? { url: '' } : {}),
      ...(type === 'document' ? { pdfUrl: '', pdfFileName: '' } : {}),
      ...(type === 'quiz'
        ? {
            quizQuestions: [
              {
                questionText: '',
                options: ['', ''],
                correctOptionIndex: 0,
                explanation: '',
              },
            ],
          }
        : {}),
    };
    setCurriculumBlocks((prev) => [...prev, newBlock]);
  };

  const addQuestionToBlock = (blockIdx: number) => {
    setCurriculumBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          quizQuestions: [
            ...(b.quizQuestions || []),
            { questionText: '', options: ['', ''], correctOptionIndex: 0, explanation: '' },
          ],
        };
      })
    );
  };

  const removeQuestionFromBlock = (blockIdx: number, qIdx: number) => {
    setCurriculumBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          quizQuestions: (b.quizQuestions || []).filter((_, j) => j !== qIdx),
        };
      })
    );
  };

  const updateQuestionInBlock = (
    blockIdx: number,
    qIdx: number,
    patch: any
  ) => {
    setCurriculumBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          quizQuestions: (b.quizQuestions || []).map((q, j) => (j === qIdx ? { ...q, ...patch } : q)),
        };
      })
    );
  };

  const addOptionToQuestion = (blockIdx: number, qIdx: number) => {
    setCurriculumBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          quizQuestions: (b.quizQuestions || []).map((q, j) =>
            j === qIdx ? { ...q, options: [...q.options, ''] } : q
          ),
        };
      })
    );
  };

  const removeOptionFromQuestion = (blockIdx: number, qIdx: number, optIdx: number) => {
    setCurriculumBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          quizQuestions: (b.quizQuestions || []).map((q, j) => {
            if (j !== qIdx) return q;
            const newOpts = q.options.filter((_, k) => k !== optIdx);
            return {
              ...q,
              options: newOpts,
              correctOptionIndex: Math.min(q.correctOptionIndex, Math.max(0, newOpts.length - 1)),
            };
          }),
        };
      })
    );
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    setCurriculumBlocks((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next.map((b, i) => ({ ...b, order: i }));
    });
  };

  const removeBlock = (index: number) => {
    setCurriculumBlocks((prev) =>
      prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i }))
    );
  };

  const updateBlock = (index: number, patch: Partial<CurriculumBlock>) => {
    setCurriculumBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  };

  const importExistingIntoCurriculum = () => {
    const blocks: CurriculumBlock[] = [];
    if (form.description?.trim()) {
      blocks.push({
        type: 'description',
        title: 'Lesson Introduction & Overview',
        description: form.description.trim(),
        order: blocks.length,
      });
    }
    videos.forEach((v, idx) => {
      blocks.push({
        type: 'video',
        title: v.title || `Video Part ${idx + 1}`,
        url: v.url,
        description: v.description || '',
        order: blocks.length,
      });
    });
    resources.forEach((r, idx) => {
      blocks.push({
        type: 'document',
        title: r.title || `Study Notes ${idx + 1}`,
        pdfUrl: r.path,
        pdfFileName: r.title,
        size: r.size,
        order: blocks.length,
      });
    });
    setCurriculumBlocks(blocks);
  };

  const changeQuestion = (i: number, patch: Partial<Question>) =>
    setQuiz((prev) => prev.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const visible = lessons.filter(
    (l) =>
      (!filterSubject || l.subject === filterSubject) &&
      (!filterStatus || l.status === filterStatus) &&
      [l.title, l.topic, l.subject].join(' ').toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="learning-area space-y-8">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Admin Workspace
            </span>
            <span className="text-xs text-slate-400 font-medium">Courses & Lesson Studio</span>
          </div>
          <h2 className="text-2xl font-black text-white">Course & Lesson Manager</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Create structured lessons, stream protected YouTube videos without external branding, and attach watermarked notes.
          </p>
        </div>

        {editing ? (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Cancel Editing
          </button>
        ) : (
          <button
            type="button"
            onClick={() => document.getElementById('lesson-editor')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 hover:brightness-110 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Lesson</span>
          </button>
        )}
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-bold text-white text-lg">Student View Preview</h3>
            <button
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
              onClick={() => setPreview(null)}
            >
              Close Preview
            </button>
          </div>
          <LessonView key={preview._id} lesson={preview} preview onProgress={() => {}} />
        </div>
      )}

      {/* Main Studio Editor Card */}
      <form id="lesson-editor" onSubmit={save} className="rounded-2xl border border-white/10 bg-[#161831]/80 backdrop-blur-md shadow-2xl overflow-hidden">
        {/* Editor Title & Tab Selector */}
        <div className="border-b border-white/10 bg-slate-900/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              {editing ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{editing ? 'Edit Lesson' : 'Add New Lesson'}</h3>
              <p className="text-xs text-slate-400">Fill in the details below to publish to students</p>
            </div>
          </div>

          {/* Clean Step / Section Tabs - Only Overview and Curriculum Flow */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-white/5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>1. Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'curriculum'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
              <span>2. Curriculum Flow</span>
              {curriculumBlocks.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-400/20 text-indigo-300 text-[11px] flex items-center justify-center font-bold">
                  {curriculumBlocks.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <fieldset disabled={busy} className="p-6 space-y-6">
          {/* TAB 1: BASIC LESSON INFO & OVERVIEW */}
          {activeTab === 'info' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Row 1: Subject, Topic, Medium */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <select
                    className={control}
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value, topic: '' }))}
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Topic Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    list="lesson-topics"
                    className={control}
                    value={form.topic}
                    placeholder="e.g. Circular Motion, Organic Chemistry"
                    onChange={(e) => {
                      const value = e.target.value;
                      const match = topicChoices.find((l) => l.subject === form.subject && l.topic === value);
                      setForm((f) => ({
                        ...f,
                        topic: value,
                        ...(match ? { topicOrder: match.topicOrder } : {}),
                      }));
                    }}
                  />
                  <datalist id="lesson-topics">
                    {[...new Set(topicChoices.filter((l) => l.subject === form.subject).map((l) => l.topic))].map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Language Medium
                  </label>
                  <select
                    className={control}
                    value={form.medium}
                    onChange={(e) => setForm((f) => ({ ...f, medium: e.target.value }))}
                  >
                    {['English', 'Sinhala', 'Tamil'].map((s) => (
                      <option key={s} value={s}>
                        {s} Medium
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Lesson Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Lesson Title <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. Centripetal Force & Vertical Circles — Theory & Derivations"
                  className={control}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Row 3: Dedicated Separate Lesson Description Section */}
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Lesson Description & Study Guidance</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Visible to all students in Lesson Overview</span>
                </div>
                <textarea
                  required
                  rows={4}
                  className={`${control} font-normal leading-relaxed`}
                  placeholder="Write a clear overview of this lesson: key concepts covered, formulas, syllabus references, and study tips for A/L students..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Row 4: Estimated Study Time & Status */}
              <div className="grid sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Estimated Study Time (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    required
                    className={control}
                    value={form.estimatedMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: Number(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Publishing Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: 'published' }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        form.status === 'published'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      ✓ Published (Live)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: 'draft' }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        form.status === 'draft'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      Draft (Hidden)
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 5: Course Pricing & Bank Transfer Details */}
              <div className="rounded-xl border border-indigo-500/30 bg-slate-900/60 p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Course Pricing & Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, isFree: true, price: 0 }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        form.isFree || form.price === 0
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      ✓ Free Course (No Fee)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, isFree: false, price: f.price || 1500 }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        !form.isFree && form.price > 0
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      Paid Course (Bank Slip)
                    </button>
                  </div>
                </div>

                {!form.isFree && form.price > 0 && (
                  <div className="grid sm:grid-cols-3 gap-4 pt-3 border-t border-white/10 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1.5">
                        Course Fee (LKR) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs.</span>
                        <input
                          type="number"
                          min={1}
                          required={!form.isFree}
                          placeholder="e.g. 2500"
                          className={`${control} pl-10 font-bold`}
                          value={form.price}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setForm((f) => ({ ...f, price: val, isFree: val === 0 }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Bank Account & Transfer Instructions
                      </label>
                      <textarea
                        rows={3}
                        className={`${control} text-xs font-mono leading-relaxed`}
                        placeholder="Bank: Commercial Bank | Account: 123456789 | Name: Mind Maze | Branch: Colombo"
                        value={form.bankDetails}
                        onChange={(e) => setForm((f) => ({ ...f, bankDetails: e.target.value }))}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Students must transfer the fee and upload their bank slip before being enrolled.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsed Advanced Ordering & Stream Settings */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>Advanced Settings (Streams, Ordering & Syllabus version)</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Target Stream</label>
                      <select
                        className={control}
                        value={form.stream}
                        onChange={(e) => setForm((f) => ({ ...f, stream: e.target.value }))}
                      >
                        {['Both', 'Maths', 'Bio', 'Physical Science', 'Biological Science', 'Non-stream'].map((s) => (
                          <option key={s} value={s}>
                            {s === 'Both' ? 'Maths and Bio' : s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Syllabus</label>
                      <select
                        className={control}
                        value={form.syllabus}
                        onChange={(e) => setForm((f) => ({ ...f, syllabus: e.target.value }))}
                      >
                        <option value="current">Current syllabus</option>
                        <option value="old">Old syllabus</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Topic Order</label>
                        <input
                          type="number"
                          min={0}
                          className={control}
                          value={form.topicOrder}
                          onChange={(e) => setForm((f) => ({ ...f, topicOrder: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Lesson Order</label>
                        <input
                          type="number"
                          min={0}
                          className={control}
                          value={form.lessonOrder}
                          onChange={(e) => setForm((f) => ({ ...f, lessonOrder: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    {/* Related Past Papers section */}
                    <div className="sm:col-span-3 border-t border-white/5 pt-3 space-y-2">
                      <label className="block text-xs font-medium text-slate-400">
                        Link Related Past Papers ({related.length} selected)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="search"
                          placeholder="Search past papers..."
                          className={control}
                          value={paperSearch}
                          onChange={(e) => setPaperSearch(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedPapersOnly(!selectedPapersOnly)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            selectedPapersOnly
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          {selectedPapersOnly ? 'Selected only' : 'All papers'}
                        </button>
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl bg-slate-900 p-2 border border-slate-800">
                        {papers.map((p: any) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={related.includes(p.id)}
                              onChange={(e) =>
                                setRelated((prev) =>
                                  e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                                )
                              }
                            />
                            <span>{p.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('curriculum')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  <span>Continue to Curriculum Flow</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COURSERA-STYLE CURRICULUM FLOW (LIVE CLASSES, VIDEOS, DOCS, DESCRIPTIONS) */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header / Intro banner */}
              <div className="rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-4 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-bold text-white text-sm">
                      Coursera-Style Curriculum Flow ({curriculumBlocks.length} Items)
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Sequential Timeline
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Sequence your course components downwards in any order students will follow:
                    mix <strong>Live Classes</strong>, <strong>Video Lessons / Recordings</strong>, <strong>Document Notes</strong>, and <strong>Reading Guides</strong>.
                  </p>
                </div>

                {curriculumBlocks.length === 0 && (videos.length > 0 || resources.length > 0 || form.description) && (
                  <button
                    type="button"
                    onClick={importExistingIntoCurriculum}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Import Existing Items to Timeline</span>
                  </button>
                )}
              </div>

              {/* Quick Add Toolbar */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Step:
                </span>
                <button
                  type="button"
                  onClick={() => addCurriculumBlock('live_class')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>+ Live Class (Zoom / Meet)</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCurriculumBlock('video')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+ Video / YouTube Lesson</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCurriculumBlock('document')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ PDF Document / Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCurriculumBlock('description')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Guide / Description Section</span>
                </button>

                <button
                  type="button"
                  onClick={() => addCurriculumBlock('quiz')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Quiz & MCQs</span>
                </button>
              </div>

              {/* Empty State */}
              {curriculumBlocks.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner">
                    <Layers className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <p className="text-sm font-bold text-white">Curriculum Timeline is Empty</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Build a flexible sequence like Coursera & Simplilearn.
                      Add Live Classes, YouTube lectures, PDF documents, guides, and quizzes in any order downwards!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('live_class')}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                    >
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> Add Live Class
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('video')}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                    >
                      <Video className="w-3.5 h-3.5" /> Add Video
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('document')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <FileText className="w-3.5 h-3.5" /> Add Document
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('description')}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Add Description
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('quiz')}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Add Quiz / MCQs
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {curriculumBlocks.map((block, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === curriculumBlocks.length - 1;

                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border p-4.5 space-y-3.5 transition-all shadow-md ${
                          block.type === 'live_class'
                            ? 'bg-slate-900/90 border-rose-500/30 ring-1 ring-rose-500/10'
                            : block.type === 'video'
                            ? 'bg-slate-900/90 border-cyan-500/30'
                            : block.type === 'document'
                            ? 'bg-slate-900/90 border-emerald-500/30'
                            : block.type === 'quiz'
                            ? 'bg-slate-900/90 border-amber-500/30 ring-1 ring-amber-500/10'
                            : 'bg-slate-900/90 border-indigo-500/30'
                        }`}
                      >
                        {/* Top Block Header: Sequence #, Type Pill, Reorder and Delete Buttons */}
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>

                            {block.type === 'live_class' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                                Live Class / Online Session
                              </span>
                            )}
                            {block.type === 'video' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                <Video className="w-3 h-3 text-cyan-400" />
                                Video Lecture
                              </span>
                            )}
                            {block.type === 'document' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <FileText className="w-3 h-3 text-emerald-400" />
                                PDF Document / Handout
                              </span>
                            )}
                            {block.type === 'description' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                <BookOpen className="w-3 h-3 text-indigo-400" />
                                Reading Guide / Description
                              </span>
                            )}
                            {block.type === 'quiz' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                Quiz / MCQs ({block.quizQuestions?.length || 0} Questions)
                              </span>
                            )}
                          </div>

                          {/* Move Up / Down & Remove */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => moveBlock(idx, 'up')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-transparent disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => moveBlock(idx, 'down')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-transparent disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(idx)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer ml-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Form fields based on block type */}
                        {block.type === 'live_class' && (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Live Class Title <span className="text-rose-400">*</span>
                                </label>
                                <input
                                  required
                                  className={control}
                                  placeholder="e.g. Live Discussion & Revision Session"
                                  value={block.title || ''}
                                  onChange={(e) => updateBlock(idx, { title: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Platform / Meeting App
                                </label>
                                <select
                                  className={control}
                                  value={block.meetingPlatform || 'Zoom'}
                                  onChange={(e) => updateBlock(idx, { meetingPlatform: e.target.value })}
                                >
                                  <option value="Zoom">Zoom</option>
                                  <option value="Google Meet">Google Meet</option>
                                  <option value="Microsoft Teams">Microsoft Teams</option>
                                  <option value="YouTube Live">YouTube Live</option>
                                  <option value="Other">Other Platform</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Live Meeting URL (Link) <span className="text-rose-400">*</span>
                                </label>
                                <input
                                  required
                                  type="url"
                                  className={control}
                                  placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                                  value={block.liveLink || ''}
                                  onChange={(e) => updateBlock(idx, { liveLink: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Scheduled Date & Time (Optional)
                                </label>
                                <input
                                  className={control}
                                  placeholder="e.g. Friday 7:30 PM (or YYYY-MM-DD HH:mm)"
                                  value={block.scheduledTime || ''}
                                  onChange={(e) => updateBlock(idx, { scheduledTime: e.target.value })}
                                />
                              </div>
                            </div>

                            {/* Completed toggle & Recording URL */}
                            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 space-y-2.5">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={Boolean(block.isCompleted)}
                                  onChange={(e) => updateBlock(idx, { isCompleted: e.target.checked })}
                                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                                />
                                <span>Session has completed (Show recording to students)</span>
                              </label>

                              <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">
                                  Recording YouTube URL (For students who missed the live session)
                                </label>
                                <input
                                  className={control}
                                  placeholder="https://www.youtube.com/watch?v=... (Protected playback)"
                                  value={block.recordingUrl || ''}
                                  onChange={(e) => updateBlock(idx, { recordingUrl: e.target.value })}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Instructions / Notes for Students
                              </label>
                              <textarea
                                rows={2}
                                className={control}
                                placeholder="e.g. Have your tutorial sheet ready. Mic must be muted upon entry."
                                value={block.description || ''}
                                onChange={(e) => updateBlock(idx, { description: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {block.type === 'video' && (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Video Title <span className="text-cyan-400">*</span>
                                </label>
                                <input
                                  required
                                  className={control}
                                  placeholder="e.g. Part 1: Core Principles"
                                  value={block.title || ''}
                                  onChange={(e) => updateBlock(idx, { title: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  YouTube URL <span className="text-cyan-400">*</span>
                                </label>
                                <input
                                  required
                                  className={control}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  value={block.url || ''}
                                  onChange={(e) => updateBlock(idx, { url: e.target.value })}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Video Notes / Description (Optional)
                              </label>
                              <textarea
                                rows={2}
                                className={control}
                                placeholder="Key formulas, timestamps, or summary points..."
                                value={block.description || ''}
                                onChange={(e) => updateBlock(idx, { description: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {block.type === 'document' && (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Document Title <span className="text-emerald-400">*</span>
                                </label>
                                <input
                                  required
                                  className={control}
                                  placeholder="e.g. Lecture Notes & Worked Examples"
                                  value={block.title || ''}
                                  onChange={(e) => updateBlock(idx, { title: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">
                                  Attach PDF Document / Slide
                                </label>
                                <div className="space-y-2">
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="block w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600/30 file:text-emerald-300 hover:file:bg-emerald-600/40 file:cursor-pointer cursor-pointer border border-slate-700 rounded-xl bg-slate-900/80 p-1"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        updateBlock(idx, {
                                          pendingFile: file,
                                          pdfFileName: file.name,
                                          title:
                                            block.title && block.title !== 'Lecture Notes (PDF)'
                                              ? block.title
                                              : file.name.replace(/\.[^/.]+$/, ''),
                                          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                                        });
                                      }
                                    }}
                                  />
                                  {block.pendingFile && (
                                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">Ready to upload: {block.pendingFile.name} ({block.size})</span>
                                    </div>
                                  )}
                                  {!block.pendingFile && block.pdfFileName && (
                                    <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span className="truncate">Saved PDF: {block.pdfFileName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Optional: Pick from existing library if course already has files */}
                            {resources.length > 0 && (
                              <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">
                                  Or Link from Course PDF Library:
                                </label>
                                <select
                                  className={control}
                                  value={block.pdfUrl || ''}
                                  onChange={(e) => {
                                    const chosen = resources.find((r) => r.path === e.target.value);
                                    updateBlock(idx, {
                                      pdfUrl: e.target.value,
                                      pdfFileName: chosen ? chosen.title : block.pdfFileName,
                                      size: chosen ? chosen.size : block.size,
                                    });
                                  }}
                                >
                                  <option value="">-- Choose from existing course PDFs --</option>
                                  {resources.map((r) => (
                                    <option key={r.id} value={r.path}>
                                      {r.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Document Notes / Instructions (Optional)
                              </label>
                              <textarea
                                rows={2}
                                className={control}
                                placeholder="e.g. Please read pages 1-12 before attending the live session..."
                                value={block.description || ''}
                                onChange={(e) => updateBlock(idx, { description: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {block.type === 'description' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Section Heading / Title <span className="text-indigo-400">*</span>
                              </label>
                              <input
                                required
                                className={control}
                                placeholder="e.g. Module Overview & Essential Background"
                                value={block.title || ''}
                                onChange={(e) => updateBlock(idx, { title: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Content / Study Guidance (Text) <span className="text-indigo-400">*</span>
                              </label>
                              <textarea
                                required
                                rows={4}
                                className={control}
                                placeholder="Write comprehensive guidelines, derivation steps, formula references, or instructions for students..."
                                value={block.description || ''}
                                onChange={(e) => updateBlock(idx, { description: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {block.type === 'quiz' && (
                          <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Quiz Title <span className="text-amber-600 dark:text-amber-400">*</span>
                                </label>
                                <input
                                  required
                                  className={control}
                                  placeholder="e.g. Practice Quiz & Knowledge Check"
                                  value={block.title || ''}
                                  onChange={(e) => updateBlock(idx, { title: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  Quiz Instructions / Pass Guidance (Optional)
                                </label>
                                <input
                                  className={control}
                                  placeholder="e.g. Answer all questions to check your mastery of this topic."
                                  value={block.description || ''}
                                  onChange={(e) => updateBlock(idx, { description: e.target.value })}
                                />
                              </div>
                            </div>

                            {/* Question Cards List */}
                            <div className="space-y-3 pt-1">
                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span>Questions ({block.quizQuestions?.length || 0})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addQuestionToBlock(idx)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Question</span>
                                </button>
                              </div>

                              {(!block.quizQuestions || block.quizQuestions.length === 0) ? (
                                <div className="text-center py-6 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-300">
                                  No questions added yet. Click &quot;Add Question&quot; to create MCQs for this quiz block.
                                </div>
                              ) : (
                                block.quizQuestions.map((q, qIdx) => (
                                  <div
                                    key={qIdx}
                                    className="p-4 rounded-xl bg-slate-100/90 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 space-y-3 shadow-sm"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[11px] font-black border border-amber-500/30">
                                          {qIdx + 1}
                                        </span>
                                        <span>Question {qIdx + 1}</span>
                                      </span>

                                      {block.quizQuestions && block.quizQuestions.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeQuestionFromBlock(idx, qIdx)}
                                          className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>Remove</span>
                                        </button>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Question Text <span className="text-amber-600 dark:text-amber-400">*</span>
                                      </label>
                                      <textarea
                                        required
                                        rows={2}
                                        className={control}
                                        placeholder="e.g. Which of the following is true regarding..."
                                        value={q.questionText}
                                        onChange={(e) =>
                                          updateQuestionInBlock(idx, qIdx, { questionText: e.target.value })
                                        }
                                      />
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">
                                          Options ({q.options.length})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => addOptionToQuestion(idx, qIdx)}
                                          disabled={q.options.length >= 6}
                                          className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                        >
                                          <Plus className="w-3 h-3" /> Add Option
                                        </button>
                                      </div>

                                      <div className="grid sm:grid-cols-2 gap-2">
                                        {q.options.map((opt, optIdx) => (
                                          <div key={optIdx} className="relative">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 w-5 text-center">
                                                {String.fromCharCode(65 + optIdx)}.
                                              </span>
                                              <input
                                                required
                                                className={control}
                                                placeholder={`Option ${optIdx + 1}`}
                                                value={opt}
                                                onChange={(e) => {
                                                  const newOpts = [...q.options];
                                                  newOpts[optIdx] = e.target.value;
                                                  updateQuestionInBlock(idx, qIdx, { options: newOpts });
                                                }}
                                              />
                                              {q.options.length > 2 && (
                                                <button
                                                  type="button"
                                                  onClick={() => removeOptionFromQuestion(idx, qIdx, optIdx)}
                                                  className="p-1 rounded text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition cursor-pointer"
                                                  title="Delete option"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Correct Option & Explanation */}
                                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                          Correct Answer <span className="text-emerald-700 dark:text-emerald-400">*</span>
                                        </label>
                                        <select
                                          className={control}
                                          value={q.correctOptionIndex}
                                          onChange={(e) =>
                                            updateQuestionInBlock(idx, qIdx, {
                                              correctOptionIndex: Number(e.target.value),
                                            })
                                          }
                                        >
                                          {q.options.map((opt, optIdx) => (
                                            <option key={optIdx} value={optIdx}>
                                              Option {String.fromCharCode(65 + optIdx)} {opt ? `(${opt.slice(0, 30)})` : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 mb-1">
                                          Explanation (Optional feedback)
                                        </label>
                                        <input
                                          className={control}
                                          placeholder="Explain why this option is correct..."
                                          value={q.explanation || ''}
                                          onChange={(e) =>
                                            updateQuestionInBlock(idx, qIdx, { explanation: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Quick Add at bottom */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('live_class')}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> + Live Class
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('video')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" /> + Video
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('document')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> + Document
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('description')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> + Description
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('quiz')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> + Quiz & MCQs
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  ← Back to Overview
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  <span>{editing ? 'Update & Publish Lesson' : 'Publish Lesson'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PERSISTENT BOTTOM ACTION BAR */}
          <div className="border-t border-white/10 pt-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Status:</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  form.status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {form.status === 'published' ? '● Ready to Publish' : '○ Save as Draft'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  setForm((f) => ({ ...f, status: 'draft' }));
                  setTimeout(() => {
                    const submitBtn = document.getElementById('save-lesson-btn');
                    submitBtn?.click();
                  }, 50);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Save as Draft
              </button>

              <button
                id="save-lesson-btn"
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Lesson...</span>
                  </>
                ) : (
                  <>
                    <span>{editing ? 'Update & Publish Lesson' : 'Publish Lesson'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </fieldset>
      </form>

      {/* LESSON DIRECTORY TABLE / LIST */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="font-bold text-white text-lg">Existing Lessons ({lessonsPage.pagination.total})</h3>
            <p className="text-xs text-slate-400">Browse, edit or preview previously created lessons.</p>
          </div>

          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              className={`${control} pl-9`}
              placeholder="Search by title, topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={control}
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className={control}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="published">Published Only</option>
            <option value="draft">Drafts Only</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading lessons...</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No matching lessons found. Create a lesson above.
          </div>
        ) : (
          <div className="grid gap-3">
            {visible.map((l) => (
              <div
                key={l._id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 dark:bg-slate-950/70 dark:border-slate-800/80 transition flex items-center justify-between flex-wrap gap-4"
                style={{
                  backgroundColor: 'var(--lesson-card-bg, rgba(2, 6, 23, 0.7))',
                  borderColor: 'var(--lesson-border, rgba(51, 65, 85, 0.8))',
                }}
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-cyan-500 dark:text-cyan-300">{l.subject}</span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{l.topic}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      {l.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        l.isFree || !l.price
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {l.isFree || !l.price ? 'FREE' : `Rs. ${(l.price || 0).toLocaleString()}`}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{l.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{l.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 font-medium">
                    <span>🎬 {l.videoCount || 0} Videos</span>
                    <span>•</span>
                    <span>📄 {l.resourceCount || 0} PDFs</span>
                    <span>•</span>
                    <span>⏱️ {l.estimatedMinutes || 15} mins</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => edit(l)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(l);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:text-white text-xs font-bold border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(l)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-xs font-bold border border-rose-200 dark:border-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination {...lessonsPage.pagination} label="Lessons" />
      </div>
    </div>
  );
};
