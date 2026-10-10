import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { CourseEnrollmentRecord } from '../courses/learning';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Eye,
  FileText,
  User,
  GraduationCap,
  Calendar,
  DollarSign,
  AlertCircle,
  Phone,
  MessageSquare,
  ShieldCheck,
  Award,
  ChevronRight,
  TrendingUp,
  Download,
  Filter,
} from 'lucide-react';

interface EnrollmentsManagerProps {
  onNavigateToCourse?: (courseId: string) => void;
}

export const EnrollmentsManager: React.FC<EnrollmentsManagerProps> = ({ onNavigateToCourse }) => {
  const [enrollments, setEnrollments] = useState<CourseEnrollmentRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Slip Preview Modal
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; fileName?: string; student: string } | null>(null);

  // Rejection Note Modal
  const [rejectingItem, setRejectingItem] = useState<CourseEnrollmentRecord | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const loadEnrollments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAdminEnrollments({
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(search ? { q: search } : {}),
      });
      setEnrollments(res.enrollments || []);
      if (res.stats) setStats(res.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load enrollment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEnrollments();
  };

  const handleApprove = async (enrollment: CourseEnrollmentRecord) => {
    if (!window.confirm(`Approve course access for "${enrollment.user?.name || 'this student'}"?`)) return;
    setActionBusy(enrollment._id);
    try {
      await api.updateEnrollmentStatus(enrollment._id, 'approved', 'Verified by admin');
      await loadEnrollments();
    } catch (err: any) {
      alert(err.message || 'Could not approve enrollment');
    } finally {
      setActionBusy(null);
    }
  };

  const submitReject = async () => {
    if (!rejectingItem) return;
    setActionBusy(rejectingItem._id);
    try {
      await api.updateEnrollmentStatus(
        rejectingItem._id,
        'rejected',
        rejectionNote.trim() || 'Bank payment slip could not be verified.'
      );
      setRejectingItem(null);
      setRejectionNote('');
      await loadEnrollments();
    } catch (err: any) {
      alert(err.message || 'Could not reject enrollment');
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async (enrollmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this enrollment record?')) return;
    setActionBusy(enrollmentId);
    try {
      await api.deleteEnrollment(enrollmentId);
      await loadEnrollments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    } finally {
      setActionBusy(null);
    }
  };

  // Filtered in memory for instant responsiveness
  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (subjectFilter && e.course?.subject !== subjectFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const u = e.user || {};
      const c = e.course || {};
      return (
        (u.name && u.name.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.indexNumber && u.indexNumber.toLowerCase().includes(s)) ||
        (c.title && c.title.toLowerCase().includes(s)) ||
        (e.bankReference && e.bankReference.toLowerCase().includes(s))
      );
    });
  }, [enrollments, statusFilter, subjectFilter, search]);

  return (
    <div className="learning-area enrollments-surface space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="enrollments-header rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur-md p-6 shadow-sm dark:shadow-xl flex items-center justify-between flex-wrap gap-4 transition">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40">
              Admin & Content Studio
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Payment Verification Desk</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Course Enrollments & Payments</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Inspect bank transfer slips uploaded by students, verify payments, approve course access, and monitor student learning progress.
          </p>
        </div>

        <button
          onClick={loadEnrollments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition cursor-pointer shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Enrollments */}
        <div className="enrollments-stat-card p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex items-center gap-4 transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="stat-total-label text-xs font-semibold text-slate-500 dark:text-slate-400">Total Enrollments</p>
            <p className="stat-total-val text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="enrollments-stat-pending p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 shadow-sm dark:shadow-lg flex items-center gap-4 relative overflow-hidden transition">
          {stats.pending > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          )}
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="stat-pending-label text-xs font-semibold text-amber-800 dark:text-amber-200">Pending Slip Reviews</p>
            <p className="stat-pending-val text-2xl font-black text-amber-600 dark:text-amber-300 mt-0.5">{stats.pending}</p>
          </div>
        </div>

        {/* Approved Active */}
        <div className="enrollments-stat-approved p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 shadow-sm dark:shadow-lg flex items-center gap-4 transition">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="stat-approved-label text-xs font-semibold text-emerald-800 dark:text-emerald-200">Active / Approved</p>
            <p className="stat-approved-val text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.approved}</p>
          </div>
        </div>

        {/* Total Paid Revenue */}
        <div className="enrollments-stat-card p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex items-center gap-4 transition">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-300 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="stat-revenue-label text-xs font-semibold text-slate-500 dark:text-slate-400">Total Paid Revenue</p>
            <p className="stat-revenue-val text-2xl font-black text-cyan-600 dark:text-cyan-300 mt-0.5">Rs. {stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="enrollments-filter-box p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-md space-y-3 transition">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </span>
            {(
              [
                { id: 'all', label: 'All Records', count: stats.total },
                { id: 'pending', label: 'Pending Verification', count: stats.pending, alert: stats.pending > 0 },
                { id: 'approved', label: 'Approved', count: stats.approved },
                { id: 'rejected', label: 'Declined', count: stats.rejected },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    tab.alert
                      ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                      : statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-black/30 text-slate-600 dark:text-slate-400 font-semibold'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="search"
                placeholder="Search student, index, course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Enrollments Listing */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 dark:text-indigo-400" />
          <p className="text-sm font-semibold">Loading enrollment records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="enrollments-empty-box p-12 text-center rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition">
          <CreditCard className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No enrollment records found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or clearing filters to see all enrollments.'
              : 'When students request course enrollments or upload bank deposit slips, they will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const user = item.user || {};
            const course = item.course || {};
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved';
            const isRejected = item.status === 'rejected';
            const isBusy = actionBusy === item._id;

            return (
              <div
                key={item._id}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  isPending
                    ? 'bg-amber-50/80 dark:bg-amber-950/15 border-amber-300 dark:border-amber-500/40 shadow-md shadow-amber-500/5 dark:shadow-amber-950/20'
                    : isApproved
                    ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    : 'bg-rose-50/80 dark:bg-rose-950/10 border-rose-300 dark:border-rose-500/30'
                }`}
              >
                <div className="grid lg:grid-cols-[1.2fr_1.2fr_1fr_auto] gap-5 items-start">
                  {/* Column 1: Student Information */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-300 dark:border-indigo-400/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs shrink-0">
                        {user.name ? user.name.slice(0, 1).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{user.name || 'Unknown Student'}</h4>
                        <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-300 font-bold">
                          {user.indexNumber || 'No Index'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pl-10">
                      <p className="truncate">✉ {user.email || 'No email'}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.whatsappNumber || user.mobileNumber || user.phone ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                            <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{user.whatsappNumber || user.mobileNumber || user.phone}</span>
                          </span>
                        ) : null}
                        {user.stream && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                            {user.stream}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Course & Learning Process */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/40">
                          {course.subject || 'Subject'}
                        </span>
                        {course.topic && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{course.topic}</span>}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{course.title || 'Course Lesson'}</h4>
                    </div>

                    {/* Student Learning Process Card (Progress, Quiz Score) */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Learning Progress:</span>
                        {item.learningProgress ? (
                          <span
                            className={`font-bold ${
                              item.learningProgress.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-300'
                            }`}
                          >
                            {item.learningProgress.completed ? '✓ Completed' : 'In Progress'}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Not started yet</span>
                        )}
                      </div>

                      {item.learningProgress?.quizScore != null && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Quiz Score:</span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-300">
                            {item.learningProgress.quizScore} / {item.learningProgress.quizTotal || 0}
                          </span>
                        </div>
                      )}

                      {item.learningProgress?.lastOpenedAt && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          Last active: {new Date(item.learningProgress.lastOpenedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Payment & Bank Slip Info */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Fee:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {item.isFree || item.amount === 0 ? 'FREE' : `Rs. ${(item.amount || 0).toLocaleString()}`}
                      </span>
                    </div>

                    {item.bankReference && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Deposit Ref:</span>
                        <span className="font-mono text-cyan-600 dark:text-cyan-300 font-bold">{item.bankReference}</span>
                      </div>
                    )}

                    {item.notes && (
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 text-[11px] text-slate-700 dark:text-slate-300 italic border border-slate-200 dark:border-slate-800">
                        "{item.notes}"
                      </div>
                    )}

                    {/* Slip preview trigger */}
                    {item.slipUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSlip({
                            url: item.slipUrl!,
                            fileName: item.slipFileName,
                            student: user.name || 'Student',
                          })
                        }
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Bank Slip ({item.slipFileName?.endsWith('.pdf') ? 'PDF' : 'Image'})</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block">No slip required (Free enrollment)</span>
                    )}

                    <div className="text-[10px] text-slate-400 dark:text-slate-500">
                      Enrolled: {new Date(item.enrolledAt || item.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Column 4: Verification Status & Actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {/* Status Badge */}
                    <div>
                      {isPending && (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm shadow-amber-500/20">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Pending Verification</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved & Active</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Declined</span>
                        </span>
                      )}
                    </div>

                    {item.adminNotes && (
                      <p className="text-[11px] text-slate-400 max-w-[200px] text-right italic">
                        Note: {item.adminNotes}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-auto">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApprove(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-600/30 flex items-center gap-1 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setRejectingItem(item);
                              setRejectionNote('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectingItem(item);
                            setRejectionNote('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 text-xs transition cursor-pointer"
                        >
                          Revoke Access
                        </button>
                      )}

                      {isRejected && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
                        >
                          Re-approve
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete record"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Bank Deposit Slip Full Preview */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Bank Deposit Slip — {selectedSlip.student}</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={selectedSlip.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-cyan-300 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Screen</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedSlip(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto flex-1 flex items-center justify-center bg-black/40">
              {selectedSlip.url.endsWith('.pdf') || selectedSlip.fileName?.endsWith('.pdf') ? (
                <iframe
                  src={selectedSlip.url}
                  title="Bank Deposit Slip PDF"
                  className="w-full h-[65vh] rounded-xl border border-slate-800 bg-white"
                />
              ) : (
                <img
                  src={selectedSlip.url}
                  alt="Bank Deposit Slip"
                  className="max-w-full max-h-[70vh] rounded-xl shadow-2xl object-contain border border-white/10"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Rejection Reason Prompt */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <span>Decline Enrollment Request</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Student: <span className="text-white font-semibold">{rejectingItem.user?.name}</span> •{' '}
                {rejectingItem.course?.title}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Reason for Declining (Visible to student)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Deposit slip image is blurry / Amount does not match course fee."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-rose-600/30"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
