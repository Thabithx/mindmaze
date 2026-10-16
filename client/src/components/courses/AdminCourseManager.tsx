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
  ArrowLeft,
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
  Image as ImageIcon,
  Upload,
  AlertCircle,
  X,
  Award,
  FileSpreadsheet,
} from 'lucide-react';

type Question = {
  questionText: string;
  questionType?: 'mcq' | 'text';
  imageUrl?: string;
  imagePublicId?: string;
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

const initialMainCourseForm = () => ({
  title: '',
  description: '',
  subject: 'Physics',
  stream: 'Both',
  medium: 'English',
  monthlyFee: 3500,
  status: 'published' as 'draft' | 'published',
  bankDetails: DEFAULT_BANK_DETAILS,
});

const initialMonthlyClassForm = (parent?: Lesson | null) => ({
  title: '',
  targetMonth: '',
  description: '',
  subject: parent?.subject || 'Physics',
  stream: parent?.stream || 'Both',
  medium: parent?.medium || 'English',
  status: 'published' as 'draft' | 'published',
  price: parent?.monthlyFee || parent?.price || 3500,
  validityPeriod: '1_month' as '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime',
  validityMonths: 1,
  parentCourseId: parent?._id || '',
  enforceSequentialProgression: parent?.enforceSequentialProgression ?? true,
  bankDetails: parent?.bankDetails || DEFAULT_BANK_DETAILS,
  estimatedMinutes: 60,
  topic: '',
});

export const AdminCourseManager: React.FC = () => {
  // Navigation level: Level 1 (Main Courses) vs Level 2 (Monthly classes inside a Main Course)
  const [selectedMainCourse, setSelectedMainCourse] = useState<Lesson | null>(null);

  // Level 1: Main Course creation/edit state
  const [showMainCourseModal, setShowMainCourseModal] = useState(false);
  const [editingMainCourse, setEditingMainCourse] = useState<Lesson | null>(null);
  const [mainForm, setMainForm] = useState(initialMainCourseForm());
  const [mainCoverFile, setMainCoverFile] = useState<File | null>(null);
  const [mainCoverPreview, setMainCoverPreview] = useState<string>('');
  const [removeMainCover, setRemoveMainCover] = useState<boolean>(false);

  // Level 2: Monthly Class studio & curriculum editor state
  const [showMonthlyStudio, setShowMonthlyStudio] = useState(false);
  const [editingMonthlyClass, setEditingMonthlyClass] = useState<Lesson | null>(null);
  const [monthlyForm, setMonthlyForm] = useState(initialMonthlyClassForm());
  const [monthlyCoverFile, setMonthlyCoverFile] = useState<File | null>(null);
  const [monthlyCoverPreview, setMonthlyCoverPreview] = useState<string>('');
  const [removeMonthlyCover, setRemoveMonthlyCover] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'info' | 'curriculum' | 'live_classes'>('info');
  const [curriculumBlocks, setCurriculumBlocks] = useState<CurriculumBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Lesson | null>(null);

  // Filters & listings
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const adminFilters = selectedMainCourse
    ? { parentCourseId: selectedMainCourse._id, q: search, status: filterStatus }
    : { mainOnly: 'true', q: search, subject: filterSubject, status: filterStatus };

  const lessonsPage = usePagedResource<Lesson>(
    '/courses/admin/list',
    'courses',
    adminFilters,
    'mindmaze_courses_updated'
  );

  const lessons = lessonsPage.items;
  const loading = lessonsPage.loading;
  const load = lessonsPage.reload;

  // Clear messages on view changes
  useEffect(() => {
    setMessage('');
    setError('');
  }, [selectedMainCourse]);

  // LEVEL 1: Open Main Course Creator / Editor
  const openCreateMainCourse = () => {
    setEditingMainCourse(null);
    setMainForm(initialMainCourseForm());
    setMainCoverFile(null);
    setMainCoverPreview('');
    setRemoveMainCover(false);
    setShowMainCourseModal(true);
    setError('');
    setMessage('');
  };

  const openEditMainCourse = (course: Lesson) => {
    setEditingMainCourse(course);
    setMainForm({
      title: course.title,
      description: course.description,
      subject: course.subject,
      stream: course.stream || 'Both',
      medium: course.medium || 'English',
      monthlyFee: course.monthlyFee || course.price || 3500,
      status: (course.status as 'draft' | 'published') || 'published',
      bankDetails: course.bankDetails || DEFAULT_BANK_DETAILS,
    });
    setMainCoverFile(null);
    setMainCoverPreview(course.thumbnailUrl || '');
    setRemoveMainCover(false);
    setShowMainCourseModal(true);
    setError('');
    setMessage('');
  };

  // Save Main Course
  const saveMainCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const body = new FormData();
      body.append('title', mainForm.title.trim());
      body.append('subject', mainForm.subject);
      body.append('stream', mainForm.stream);
      body.append('medium', mainForm.medium);
      body.append('description', mainForm.description.trim());
      body.append('monthlyFee', String(mainForm.monthlyFee));
      body.append('price', String(mainForm.monthlyFee));
      body.append('isMonthlyProgram', 'true');
      body.append('billingType', 'monthly');
      body.append('courseType', 'monthly');
      body.append('parentCourseId', '');
      body.append('status', mainForm.status);
      body.append('bankDetails', mainForm.bankDetails);
      body.append('topic', mainForm.title.trim());

      if (mainCoverFile) {
        body.append('thumbnail', mainCoverFile);
      } else if (removeMainCover) {
        body.append('removeThumbnail', 'true');
      }

      if (editingMainCourse) {
        body.append('revision', String(editingMainCourse.revision));
        await api.updateCourse(editingMainCourse._id, body);
        setMessage(`Main course "${mainForm.title}" updated successfully.`);
      } else {
        await api.createCourse(body);
        setMessage(`Main course "${mainForm.title}" created successfully.`);
      }

      setShowMainCourseModal(false);
      load();
      window.dispatchEvent(new Event('mindmaze_courses_updated'));
    } catch (err: any) {
      setError(err.message || 'Could not save main course.');
    } finally {
      setBusy(false);
    }
  };

  // Delete Main Course (Blocked if subCourseCount > 0!)
  const removeMainCourse = async (course: Lesson) => {
    const subCount = course.subCourseCount || 0;
    if (subCount > 0) {
      alert(
        `Cannot delete "${course.title}": It contains ${subCount} monthly class(es). Please delete all monthly classes inside this main course first.`
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the main course "${course.title}"?`)) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.deleteCourse(course._id);
      load();
      setMessage(`Main course "${course.title}" deleted.`);
      window.dispatchEvent(new Event('mindmaze_courses_updated'));
    } catch (err: any) {
      setError(err.message || 'Could not delete main course.');
    } finally {
      setBusy(false);
    }
  };

  // LEVEL 2: Open Monthly Class Creator / Editor
  const openCreateMonthlyClass = () => {
    if (!selectedMainCourse) return;
    setEditingMonthlyClass(null);
    setMonthlyForm(initialMonthlyClassForm(selectedMainCourse));
    setMonthlyCoverFile(null);
    setMonthlyCoverPreview('');
    setRemoveMonthlyCover(false);
    setCurriculumBlocks([]);
    setActiveTab('info');
    setShowMonthlyStudio(true);
    setError('');
    setMessage('');
  };

  const openEditMonthlyClass = (course: Lesson) => {
    setEditingMonthlyClass(course);
    setMonthlyForm({
      title: course.title,
      targetMonth: course.targetMonth || '',
      description: course.description,
      subject: course.subject,
      stream: course.stream || selectedMainCourse?.stream || 'Both',
      medium: course.medium || selectedMainCourse?.medium || 'English',
      status: (course.status as 'draft' | 'published') || 'published',
      price: course.price ?? selectedMainCourse?.monthlyFee ?? 3500,
      validityPeriod: course.validityPeriod || '1_month',
      validityMonths: course.validityMonths || 1,
      parentCourseId: selectedMainCourse?._id || '',
      enforceSequentialProgression: course.enforceSequentialProgression ?? true,
      bankDetails: course.bankDetails || selectedMainCourse?.bankDetails || DEFAULT_BANK_DETAILS,
      estimatedMinutes: course.estimatedMinutes || 60,
      topic: course.topic || '',
    });
    setMonthlyCoverFile(null);
    setMonthlyCoverPreview(course.thumbnailUrl || '');
    setRemoveMonthlyCover(false);

    // Populate curriculum blocks
    let blocks: CurriculumBlock[] = [];
    if (course.curriculumBlocks && course.curriculumBlocks.length > 0) {
      blocks = course.curriculumBlocks.map((b, i) => ({
        ...b,
        order: b.order ?? i,
      }));
    } else {
      if (course.description?.trim()) {
        blocks.push({
          type: 'description',
          title: 'Class Overview & Objectives',
          description: course.description.trim(),
          order: blocks.length,
        });
      }
      (course.videos || []).forEach((v, idx) => {
        blocks.push({
          type: 'video',
          title: v.title || `Video Lecture Part ${idx + 1}`,
          url: v.url || '',
          description: v.description || '',
          order: blocks.length,
        });
      });
      (course.resources || []).forEach((r, idx) => {
        blocks.push({
          type: 'document',
          title: r.title || `Study Notes ${idx + 1}`,
          pdfUrl: r.path,
          pdfFileName: r.title,
          size: r.size,
          order: blocks.length,
        });
      });
      if (course.quiz && course.quiz.length > 0) {
        blocks.push({
          type: 'quiz',
          title: 'Practice Quiz & Knowledge Check',
          quizQuestions: course.quiz.map((q) => ({
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
    setActiveTab('info');
    setShowMonthlyStudio(true);
    setError('');
    setMessage('');
  };

  // Save Monthly Class
  const saveMonthlyClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !selectedMainCourse) return;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const body = new FormData();
      body.append('title', monthlyForm.title.trim());
      body.append('targetMonth', monthlyForm.targetMonth.trim());
      body.append('subject', selectedMainCourse.subject);
      body.append('stream', selectedMainCourse.stream);
      body.append('medium', selectedMainCourse.medium);
      body.append('description', monthlyForm.description.trim());
      body.append('price', String(monthlyForm.price));
      body.append('monthlyFee', String(monthlyForm.price));
      body.append('billingType', 'monthly');
      body.append('courseType', 'monthly');
      body.append('isMonthlyProgram', 'false');
      body.append('parentCourseId', selectedMainCourse._id);
      body.append('validityPeriod', monthlyForm.validityPeriod);
      body.append('validityMonths', String(monthlyForm.validityPeriod === '1_month' ? 1 : monthlyForm.validityPeriod === '3_months' ? 3 : monthlyForm.validityPeriod === '6_months' ? 6 : monthlyForm.validityPeriod === '1_year' ? 12 : 0));
      body.append('status', monthlyForm.status);
      body.append('bankDetails', monthlyForm.bankDetails);
      body.append('topic', monthlyForm.targetMonth.trim() || selectedMainCourse.title);
      body.append('estimatedMinutes', String(monthlyForm.estimatedMinutes));
      body.append('enforceSequentialProgression', String(monthlyForm.enforceSequentialProgression));

      if (monthlyCoverFile) {
        body.append('thumbnail', monthlyCoverFile);
      } else if (removeMonthlyCover) {
        body.append('removeThumbnail', 'true');
      }

      // Collect quiz questions
      const allQuizQuestions = curriculumBlocks
        .filter((b) => b.type === 'quiz')
        .flatMap((b) => b.quizQuestions || []);
      body.append('quizJson', JSON.stringify(allQuizQuestions));

      // Collect video lectures
      const allVideos = curriculumBlocks
        .filter((b) => b.type === 'video')
        .map((b) => ({ title: b.title || 'Video', url: b.url || '', description: b.description || '' }));
      body.append('videosJson', JSON.stringify(allVideos));

      // Append files uploaded directly on document, video companion, or paper blocks
      curriculumBlocks.forEach((b) => {
        if (b.pendingFile) {
          body.append('pdfFiles', b.pendingFile);
        }
        if (b.pendingResultSheet) {
          body.append('resultSheetFiles', b.pendingResultSheet);
        }
      });

      // Clean curriculum blocks for JSON transmission
      const cleanBlocks = curriculumBlocks.map(({ pendingFile, pendingResultSheet, ...b }) => ({
        ...b,
        hasNewUpload: Boolean(pendingFile),
        hasNewResultSheet: Boolean(pendingResultSheet),
        size: typeof b.size === 'number' ? b.size : (pendingFile ? pendingFile.size : 0),
      }));
      body.append('curriculumBlocksJson', JSON.stringify(cleanBlocks));

      if (editingMonthlyClass) {
        body.append('revision', String(editingMonthlyClass.revision));
        await api.updateCourse(editingMonthlyClass._id, body);
        setMessage(`Monthly class "${monthlyForm.title}" updated successfully.`);
      } else {
        await api.createCourse(body);
        setMessage(`Monthly class "${monthlyForm.title}" published under ${selectedMainCourse.title}.`);
      }

      setShowMonthlyStudio(false);
      load();
      window.dispatchEvent(new Event('mindmaze_courses_updated'));
    } catch (err: any) {
      setError(err.message || 'Could not save monthly class.');
    } finally {
      setBusy(false);
    }
  };

  // Delete Monthly Class (Always allowed!)
  const removeMonthlyClass = async (course: Lesson) => {
    if (!window.confirm(`Are you sure you want to delete monthly class "${course.title}"?`)) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.deleteCourse(course._id);
      load();
      setMessage(`Monthly class "${course.title}" deleted.`);
      window.dispatchEvent(new Event('mindmaze_courses_updated'));
    } catch (err: any) {
      setError(err.message || 'Could not delete monthly class.');
    } finally {
      setBusy(false);
    }
  };

  // Curriculum block helpers
  const addCurriculumBlock = (type: CurriculumBlock['type']) => {
    const newBlock: CurriculumBlock = {
      type,
      title:
        type === 'video'
          ? `Lecture Video ${curriculumBlocks.filter((b) => b.type === 'video').length + 1}`
          : type === 'document'
          ? `Study Notes Handout ${curriculumBlocks.filter((b) => b.type === 'document').length + 1}`
          : type === 'paper'
          ? `Paper / Assignment ${curriculumBlocks.filter((b) => b.type === 'paper').length + 1}`
          : type === 'live_class'
          ? `Live Session ${curriculumBlocks.filter((b) => b.type === 'live_class').length + 1}`
          : type === 'quiz'
          ? 'Practice Quiz'
          : 'Lesson Overview',
      order: curriculumBlocks.length,
      ...(type === 'paper'
        ? {
            totalMarks: 100,
            deadline: '',
            description: '',
          }
        : {}),
      ...(type === 'quiz'
        ? {
            passPercentage: 50,
            quizQuestions: [
              {
                questionText: '',
                questionType: 'mcq',
                imageUrl: '',
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

  const addQuestionToBlock = (blockIdx: number) => {
    setCurriculumBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== blockIdx) return b;
        return {
          ...b,
          quizQuestions: [
            ...(b.quizQuestions || []),
            {
              questionText: '',
              questionType: 'mcq',
              imageUrl: '',
              imagePublicId: '',
              options: ['', ''],
              correctOptionIndex: 0,
              explanation: '',
            },
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

  const updateQuestionInBlock = (blockIdx: number, qIdx: number, patch: any) => {
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

  return (
    <div className="learning-area space-y-6">
      {/* LEVEL 1: MAIN COURSES TOP BAR */}
      {!selectedMainCourse ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                <span>Level 1: Main Courses</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">Platform Program Architecture</span>
            </div>
            <h2 className="text-2xl font-black text-white">Main Courses Management</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Create and manage main class programs (e.g. "2027 A/L Physics Class"). Click on any main course to manage its monthly classes and lecture recordings.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateMainCourse}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-600/30 hover:brightness-110 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Main Course</span>
          </button>
        </div>
      ) : (
        /* LEVEL 2: INSIDE SELECTED MAIN COURSE TOP BANNER */
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/60 via-slate-900/90 to-indigo-950/60 backdrop-blur-md p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedMainCourse(null);
                setShowMonthlyStudio(false);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold border border-white/10 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Back to All Main Courses</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Rs. {(selectedMainCourse.monthlyFee || selectedMainCourse.price || 0).toLocaleString()} / month
              </span>
              <button
                type="button"
                onClick={openCreateMonthlyClass}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 hover:brightness-110 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Monthly Class</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {selectedMainCourse.thumbnailUrl && (
              <img
                src={selectedMainCourse.thumbnailUrl}
                alt={selectedMainCourse.title}
                className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow"
              />
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-black text-cyan-400">{selectedMainCourse.subject}</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-purple-300 font-bold">{selectedMainCourse.stream} Stream</span>
              </div>
              <h3 className="text-xl font-bold text-white">{selectedMainCourse.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{selectedMainCourse.description}</p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="font-bold text-white text-lg">Student View Preview: {preview.title}</h3>
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

      {/* MODAL: LEVEL 1 CREATE / EDIT MAIN COURSE */}
      {showMainCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingMainCourse ? 'Edit Main Course' : 'Create New Main Course'}
                  </h3>
                  <p className="text-xs text-slate-400">Master Class Category (contains monthly classes)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMainCourseModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveMainCourse} className="p-6 overflow-y-auto space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <select
                    className={control}
                    value={mainForm.subject}
                    onChange={(e) => setMainForm((f) => ({ ...f, subject: e.target.value }))}
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
                    A/L Stream
                  </label>
                  <select
                    className={control}
                    value={mainForm.stream}
                    onChange={(e) => setMainForm((f) => ({ ...f, stream: e.target.value }))}
                  >
                    <option value="Both">Both (Maths & Bio)</option>
                    <option value="Physical Science">Physical Science (Maths)</option>
                    <option value="Biological Science">Biological Science (Bio)</option>
                    <option value="Technology">Technology</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Medium
                  </label>
                  <select
                    className={control}
                    value={mainForm.medium}
                    onChange={(e) => setMainForm((f) => ({ ...f, medium: e.target.value }))}
                  >
                    <option value="English">English Medium</option>
                    <option value="Sinhala">Sinhala Medium</option>
                    <option value="Tamil">Tamil Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Main Course Title <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. 2027 A/L Physics Theory Master Class"
                  className={control}
                  value={mainForm.title}
                  onChange={(e) => setMainForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Standard Monthly Fee (Rs.) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="3500"
                    className={control}
                    value={mainForm.monthlyFee}
                    onChange={(e) => setMainForm((f) => ({ ...f, monthlyFee: Number(e.target.value) }))}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Default fee used when creating monthly classes inside this main course.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Publishing Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMainForm((f) => ({ ...f, status: 'published' }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${
                        mainForm.status === 'published'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      ✓ Published
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainForm((f) => ({ ...f, status: 'draft' }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${
                        mainForm.status === 'draft'
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Draft (Hidden)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Course Description & Overview <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className={control}
                  placeholder="Provide an overview of the master program syllabus coverage, target A/L year, and batch information..."
                  value={mainForm.description}
                  onChange={(e) => setMainForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Main Course Cover Picture (16:9 ratio)
                </label>
                {mainCoverPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video max-w-sm group">
                    <img src={mainCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer">
                        <span>Change</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setMainCoverFile(file);
                              setMainCoverPreview(URL.createObjectURL(file));
                              setRemoveMainCover(false);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMainCoverFile(null);
                          setMainCoverPreview('');
                          setRemoveMainCover(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 transition cursor-pointer">
                    <ImageIcon className="w-6 h-6 text-purple-400 mb-2" />
                    <span className="text-xs font-bold text-slate-200">Upload Main Course Cover Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setMainCoverFile(file);
                          setMainCoverPreview(URL.createObjectURL(file));
                          setRemoveMainCover(false);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Bank Details for Student Fee Transfer Slips
                </label>
                <textarea
                  rows={3}
                  className={`${control} font-mono text-xs`}
                  value={mainForm.bankDetails}
                  onChange={(e) => setMainForm((f) => ({ ...f, bankDetails: e.target.value }))}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMainCourseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-600/30 hover:brightness-110 flex items-center gap-2"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>{editingMainCourse ? 'Update Main Course' : 'Create Main Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEVEL 2: FULL STUDIO FOR CREATING / EDITING MONTHLY CLASS */}
      {selectedMainCourse && showMonthlyStudio && (
        <form
          onSubmit={saveMonthlyClass}
          className="rounded-2xl border border-purple-500/40 bg-[#161831]/90 backdrop-blur-md shadow-2xl overflow-hidden space-y-0"
        >
          {/* Studio Header */}
          <div className="border-b border-white/10 bg-slate-900/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                {editingMonthlyClass ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingMonthlyClass ? 'Edit Monthly Class' : 'Create Monthly Class'} inside{' '}
                  <span className="text-purple-300">"{selectedMainCourse.title}"</span>
                </h3>
                <p className="text-xs text-slate-400">Configure lectures, companion PDFs, and practice quizzes</p>
              </div>
            </div>

            <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-white/5 gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'info' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>1. Overview & Pricing</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('curriculum')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'curriculum' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-300" />
                <span>2. Curriculum Flow</span>
                {curriculumBlocks.filter((b) => b.type !== 'live_class').length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-indigo-400/20 text-indigo-300 text-[11px] flex items-center justify-center font-bold">
                    {curriculumBlocks.filter((b) => b.type !== 'live_class').length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('live_classes')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'live_classes' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>3. Live Classes</span>
                {curriculumBlocks.filter((b) => b.type === 'live_class').length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-400/20 text-rose-300 text-[11px] flex items-center justify-center font-bold">
                    {curriculumBlocks.filter((b) => b.type === 'live_class').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Form Body */}
          <fieldset disabled={busy} className="p-6 space-y-6">
            {/* TAB 1: OVERVIEW & PRICING */}
            {activeTab === 'info' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Target Month <span className="text-rose-400">*</span>
                    </label>
                    <input
                      required
                      placeholder="e.g. October 2026"
                      className={control}
                      value={monthlyForm.targetMonth}
                      onChange={(e) => setMonthlyForm((f) => ({ ...f, targetMonth: e.target.value }))}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Label shown to students (e.g. "October 2026", "November 2026").
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Monthly Class Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      required
                      placeholder="e.g. October 2026 - Mechanics & Rotational Motion"
                      className={control}
                      value={monthlyForm.title}
                      onChange={(e) => setMonthlyForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Monthly Class Fee (Rs.) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      className={control}
                      value={monthlyForm.price}
                      onChange={(e) => setMonthlyForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Access Validity Duration
                    </label>
                    <select
                      className={control}
                      value={monthlyForm.validityPeriod}
                      onChange={(e) =>
                        setMonthlyForm((f) => ({
                          ...f,
                          validityPeriod: e.target.value as any,
                        }))
                      }
                    >
                      <option value="1_month">1 Month from enrollment</option>
                      <option value="3_months">3 Months from enrollment</option>
                      <option value="6_months">6 Months from enrollment</option>
                      <option value="1_year">1 Year from enrollment</option>
                      <option value="lifetime">Lifetime Access</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Publishing Status
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMonthlyForm((f) => ({ ...f, status: 'published' }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${
                          monthlyForm.status === 'published'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        ✓ Published
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthlyForm((f) => ({ ...f, status: 'draft' }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition border ${
                          monthlyForm.status === 'draft'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Draft
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Monthly Class Description & Lesson Plan <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    className={control}
                    placeholder="Describe what will be covered this month: weekly topics, problem sets, and syllabus sections..."
                    value={monthlyForm.description}
                    onChange={(e) => setMonthlyForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Monthly Cover Picture */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Monthly Class Thumbnail / Cover Picture (Optional)
                  </label>
                  {monthlyCoverPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video max-w-sm group">
                      <img src={monthlyCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <label className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer">
                          <span>Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setMonthlyCoverFile(file);
                                setMonthlyCoverPreview(URL.createObjectURL(file));
                                setRemoveMonthlyCover(false);
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMonthlyCoverFile(null);
                            setMonthlyCoverPreview('');
                            setRemoveMonthlyCover(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 transition cursor-pointer">
                      <ImageIcon className="w-6 h-6 text-cyan-400 mb-2" />
                      <span className="text-xs font-bold text-slate-200">Upload Monthly Class Cover</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMonthlyCoverFile(file);
                            setMonthlyCoverPreview(URL.createObjectURL(file));
                            setRemoveMonthlyCover(false);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CURRICULUM FLOW (VIDEOS + COMPANION PDF, NOTES, QUIZZES) */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Sequential Curriculum Steps ({curriculumBlocks.length})</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Videos, companion PDF notes, standalone handouts, and quizzes unlock step-by-step for students.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('video')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>+ Video Lecture (with companion PDF)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('document')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>+ Notes PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('quiz')}
                      className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>+ Practice Quiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addCurriculumBlock('paper')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>+ Paper / Assignment</span>
                    </button>
                  </div>
                </div>

                {/* Progression Locking Setting */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex-wrap gap-3">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Lock className={`w-4 h-4 ${monthlyForm.enforceSequentialProgression ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold text-white">Sequential Step Progression Locking</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        monthlyForm.enforceSequentialProgression
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {monthlyForm.enforceSequentialProgression ? 'Sequential Locking Enabled' : 'Free Exploration (All Unlocked)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {monthlyForm.enforceSequentialProgression
                        ? 'Students must complete Step 1 to unlock Step 2, complete Step 2 to unlock Step 3, etc.'
                        : 'Free Exploration: Students can access any video, notes, or quiz in any order without locking.'}
                    </p>
                  </div>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer select-none hover:border-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={monthlyForm.enforceSequentialProgression}
                      onChange={(e) => setMonthlyForm((f) => ({ ...f, enforceSequentialProgression: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-200">
                      {monthlyForm.enforceSequentialProgression ? 'Enforce Sequential Locking' : 'Free Exploration'}
                    </span>
                  </label>
                </div>

                {curriculumBlocks.filter((b) => b.type !== 'live_class').length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-slate-400 text-xs space-y-2">
                    <p>No curriculum items added yet. Click above to add a video lecture, notes PDF, or quiz.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {curriculumBlocks
                      .map((b, originalIndex) => ({ b, originalIndex }))
                      .filter((item) => item.b.type !== 'live_class')
                      .map(({ b: block, originalIndex: idx }, seqIndex) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-700/80 bg-slate-950/80 p-5 space-y-4 shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black flex items-center justify-center border border-indigo-500/30">
                                {seqIndex + 1}
                              </span>
                              <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                                {block.type === 'video'
                                  ? 'Video Lecture'
                                  : block.type === 'document'
                                  ? 'Study Notes PDF'
                                  : block.type === 'quiz'
                                  ? 'Practice Quiz'
                                  : block.type === 'paper'
                                  ? 'Paper / Assignment'
                                  : 'Overview Guidance'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveBlock(idx, 'up')}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBlock(idx, 'down')}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBlock(idx)}
                                className="p-1.5 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/40 ml-2"
                                title="Remove Step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Step Title
                            </label>
                            <input
                              className={control}
                              value={block.title || ''}
                              onChange={(e) => updateBlock(idx, { title: e.target.value })}
                              placeholder="e.g. Newton's Laws of Motion Part 1"
                            />
                          </div>

                          {/* VIDEO BLOCK: URL + COMPANION PDF */}
                          {block.type === 'video' && (
                            <div className="space-y-4 pt-2 border-t border-white/5">
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1 flex items-center gap-1.5">
                                  <Video className="w-3.5 h-3.5" />
                                  <span>YouTube / Protected Video URL <span className="text-rose-400">*</span></span>
                                </label>
                                <input
                                  className={control}
                                  placeholder="https://www.youtube.com/watch?v=... or direct MP4 link"
                                  value={block.url || ''}
                                  onChange={(e) => updateBlock(idx, { url: e.target.value })}
                                />
                                <span className="text-[10px] text-slate-500 mt-0.5 block">
                                  Streams securely without YouTube branding and watermarked with student's index number.
                                </span>
                              </div>

                              {/* COMPANION PDF DOCUMENT ATTACHMENT */}
                              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>This Video's Related Companion PDF Notes (Right side in Diagram 4)</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    Shown alongside video if uploaded
                                  </span>
                                </div>

                                {block.pdfFileName || block.recordingPdfFileName ? (
                                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-emerald-500/20 text-xs">
                                    <span className="text-emerald-200 font-medium">
                                      📄 {block.pdfFileName || block.recordingPdfFileName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateBlock(idx, {
                                          pdfUrl: '',
                                          pdfFileName: '',
                                          recordingPdfUrl: '',
                                          recordingPdfFileName: '',
                                          pendingFile: undefined,
                                        })
                                      }
                                      className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                                    >
                                      Remove PDF
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-emerald-500/40 bg-slate-900/60 hover:bg-slate-900 transition cursor-pointer text-xs font-medium text-emerald-300">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Attach Companion PDF Notes for this Video</span>
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          updateBlock(idx, {
                                            pendingFile: file,
                                            pdfFileName: file.name,
                                            recordingPdfFileName: file.name,
                                          });
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          )}

                          {/* DOCUMENT BLOCK: STANDALONE PDF HANDOUT */}
                          {block.type === 'document' && (
                            <div className="space-y-3 pt-2 border-t border-white/5">
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Study Notes Document (PDF) <span className="text-rose-400">*</span></span>
                              </label>

                              {block.pdfFileName ? (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs">
                                  <span className="text-emerald-300 font-bold">
                                    📄 {block.pdfFileName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateBlock(idx, {
                                        pdfUrl: '',
                                        pdfFileName: '',
                                        pendingFile: undefined,
                                      })
                                    }
                                    className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                                  >
                                    Replace
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-emerald-500/40 bg-slate-900/60 hover:bg-slate-900 transition cursor-pointer text-xs text-emerald-300">
                                  <Upload className="w-5 h-5 mb-1" />
                                  <span className="font-bold">Upload PDF Document</span>
                                  <span className="text-[10px] text-slate-400">PDFs will be watermarked upon download</span>
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        updateBlock(idx, {
                                          pendingFile: file,
                                          pdfFileName: file.name,
                                        });
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          )}

                          {/* QUIZ BLOCK: MCQ OR OPEN-ENDED WITH DIAGRAMS */}
                          {block.type === 'quiz' && (
                            <div className="space-y-4 pt-2 border-t border-white/5">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">Passing percentage:</span>
                                  <input
                                    type="number"
                                    min={10}
                                    max={100}
                                    className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs text-center font-bold"
                                    value={block.passPercentage ?? 50}
                                    onChange={(e) => updateBlock(idx, { passPercentage: Number(e.target.value) })}
                                  />
                                  <span className="text-xs text-slate-400">%</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => addQuestionToBlock(idx)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Question</span>
                                </button>
                              </div>

                              <div className="space-y-3">
                                {(block.quizQuestions || []).map((q, qIdx) => (
                                  <div key={qIdx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white">Q{qIdx + 1}.</span>
                                        <select
                                          className="text-xs bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 font-semibold"
                                          value={q.questionType || 'mcq'}
                                          onChange={(e) => updateQuestionInBlock(idx, qIdx, { questionType: e.target.value as any })}
                                        >
                                          <option value="mcq">Multiple Choice (MCQ)</option>
                                          <option value="text">Open-ended / Text (Admin Review)</option>
                                        </select>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => removeQuestionFromBlock(idx, qIdx)}
                                        className="text-rose-400 hover:text-rose-300 text-xs p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* Question Text */}
                                    <textarea
                                      rows={2}
                                      className={control}
                                      placeholder="Question statement or problem formulation..."
                                      value={q.questionText}
                                      onChange={(e) => updateQuestionInBlock(idx, qIdx, { questionText: e.target.value })}
                                    />

                                    {/* Question Diagram / Image */}
                                    <div className="flex items-center gap-3">
                                      {q.imageUrl ? (
                                        <div className="relative inline-block border border-slate-700 rounded-lg overflow-hidden max-h-24">
                                          <img src={q.imageUrl} alt="Diagram" className="max-h-24 object-contain" />
                                          <button
                                            type="button"
                                            onClick={() => updateQuestionInBlock(idx, qIdx, { imageUrl: '', imagePublicId: '' })}
                                            className="absolute top-1 right-1 bg-black/70 text-rose-400 p-1 rounded"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold cursor-pointer flex items-center gap-1.5 border border-slate-700">
                                          <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                          <span>Attach Question Diagram / Image</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                try {
                                                  const res = await api.uploadQuizQuestionImage(file);
                                                  updateQuestionInBlock(idx, qIdx, { imageUrl: res.url, imagePublicId: res.publicId });
                                                } catch (err: any) {
                                                  alert(err.message || 'Could not upload diagram');
                                                }
                                              }
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>

                                    {/* Options if MCQ */}
                                    {(!q.questionType || q.questionType === 'mcq') && (
                                      <div className="space-y-2 pt-2 border-t border-white/5">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                          Options (Select radio for correct answer):
                                        </span>
                                        {q.options.map((opt, optIdx) => (
                                          <div key={optIdx} className="flex items-center gap-2">
                                            <input
                                              type="radio"
                                              name={`correct-${idx}-${qIdx}`}
                                              checked={q.correctOptionIndex === optIdx}
                                              onChange={() => updateQuestionInBlock(idx, qIdx, { correctOptionIndex: optIdx })}
                                              className="w-4 h-4 text-emerald-500"
                                            />
                                            <input
                                              className={`${control} flex-1 text-xs py-1.5`}
                                              placeholder={`Option ${optIdx + 1}`}
                                              value={opt}
                                              onChange={(e) => {
                                                const next = [...q.options];
                                                next[optIdx] = e.target.value;
                                                updateQuestionInBlock(idx, qIdx, { options: next });
                                              }}
                                            />
                                            {q.options.length > 2 && (
                                              <button
                                                type="button"
                                                onClick={() => removeOptionFromQuestion(idx, qIdx, optIdx)}
                                                className="text-slate-500 hover:text-rose-400 text-xs"
                                              >
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => addOptionToQuestion(idx, qIdx)}
                                          className="text-xs text-indigo-400 hover:underline font-semibold"
                                        >
                                          + Add Option
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PAPER / ASSIGNMENT BLOCK */}
                          {block.type === 'paper' && (
                            <div className="space-y-4 pt-2 border-t border-white/5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                                    Total Marks
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value={block.totalMarks || 100}
                                    onChange={(e) => updateBlock(idx, { totalMarks: Number(e.target.value) || 100 })}
                                    className={control}
                                    placeholder="e.g. 100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                                    Submission Deadline / Due Date
                                  </label>
                                  <input
                                    type="text"
                                    value={block.deadline || ''}
                                    onChange={(e) => updateBlock(idx, { deadline: e.target.value })}
                                    className={control}
                                    placeholder="e.g. End of October / 2026-10-31"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                                  Questions / Paper Instructions (or Written Questions)
                                </label>
                                <textarea
                                  rows={3}
                                  value={block.description || ''}
                                  onChange={(e) => updateBlock(idx, { description: e.target.value })}
                                  className={control}
                                  placeholder="Describe the paper requirements, instructions, or write questions here..."
                                />
                              </div>

                              {/* 1. QUESTION PAPER PDF */}
                              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/60 border border-amber-500/30">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Question Paper Document (PDF)</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">Watermarked with student index on download</span>
                                </label>

                                {block.paperFileName || block.pdfFileName ? (
                                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-amber-500/20 text-xs">
                                    <span className="text-amber-200 font-bold truncate">
                                      📄 {block.paperFileName || block.pdfFileName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateBlock(idx, {
                                          paperUrl: '',
                                          paperFileName: '',
                                          pdfUrl: '',
                                          pdfFileName: '',
                                          pendingFile: undefined,
                                        })
                                      }
                                      className="text-rose-400 hover:text-rose-300 text-xs font-bold shrink-0 ml-2 cursor-pointer"
                                    >
                                      Remove Paper
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-amber-500/40 bg-slate-900/60 hover:bg-slate-900 transition cursor-pointer text-xs font-medium text-amber-300">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Attach Question Paper PDF for Students to Solve</span>
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          updateBlock(idx, {
                                            pendingFile: file,
                                            paperFileName: file.name,
                                            pdfFileName: file.name,
                                          });
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>

                              {/* 2. OFFICIAL RESULT SHEET / MARKING SCHEME PDF */}
                              <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/30">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5" />
                                    <span>Official Result Sheet / Marking Scheme (PDF)</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">Optional · Visible to students after grading or publication</span>
                                </label>

                                {block.resultSheetFileName ? (
                                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-emerald-500/20 text-xs">
                                    <span className="text-emerald-200 font-bold truncate">
                                      📊 {block.resultSheetFileName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateBlock(idx, {
                                          resultSheetUrl: '',
                                          resultSheetFileName: '',
                                          pendingResultSheet: undefined,
                                        })
                                      }
                                      className="text-rose-400 hover:text-rose-300 text-xs font-bold shrink-0 ml-2 cursor-pointer"
                                    >
                                      Remove Result Sheet
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-emerald-500/40 bg-slate-900/60 hover:bg-slate-900 transition cursor-pointer text-xs font-medium text-emerald-300">
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Attach Result Sheet / Scheme PDF (Optional)</span>
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          updateBlock(idx, {
                                            pendingResultSheet: file,
                                            resultSheetFileName: file.name,
                                          });
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LIVE CLASSES */}
            {activeTab === 'live_classes' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl bg-rose-950/30 border border-rose-500/40">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span>Live Class Classroom Sessions</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live class links automatically disappear 5 hours after the scheduled time.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => addCurriculumBlock('live_class')}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Live Session</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {curriculumBlocks
                    .map((b, idx) => ({ b, idx }))
                    .filter((item) => item.b.type === 'live_class')
                    .map(({ b: lc, idx }) => (
                      <div key={idx} className="p-5 rounded-xl bg-slate-950 border border-rose-500/30 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-rose-300">Live Class Session</span>
                          <button
                            type="button"
                            onClick={() => removeBlock(idx)}
                            className="text-rose-400 hover:text-rose-300 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Live Meeting Link (Zoom / Google Meet)
                            </label>
                            <input
                              className={control}
                              placeholder="https://zoom.us/j/... or Meet link"
                              value={lc.liveLink || ''}
                              onChange={(e) => updateBlock(idx, { liveLink: e.target.value })}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Scheduled Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              className={control}
                              value={lc.scheduledTime ? lc.scheduledTime.slice(0, 16) : ''}
                              onChange={(e) => updateBlock(idx, { scheduledTime: e.target.value })}
                            />
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Auto-cleans 5 hours after scheduled time.
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Live Class Session Title
                          </label>
                          <input
                            className={control}
                            placeholder="e.g. Live Q&A and Problem Solving Session"
                            value={lc.title || ''}
                            onChange={(e) => updateBlock(idx, { title: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Save Monthly Class Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowMonthlyStudio(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 hover:brightness-110 flex items-center gap-2"
              >
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>{editingMonthlyClass ? 'Update Monthly Class' : 'Publish Monthly Class'}</span>
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* DIRECTORY SECTION: LEVEL 1 (MAIN COURSES) OR LEVEL 2 (MONTHLY CLASSES) */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="font-bold text-white text-lg">
              {!selectedMainCourse
                ? `Main Course Programs (${lessonsPage.pagination.total})`
                : `Monthly Classes for "${selectedMainCourse.title}" (${lessonsPage.pagination.total})`}
            </h3>
            <p className="text-xs text-slate-400">
              {!selectedMainCourse
                ? 'Select a main course to manage its monthly classes or delete when empty.'
                : 'Browse, edit, or delete monthly classes inside this main course.'}
            </p>
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
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!selectedMainCourse && (
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
          )}

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
          <div className="text-center py-12 text-slate-400 text-sm">Loading courses...</div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm space-y-2">
            <p>
              {!selectedMainCourse
                ? 'No main courses found. Click "+ Create Main Course" to get started.'
                : 'No monthly classes found under this main course. Click "+ Create Monthly Class" to add one.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lessons.map((course) => {
              const subCount = course.subCourseCount || 0;
              const isMainLevel = !selectedMainCourse;

              return (
                <div
                  key={course._id}
                  className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between flex-wrap gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0 max-w-2xl">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-20 h-14 rounded-lg object-cover border border-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-14 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                        {isMainLevel ? <Layers className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-cyan-400">{course.subject}</span>
                        {course.targetMonth && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {course.targetMonth}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            course.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {course.status}
                        </span>
                        <span className="text-xs font-black text-amber-300">
                          Rs. {(course.monthlyFee || course.price || 0).toLocaleString()} {isMainLevel ? '/ mo' : ''}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-sm truncate">{course.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">{course.description}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 font-medium">
                        {isMainLevel ? (
                          <span className="text-purple-300 font-bold flex items-center gap-1">
                            <Layers className="w-3 h-3 text-purple-400" />
                            <span>{subCount} Monthly Classes inside</span>
                          </span>
                        ) : (
                          <>
                            <span>🎬 {course.videoCount || 0} Videos</span>
                            <span>•</span>
                            <span>📄 {course.resourceCount || 0} PDFs</span>
                            <span>•</span>
                            <span>
                              ⏱️{' '}
                              {course.validityPeriod === '1_month'
                                ? '1 mo validity'
                                : course.validityPeriod === '3_months'
                                ? '3 mo validity'
                                : course.validityPeriod === '6_months'
                                ? '6 mo validity'
                                : course.validityPeriod === '1_year'
                                ? '1 yr validity'
                                : 'Lifetime'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isMainLevel ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedMainCourse(course)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold transition shadow-md shadow-purple-600/20 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Manage Monthly Classes ({subCount}) →</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditMainCourse(course)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={subCount > 0 || busy}
                          onClick={() => removeMainCourse(course)}
                          title={
                            subCount > 0
                              ? `Cannot delete: Contains ${subCount} monthly class(es). Delete the monthly classes inside first.`
                              : 'Delete main course'
                          }
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            subCount > 0
                              ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20 cursor-pointer'
                          }`}
                        >
                          {subCount > 0 ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>Delete</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditMonthlyClass(course)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold border border-indigo-500/30 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Curriculum</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreview(course);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeMonthlyClass(course)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold border border-rose-500/20 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination {...lessonsPage.pagination} label="Courses" />
      </div>
    </div>
  );
};
