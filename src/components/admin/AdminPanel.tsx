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
import { PastPaper } from '../../types';

interface AdminPanelProps {
  userRole?: string;
  username?: string | null;
  profileLoaded?: boolean;
  onNavigateHome?: () => void;
  pastPapers?: PastPaper[];
  onAddPastPaper?: (paper: PastPaper) => void;
  onDeletePastPaper?: (paperId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  userRole = 'admin',
  onNavigateHome = () => {},
  pastPapers = [],
  onAddPastPaper,
  onDeletePastPaper,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'pastpapers'>('directory');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<{ success?: string; error?: string } | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState('all');

  // Past Paper Form State
  const [paperTitle, setPaperTitle] = useState('');
  const [paperSubject, setPaperSubject] = useState<any>('Physics');
  const [paperStream, setPaperStream] = useState<any>('Maths');
  const [paperYear, setPaperYear] = useState<number>(2026);
  const [paperIsModel, setPaperIsModel] = useState<boolean>(true);
  const [paperSyllabus, setPaperSyllabus] = useState<'current' | 'old'>('current');
  const [paperType, setPaperType] = useState<any>('MCQ');
  const [paperMedium, setPaperMedium] = useState<any>('English');
  const [paperQuestionCount, setPaperQuestionCount] = useState<number>(50);
  const [paperDuration, setPaperDuration] = useState<number>(120);
  const [paperSize, setPaperSize] = useState<string>('3.2 MB');
  const [paperTags, setPaperTags] = useState<string>('Mechanics, Waves, Sound');
  const [paperHasExplanation, setPaperHasExplanation] = useState<boolean>(true);
  const [paperSuccess, setPaperSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
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

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) return;

    setSendingEmail(true);
    setBroadcastStatus(null);
    try {
      const res = await api.sendBroadcastEmail({
        subject: emailSubject,
        message: emailMessage,
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

  const handleCreatePastPaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperTitle.trim()) return;

    const newPaper: PastPaper = {
      id: `pp-${Date.now()}`,
      title: paperTitle.trim(),
      subject: paperSubject,
      stream: paperStream,
      year: Number(paperYear) || 2026,
      syllabus: paperSyllabus,
      type: paperType,
      medium: paperMedium,
      topicTags: paperTags.split(',').map((s) => s.trim()).filter(Boolean),
      hasExplanation: paperHasExplanation,
      questionCount: Number(paperQuestionCount) || 50,
      durationMinutes: Number(paperDuration) || 120,
      downloadSize: paperSize || '3.2 MB',
      isModelPaper: paperIsModel,
    };

    if (onAddPastPaper) {
      onAddPastPaper(newPaper);
    }
    setPaperSuccess(`Successfully added past paper: "${newPaper.title}"`);
    setPaperTitle('');
    setTimeout(() => setPaperSuccess(null), 5000);
  };

  const handleDownloadCsv = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://mindmaze-30xp.onrender.com/api';
    const token = getAuthToken();
    window.open(`${API_URL}/admin/export-csv?token=${token}`, '_blank');
  };

  const filteredUsers = (users || []).filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
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
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
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
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{broadcastStatus.error}</span>
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

              <button
                type="submit"
                disabled={sendingEmail}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#5b3eff] text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-500/25"
              >
                <Send className="w-4 h-4" />
                <span>{sendingEmail ? 'Dispatched Emails...' : 'Send Broadcast Email'}</span>
              </button>
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
                      <td colSpan={6} className="py-8 text-center text-slate-400">
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
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-medium">
                            {u.stream} ({u.physicalScienceElective || 'Chemistry'})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 font-bold text-amber-300">
                          {u.streakDays || 0}d
                        </td>
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleRole(u._id, u.role)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300 transition cursor-pointer"
                          >
                            {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u._id, u.isActive !== false)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              u.isActive !== false
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {u.isActive !== false ? 'Block' : 'Activate'}
                          </button>
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

      {/* Tab 2: Past Paper Manager & Creator */}
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
                  <label className="block text-xs font-bold text-slate-300 mb-1">Paper Title</label>
                  <input
                    type="text"
                    required
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. G.C.E. A/L Physics 2025 National Model Paper I (MCQ)"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
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

                {/* Question Count */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Question Count</label>
                  <input
                    type="number"
                    value={paperQuestionCount}
                    onChange={(e) => setPaperQuestionCount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={paperDuration}
                    onChange={(e) => setPaperDuration(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* File Size */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">PDF File Size</label>
                  <input
                    type="text"
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value)}
                    placeholder="e.g. 3.2 MB"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Topic Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tested Topic Tags (comma separated)</label>
                  <input
                    type="text"
                    value={paperTags}
                    onChange={(e) => setPaperTags(e.target.value)}
                    placeholder="e.g. Mechanics, Waves, Sound, Equilibrium"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
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

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={paperHasExplanation}
                    onChange={(e) => setPaperHasExplanation(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-white/10 border-white/20 focus:ring-0"
                  />
                  <span>Includes Step-by-Step AI Annotated Marking Scheme</span>
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
    </div>
  );
};
