import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  RefreshCw,
  Send,
  Download,
  Activity,
  UserX,
  UserCheck,
  Mail,
  CheckCircle,
  AlertCircle,
  FileText,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Globe,
} from 'lucide-react';
import { api, getAuthToken } from '../../services/api';
import { PastPaper, Question } from '../../types';
import { validateRequired, validateYear } from '../../lib/validation';

interface AdminPanelProps {
  userRole?: string;
  username?: string | null;
  profileLoaded?: boolean;
  onNavigateHome?: () => void;
  pastPapers?: PastPaper[];
  onAddPastPaper?: (paper: PastPaper) => void;
  onDeletePastPaper?: (paperId: string) => void;
  quizQuestions?: Question[];
  onAddQuizQuestion?: (question: Question) => void;
  onDeleteQuizQuestion?: (questionId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  userRole = 'admin',
  onNavigateHome = () => {},
  pastPapers = [],
  onAddPastPaper,
  onDeletePastPaper,
  quizQuestions = [],
  onAddQuizQuestion,
  onDeleteQuizQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'pastpapers' | 'quiz'>('directory');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<{ success?: string; error?: string } | null>(null);

  // Global Exam Dates State for 2 batches (stored in MongoDB via admin API)
  const [adminExamDate2026, setAdminExamDate2026] = useState('2026-11-25');
  const [adminExamDate2027, setAdminExamDate2027] = useState('2027-11-25');
  const [examDateSaving, setExamDateSaving] = useState(false);
  const [examDateSavedMsg, setExamDateSavedMsg] = useState<{ success?: string; error?: string } | null>(null);

  const fetchExamDate = async () => {
    try {
      const res = await api.getAdminExamDate();
      if (res?.examDate2026) setAdminExamDate2026(res.examDate2026);
      if (res?.examDate2027) setAdminExamDate2027(res.examDate2027);
    } catch {
      // fail silently
    }
  };

  const handleSaveGlobalExamDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminExamDate2026 && !adminExamDate2027) {
      setExamDateSavedMsg({ error: 'Please select at least one valid exam date.' });
      return;
    }
    try {
      setExamDateSaving(true);
      setExamDateSavedMsg(null);
      await api.setAdminExamDate({
        examDate2026: adminExamDate2026,
        examDate2027: adminExamDate2027,
      });
      // Update localStorage for immediate local usage
      if (adminExamDate2026) localStorage.setItem('mindmaze_global_exam_date_2026', adminExamDate2026);
      if (adminExamDate2027) localStorage.setItem('mindmaze_global_exam_date_2027', adminExamDate2027);
      if (adminExamDate2026) localStorage.setItem('mindmaze_global_exam_date', adminExamDate2026);

      setExamDateSavedMsg({
        success: `Upcoming exam dates saved! (2026 Batch: ${adminExamDate2026}, 2027 Batch: ${adminExamDate2027})`,
      });
      setTimeout(() => setExamDateSavedMsg(null), 5000);
    } catch (err: any) {
      setExamDateSavedMsg({ error: err?.message || 'Failed to save exam dates.' });
    } finally {
      setExamDateSaving(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState('all');

  // Simplified Past Paper Form State
  const [paperTitle, setPaperTitle] = useState('');
  const [paperSubject, setPaperSubject] = useState<any>('Physics');
  const [paperStream, setPaperStream] = useState<any>('Maths');
  const [paperYear, setPaperYear] = useState<number>(2026);
  const [paperIsModel, setPaperIsModel] = useState<boolean>(true);
  const [paperSyllabus, setPaperSyllabus] = useState<'current' | 'old'>('current');
  const [paperType, setPaperType] = useState<any>('MCQ');
  const [paperMedium, setPaperMedium] = useState<any>('English');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [paperPdfName, setPaperPdfName] = useState<string>('');
  const [paperCalculatedSize, setPaperCalculatedSize] = useState<string>('3.2 MB');
  const [paperSuccess, setPaperSuccess] = useState<string | null>(null);

  // Practice Quiz Form State
  const [quizQuestionText, setQuizQuestionText] = useState('');
  const [quizSubject, setQuizSubject] = useState<any>('Physics');
  const [quizTopic, setQuizTopic] = useState('Mechanics');
  const [quizYear, setQuizYear] = useState<number>(2026);
  const [quizOptA, setQuizOptA] = useState('');
  const [quizOptB, setQuizOptB] = useState('');
  const [quizOptC, setQuizOptC] = useState('');
  const [quizOptD, setQuizOptD] = useState('');
  const [quizOptE, setQuizOptE] = useState('');
  const [quizCorrectOpt, setQuizCorrectOpt] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [quizExplanation, setQuizExplanation] = useState('');
  const [quizSuccess, setQuizSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
    fetchExamDate();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminStats(),
      ]);
      setUsers(usersRes.users || []);
      setStats(statsRes.stats || null);
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
      setError(err.message || 'Failed to load admin dashboard. Ensure backend server is connected.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.updateUserStatus(userId, !currentStatus);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: !currentStatus } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      await api.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"? This will delete all their study tasks, timetables, and progress data.`)) {
      return;
    }

    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastStatus(null);

    const subjErr = validateRequired(emailSubject, 'Subject Title', 3);
    if (subjErr) {
      setBroadcastStatus({ error: subjErr });
      return;
    }

    const msgErr = validateRequired(emailMessage, 'Message Content', 5);
    if (msgErr) {
      setBroadcastStatus({ error: msgErr });
      return;
    }

    setSendingEmail(true);
    try {
      const res = await api.sendBroadcastEmail({
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
      });
      setBroadcastStatus({ success: res.message || 'Broadcast email dispatched successfully!' });
      setEmailSubject('');
      setEmailMessage('');
    } catch (err: any) {
      setBroadcastStatus({ error: err.message || 'Failed to send broadcast email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingEmail(true);
    setBroadcastStatus(null);
    try {
      const res = await api.testAdminEmail();
      setBroadcastStatus({ success: res.message || 'Test email dispatched successfully! Check inbox.' });
    } catch (err: any) {
      setBroadcastStatus({ error: err.message || 'Failed to send test email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreatePastPaper = (e: React.FormEvent) => {
    e.preventDefault();
    
    const titleErr = validateRequired(paperTitle, 'Paper Title', 3);
    if (titleErr) {
      alert(titleErr);
      return;
    }

    if (!selectedPdfFile) {
      alert('Please upload or select a Past Paper PDF file to publish.');
      return;
    }

    const yearErr = validateYear(paperYear, 2000, 2030);
    if (yearErr) {
      alert(yearErr);
      return;
    }

    const newPaper: PastPaper = {
      id: `pp-${Date.now()}`,
      title: paperTitle.trim(),
      subject: paperSubject,
      stream: paperStream,
      year: Number(paperYear) || 2026,
      syllabus: paperSyllabus,
      type: paperType,
      medium: paperMedium,
      downloadSize: paperCalculatedSize || '3.5 MB',
      isModelPaper: paperIsModel,
      pdfUrl: selectedPdfFile ? URL.createObjectURL(selectedPdfFile) : undefined,
    };

    if (onAddPastPaper) {
      onAddPastPaper(newPaper);
    }
    setPaperSuccess(`Successfully uploaded & published past paper: "${newPaper.title}"`);
    setPaperTitle('');
    setSelectedPdfFile(null);
    setPaperPdfName('');
    setTimeout(() => setPaperSuccess(null), 5000);
  };

  const handleCreateQuizQuestion = (e: React.FormEvent) => {
    e.preventDefault();

    const qErr = validateRequired(quizQuestionText, 'Question Text', 5);
    if (qErr) {
      alert(qErr);
      return;
    }

    if (!quizOptA.trim() || !quizOptB.trim() || !quizOptC.trim() || !quizOptD.trim() || !quizOptE.trim()) {
      alert('Please fill in all 5 options (A, B, C, D, and E) properly.');
      return;
    }

    const yearErr = validateYear(quizYear, 2000, 2030);
    if (yearErr) {
      alert(yearErr);
      return;
    }

    const newQuestion: Question = {
      id: `q-admin-${Date.now()}`,
      subject: quizSubject,
      topic: quizTopic.trim() || 'General',
      paperYear: Number(quizYear) || 2026,
      questionText: quizQuestionText.trim(),
      options: [
        { id: 'A', text: quizOptA.trim(), isCorrect: quizCorrectOpt === 'A' },
        { id: 'B', text: quizOptB.trim(), isCorrect: quizCorrectOpt === 'B' },
        { id: 'C', text: quizOptC.trim(), isCorrect: quizCorrectOpt === 'C' },
        { id: 'D', text: quizOptD.trim(), isCorrect: quizCorrectOpt === 'D' },
        { id: 'E', text: quizOptE.trim(), isCorrect: quizCorrectOpt === 'E' },
      ],
      explanation: {
        correctOptionId: quizCorrectOpt,
        correctOptionText:
          quizCorrectOpt === 'A' ? quizOptA :
          quizCorrectOpt === 'B' ? quizOptB :
          quizCorrectOpt === 'C' ? quizOptC :
          quizCorrectOpt === 'D' ? quizOptD : quizOptE,
        conceptNote: quizExplanation.trim() || 'Official solution provided by Mind Maze faculty.',
        stepByStep: [quizExplanation.trim() || 'Select the option matching correct core principles.'],
      },
    };

    if (onAddQuizQuestion) {
      onAddQuizQuestion(newQuestion);
    }
    setQuizSuccess(`Successfully added quiz question to ${quizSubject} (${quizTopic})`);
    setQuizQuestionText('');
    setQuizOptA('');
    setQuizOptB('');
    setQuizOptC('');
    setQuizOptD('');
    setQuizOptE('');
    setQuizOptE('');
    setQuizExplanation('');
    setTimeout(() => setQuizSuccess(null), 5000);
  };

  const handleDownloadCsv = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://mindmaze-30xp.onrender.com/api';
    const token = getAuthToken();
    window.open(`${API_URL}/admin/export-csv?token=${token}`, '_blank');
  };

  const filteredUsers = (users || []).filter((u) => {
    const userPhone = u.whatsappNumber || u.mobileNumber || u.phoneNumber || u.phone || '';
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      userPhone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStream = streamFilter === 'all' || u.stream === streamFilter;
    return matchesSearch && matchesStream;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              Admin Command Center
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage students, add past papers, send email broadcasts & inspect analytics
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6B4EFF] hover:bg-[#5b3eff] text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-purple-500/25"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-[#6B4EFF] text-white shadow-lg shadow-purple-500/25'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Directory & Email Broadcast</span>
        </button>

        <button
          onClick={() => setActiveTab('pastpapers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'pastpapers'
              ? 'bg-[#6B4EFF] text-white shadow-lg shadow-purple-500/25'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <BookOpen className="w-4 h-4 text-cyan-300" />
          <span>Past Paper Manager</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            {pastPapers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-[#6B4EFF] text-white shadow-lg shadow-purple-500/25'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Practice Quiz Questions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
            {quizQuestions.length}
          </span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Student Directory & Broadcast */}
      {activeTab === 'directory' && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#161831]/80 border border-white/10 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>Total Users</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white">{stats.totalUsers || 0}</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#161831]/80 border border-white/10 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>Students</span>
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-cyan-300">{stats.totalStudents || 0}</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#161831]/80 border border-white/10 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>Active Courses</span>
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-300">{stats.totalCourses || 0}</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#161831]/80 border border-white/10 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>Study Timetables</span>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300">{stats.totalTimetableSlots || 0}</div>
              </div>
            </div>
          )}

          {/* ── Upcoming Exam Dates (Admin Sets for Both 2026 & 2027 Batches) ── */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-amber-500/20 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span className="text-amber-400">📅</span>
                <span>Set Upcoming A/L Exam Dates (2 Batches)</span>
              </h3>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-400/30 text-amber-300">
                2 Batches Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Set the national GCE A/L examination dates for both active student batches. Each student's dashboard will automatically show the countdown corresponding to their batch year.
            </p>
            <form onSubmit={handleSaveGlobalExamDate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-300">
                      2026 A/L Batch Exam Date <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">Current Senior Batch</span>
                  </div>
                  <input
                    type="date"
                    value={adminExamDate2026}
                    onChange={(e) => setAdminExamDate2026(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-400/30 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                    required
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-cyan-300">
                      2027 A/L Batch Exam Date <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">New Junior Batch</span>
                  </div>
                  <input
                    type="date"
                    value={adminExamDate2027}
                    onChange={(e) => setAdminExamDate2027(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-400/30 text-white text-sm focus:outline-none focus:border-cyan-400 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={examDateSaving || (!adminExamDate2026 && !adminExamDate2027)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white text-sm font-bold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {examDateSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Both Batches...</span>
                    </>
                  ) : (
                    <span>Save Exam Dates (Both Batches)</span>
                  )}
                </button>
              </div>
            </form>
            {examDateSavedMsg?.success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{examDateSavedMsg.success}</span>
              </div>
            )}
            {examDateSavedMsg?.error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{examDateSavedMsg.error}</span>
              </div>
            )}
          </div>

          {/* Broadcast Email Form */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" />
              <span>Broadcast Email Announcement</span>
            </h3>

            {broadcastStatus?.success && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{broadcastStatus.success}</span>
              </div>
            )}

            {broadcastStatus?.error && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{broadcastStatus.error}</span>
                </div>
                {broadcastStatus.error.toLowerCase().includes('not configured') && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <p className="text-amber-300 text-xs font-bold">Setup Required — Add one of these to Render Environment Variables:</p>
                    <div className="space-y-1 font-mono text-[10px] text-slate-300">
                      <p className="text-slate-400 font-bold">Option A — Gmail App Password (recommended):</p>
                      <p>EMAIL_USER=<span className="text-cyan-300">your@gmail.com</span></p>
                      <p>EMAIL_PASS=<span className="text-cyan-300">xxxx xxxx xxxx xxxx</span> <span className="text-slate-500">(Gmail App Password)</span></p>
                      <p className="text-slate-500 mt-1">→ Enable 2FA on Gmail → Google Account → Security → App Passwords</p>
                      <p className="text-slate-400 font-bold mt-2">Option B — Brevo SMTP (free 300/day):</p>
                      <p>SMTP_HOST=<span className="text-cyan-300">smtp-relay.brevo.com</span></p>
                      <p>SMTP_PORT=<span className="text-cyan-300">587</span></p>
                      <p>SMTP_USER=<span className="text-cyan-300">your@email.com</span></p>
                      <p>SMTP_PASS=<span className="text-cyan-300">your-brevo-smtp-key</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. New Combined Maths Physics Model Papers Uploaded!"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Write your announcement or exam reminder to all registered students..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#5b3eff] text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-500/25"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingEmail ? 'Dispatched Emails...' : 'Send Broadcast Email'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingEmail}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Send Test Email (Self)</span>
                </button>
              </div>
            </form>
          </div>

          {/* User Directory */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Registered Student Directory ({filteredUsers.length})</span>
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                />

                <select
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="all">All Streams</option>
                  <option value="Physical Science">Physical Science</option>
                  <option value="Biological Science">Biological Science</option>
                </select>
              </div>
            </div>

            {/* Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Stream & Elective</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Streak</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No matching registered students found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-white/5 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div>{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-emerald-400 text-[11px] whitespace-nowrap">
                          {u.whatsappNumber || u.mobileNumber || u.phoneNumber || u.phone || "—"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium">
                            {u.stream} ({u.physicalScienceElective || 'Chemistry'})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                                : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                            }`}
                          >
                            {u.role || 'student'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-300 whitespace-nowrap">
                          {u.streakDays || 0}d
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              u.isActive !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {u.isActive !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleRole(u._id, u.role)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer min-w-[96px]"
                            >
                              {u.role === 'admin' ? (
                                <>
                                  <UserX className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Demote</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Make Admin</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleToggleStatus(u._id, u.isActive !== false)}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-w-[84px] ${
                                u.isActive !== false
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {u.isActive !== false ? (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Block</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Activate</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u._id, u.name)}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                              title="Delete Account & Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'pastpapers' && (
        <div className="space-y-6">
          {/* Create Form */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>Upload / Add Past Paper</span>
              </h3>
              <span className="text-xs text-slate-400">Pushes directly to student Past Papers page</span>
            </div>

            {paperSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{paperSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreatePastPaper} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Paper Title <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. G.C.E. A/L Physics 2025 National Model Paper I (MCQ)"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* PDF Drag & Drop Upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Upload / Drop Past Paper PDF Document <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-2xl p-6 text-center bg-white/5 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedPdfFile(file);
                          setPaperPdfName(file.name);
                          setPaperCalculatedSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Download className="w-8 h-8 text-cyan-400" />
                      {selectedPdfFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span>{paperPdfName}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">File size: {paperCalculatedSize}</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-200">
                            Drag & drop your Pastpaper PDF file here, or <span className="text-cyan-400 underline">browse files</span>
                          </p>
                          <p className="text-[10px] text-slate-400">PDF files up to 50MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Subject</label>
                  <select
                    value={paperSubject}
                    onChange={(e) => setPaperSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="ICT">ICT</option>
                    <option value="Combined Maths">Combined Maths</option>
                  </select>
                </div>

                {/* Stream */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Target Stream</label>
                  <select
                    value={paperStream}
                    onChange={(e) => setPaperStream(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Maths">Maths Stream</option>
                    <option value="Bio">Bio Stream</option>
                  </select>
                </div>

                {/* Examination Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Exam / Practice Year</label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2030}
                    value={paperYear}
                    onChange={(e) => setPaperYear(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Paper Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Paper Type</label>
                  <select
                    value={paperType}
                    onChange={(e) => setPaperType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="Structured">Structured</option>
                    <option value="Essay">Essay</option>
                  </select>
                </div>

                {/* Medium */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Language Medium</label>
                  <select
                    value={paperMedium}
                    onChange={(e) => setPaperMedium(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="English">English</option>
                    <option value="Sinhala">Sinhala</option>
                    <option value="Tamil">Tamil</option>
                  </select>
                </div>

                {/* Syllabus Era */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Syllabus Curriculum</label>
                  <select
                    value={paperSyllabus}
                    onChange={(e) => setPaperSyllabus(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="current">Current Syllabus (2019+)</option>
                    <option value="old">Old Syllabus (Pre-2019)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={paperIsModel}
                    onChange={(e) => setPaperIsModel(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-white/10 border-white/20 focus:ring-0"
                  />
                  <span>Mark as Official Model Paper</span>
                </label>
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold transition shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Past Paper</span>
              </button>
            </form>
          </div>

          {/* Past Papers List */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-300" />
              <span>Published Past Papers Library ({pastPapers.length})</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Title & Year</th>
                    <th className="py-3 px-4">Subject & Medium</th>
                    <th className="py-3 px-4">Type & Syllabus</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pastPapers.map((paper) => (
                    <tr key={paper.id} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{paper.title}</span>
                          {paper.isModelPaper && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9px] font-bold">
                              Model
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{paper.year} Examination • {paper.questionCount} Questions</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        <div>{paper.subject}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{paper.medium} Medium</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300">
                          {paper.type} ({paper.syllabus === 'current' ? '2019+' : 'Old'})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onDeletePastPaper && onDeletePastPaper(paper.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Practice Quiz Manager */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {/* Create Form */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Add Practice Quiz Question</span>
              </h3>
              <span className="text-xs text-slate-400">Pushes directly to student Practice Quiz page</span>
            </div>

            {quizSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{quizSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuizQuestion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Question Text */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Question Text <span className="text-rose-400">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={quizQuestionText}
                    onChange={(e) => setQuizQuestionText(e.target.value)}
                    placeholder="Enter the full MCQ question text..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Subject</label>
                  <select
                    value={quizSubject}
                    onChange={(e) => setQuizSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Combined Maths">Combined Maths</option>
                    <option value="Biology">Biology</option>
                    <option value="ICT">ICT</option>
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Topic</label>
                  <input
                    type="text"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="e.g. Mechanics, Waves, Organic Chemistry"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Paper Year</label>
                  <input
                    type="number"
                    min={2000}
                    max={2030}
                    value={quizYear}
                    onChange={(e) => setQuizYear(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Correct Answer */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Correct Answer</label>
                  <select
                    value={quizCorrectOpt}
                    onChange={(e) => setQuizCorrectOpt(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e2042] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>

                {/* Options */}
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div key={opt}>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Option {opt} {['A','B','C','D'].includes(opt) && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type="text"
                      required
                      value={opt === 'A' ? quizOptA : opt === 'B' ? quizOptB : opt === 'C' ? quizOptC : quizOptD}
                      onChange={(e) => {
                        if (opt === 'A') setQuizOptA(e.target.value);
                        else if (opt === 'B') setQuizOptB(e.target.value);
                        else if (opt === 'C') setQuizOptC(e.target.value);
                        else setQuizOptD(e.target.value);
                      }}
                      placeholder={`Enter option ${opt}`}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ))}

                {/* Option E (Required - 5 Options Standard) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Option E <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={quizOptE}
                    onChange={(e) => setQuizOptE(e.target.value)}
                    placeholder="Enter option E"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Explanation */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Explanation / Concept Note</label>
                  <textarea
                    rows={2}
                    value={quizExplanation}
                    onChange={(e) => setQuizExplanation(e.target.value)}
                    placeholder="Brief explanation of why the answer is correct..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white text-xs font-bold transition shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Quiz Question</span>
              </button>
            </form>
          </div>

          {/* Quiz Questions List */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Practice Quiz Bank ({quizQuestions.length} questions)</span>
            </h3>

            {quizQuestions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">No quiz questions added yet. Add your first question above.</div>
            ) : (
              <div className="space-y-3">
                {quizQuestions.map((q, i) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">{q.subject}</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px]">{q.topic}</span>
                          <span className="text-[10px] text-slate-500">{q.paperYear}</span>
                        </div>
                        <p className="text-xs text-white font-semibold leading-relaxed">Q{i + 1}. {q.questionText}</p>
                        <div className="mt-1.5 grid grid-cols-2 gap-1">
                          {q.options.map((opt) => (
                            <div key={opt.id} className={`text-[10px] px-2 py-1 rounded-lg ${opt.isCorrect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold' : 'text-slate-400 bg-white/5 border border-white/5'}`}>
                              {opt.id}. {opt.text}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteQuizQuestion && onDeleteQuizQuestion(q.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
