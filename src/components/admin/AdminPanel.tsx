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
} from 'lucide-react';
import { api, getAuthToken } from '../../services/api';

interface AdminPanelProps {
  userRole?: string;
  username?: string | null;
  profileLoaded?: boolean;
  onNavigateHome?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  userRole = 'admin',
  onNavigateHome = () => {},
}) => {
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
              Manage students, course content, email notifications & analytics
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

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

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
    </div>
  );
};
