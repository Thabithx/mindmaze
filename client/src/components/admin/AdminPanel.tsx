import {Pagination} from '../common/Pagination';
import {usePagedResource,usePaperFilters} from '../../hooks/usePagedResource';
import {usePagination} from '../../hooks/usePagination';
import { PAPER_STREAMS, paperStreams as getPaperStreams } from '../../lib/paperStreams';
import { MarkingSchemeUpload } from './MarkingSchemeUpload';
import { setBatches } from '../../lib/batches';
import { PaperQuizEditor } from './PaperQuizEditor';
import { PracticePublisher } from './PracticePublisher';
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
  Pencil,
  Sparkles,
  Layers,
  Globe,
} from 'lucide-react';
import { api, getAuthToken } from '../../services/api';
import { PastPaper } from '../../types';
import { validateRequired, validateYear } from '../../lib/validation';

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
  userRole = 'student',
  onNavigateHome = () => {},
  pastPapers = [],
  onAddPastPaper,
  onDeletePastPaper,
}) => {
  const isAdmin=userRole==='admin';
  const canManageContent=isAdmin||userRole==='content_manager';
  const [roleUpdating,setRoleUpdating]=useState<string|null>(null);
  const [activeTab, setActiveTab] = useState<'directory' | 'pastpapers' | 'quiz'>(isAdmin?'directory':'pastpapers');
  const [users, setUsers] = useState<any[]>([]);
  const [verificationTarget,setVerificationTarget]=useState<any>(null);
  const [verificationMethod,setVerificationMethod]=useState<'call'|'whatsapp'>('call');
  const [verificationBusy,setVerificationBusy]=useState(false);
  const [verificationError,setVerificationError]=useState('');
  const submitVerification=async(e:React.FormEvent)=>{
    e.preventDefault();if(verificationBusy||!verificationTarget)return;
    setVerificationBusy(true);setVerificationError('');
    try {const r=await api.manuallyVerifyUser(verificationTarget._id,{phone:verificationTarget.whatsappNumber||verificationTarget.mobileNumber||verificationTarget.phoneNumber||verificationTarget.phone,method:verificationMethod});setUsers(prev=>prev.map(u=>u._id===r.user._id?r.user:u));setVerificationTarget(null);}
    catch(e:any){setVerificationError(e.message||'Could not verify account.');}finally{setVerificationBusy(false);}
  };
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<{ success?: string; error?: string } | null>(null);

  // Global Exam Dates State for 2 batches (stored in MongoDB via admin API)
  const [batchYear1,setBatchYear1]=useState('2027');
  const [batchYear2,setBatchYear2]=useState('2028');
  const [adminExamDate2027, setAdminExamDate2027] = useState('2027-11-25');
  const [adminExamDate2028, setAdminExamDate2028] = useState('2028-11-25');
  const [examDateSaving, setExamDateSaving] = useState(false);
  const [examDateSavedMsg, setExamDateSavedMsg] = useState<{ success?: string; error?: string } | null>(null);

  const fetchExamDate = async () => {
    try {
      const res = await api.getAdminExamDate();
      if(res.batches){setBatchYear1(res.batches[0].year);setBatchYear2(res.batches[1].year);setAdminExamDate2027(res.batches[0].examDate);setAdminExamDate2028(res.batches[1].examDate);}
    } catch {
      // fail silently
    }
  };

  const handleSaveGlobalExamDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminExamDate2027 && !adminExamDate2028) {
      setExamDateSavedMsg({ error: 'Please select at least one valid exam date.' });
      return;
    }
    try {
      setExamDateSaving(true);
      setExamDateSavedMsg(null);
      const result=await api.setAdminExamDate({batches:[{year:batchYear1,examDate:adminExamDate2027},{year:batchYear2,examDate:adminExamDate2028}]});
      setBatches(result.batches);
      setExamDateSavedMsg({success:'Batch years and exam dates saved.'});
      setTimeout(() => setExamDateSavedMsg(null), 5000);
    } catch (err: any) {
      setExamDateSavedMsg({ error: err?.message || 'Failed to save exam dates.' });
    } finally {
      setExamDateSaving(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState('all');
  const usersPage=usePagedResource<any>('/admin/users','users',{q:searchTerm,stream:streamFilter},undefined,userRole==='admin'&&activeTab==='directory');
  useEffect(()=>setUsers(usersPage.items),[usersPage.items]);
  const facets=usePaperFilters();

  const [paperSearch, setPaperSearch] = useState('');
  const [paperFilters, setPaperFilters] = useState({subject:'',stream:'',year:'',medium:'',type:'',syllabus:''});
  const clearPaperFilters = () => {
    setPaperSearch('');
    setPaperFilters({subject:'',stream:'',year:'',medium:'',type:'',syllabus:''});
  };
  const paperFilterOptions = [
    {key:'subject', label:'Subject', values:facets.subjects},
    {key:'stream', label:'Stream', values:PAPER_STREAMS},
    {key:'year', label:'Year', values:facets.years.map(String)},
    {key:'medium', label:'Medium', values:facets.mediums},
    {key:'type', label:'Paper type', values:['MCQ','Structured','Essay']},
    {key:'syllabus', label:'Syllabus', values:['current','old']},
  ] as const;
  const papersPage=usePagedResource<PastPaper>('/past-papers','papers',{q:paperSearch,...paperFilters},'mindmaze_papers_updated',canManageContent&&activeTab==='pastpapers');
  const filteredAdminPapers=papersPage.items;
  const hasPaperFilters = Boolean(paperSearch || Object.values(paperFilters).some(Boolean));

  // Simplified Past Paper Form State
  const [paperTitle, setPaperTitle] = useState('');
  const [paperSubject, setPaperSubject] = useState<any>('Physics');
  const [paperStreams, setPaperStreams] = useState<string[]>(['Maths']);
  const [paperYear, setPaperYear] = useState<number>(2026);
  const [paperIsModel, setPaperIsModel] = useState<boolean>(true);
  const [paperSyllabus, setPaperSyllabus] = useState<'current' | 'old'>('current');
  const [paperType, setPaperType] = useState<any>('MCQ');
  const [paperMedium, setPaperMedium] = useState<any>('English');
  const [markingPdf,setMarkingPdf]=useState<File|null>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [paperPdfName, setPaperPdfName] = useState<string>('');
  const [paperCalculatedSize, setPaperCalculatedSize] = useState<string>('3.2 MB');
  const [editingPaper, setEditingPaper] = useState<PastPaper | null>(null);
  const [paperToEdit, setPaperToEdit] = useState<PastPaper | null>(null);
  const [paperFormKey, setPaperFormKey] = useState(0);
  const resetPaperForm = () => {
    setPaperError(null); setPaperToEdit(null); setPaperTitle(''); setPaperSubject('Physics'); setPaperStreams(['Maths']);
    setPaperYear(2026); setPaperIsModel(true); setPaperSyllabus('current'); setPaperType('MCQ'); setPaperMedium('English');
    setSelectedPdfFile(null); setMarkingPdf(null); setPaperPdfName(''); setPaperFormKey(k=>k+1);
  };
  const startEditingPaper = (paper: PastPaper) => {
    setPaperError(null); setPaperToEdit(paper); setPaperTitle(paper.title); setPaperSubject(paper.subject);
    setPaperStreams(paper.streams?.length ? [...paper.streams] : paper.stream==='Both'?['Maths','Bio']:[paper.stream==='Physical Science'?'Maths':paper.stream==='Biological Science'?'Bio':paper.stream||'Non-stream']);
    setPaperYear(paper.year); setPaperIsModel(Boolean(paper.isModelPaper)); setPaperSyllabus(paper.syllabus);
    setPaperType(paper.type); setPaperMedium(paper.medium); setSelectedPdfFile(null); setMarkingPdf(null);
    setPaperPdfName(''); setPaperSuccess(null); setPaperFormKey(k=>k+1);
    document.getElementById('past-paper-form')?.scrollIntoView({behavior:'smooth',block:'start'});
    document.getElementById('past-paper-title')?.focus({preventScroll:true});
  };
  const [publishingPaper, setPublishingPaper] = useState(false);
  const [paperError, setPaperError] = useState<string | null>(null);
  const [paperSuccess, setPaperSuccess] = useState<string | null>(null);


  useEffect(() => {
    if(isAdmin){fetchAdminData();fetchExamDate();}
    else {setUsers([]);setStats(null);setError(null);setLoading(false);setActiveTab('pastpapers');}
  }, [isAdmin]);

  const fetchAdminData = async () => {
    if(!isAdmin)return;
    setLoading(true);
    setError(null);
    try {
      usersPage.reload();
      const statsRes=await api.getAdminStats();
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

  const handleToggleRole = async (userId: string, newRole: string) => {
    if(!isAdmin||roleUpdating)return;
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      setRoleUpdating(userId);
      await api.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    } finally {setRoleUpdating(null);}
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"? This will delete all their study tasks, timetables, and progress data.`)) {
      return;
    }

    try {
      await api.deleteUser(userId);
      usersPage.reload();
      void fetchAdminData();
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

  const handleCreatePastPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const titleErr = validateRequired(paperTitle, 'Paper Title', 3);
    if (titleErr) {
      alert(titleErr);
      return;
    }

    if (!selectedPdfFile && !paperToEdit) {
      alert('Please upload or select a Past Paper PDF file to publish.');
      return;
    }

    const yearErr = validateYear(paperYear, 2000, 2100);
    if (yearErr) {
      alert(yearErr);
      return;
    }

    if (publishingPaper) return;
    setPublishingPaper(true);
    setPaperError(null);
    setPaperSuccess(null);
    try {
      if(!paperStreams.length) throw new Error('Select at least one target stream.');
      const data = new FormData();
      if(selectedPdfFile) data.append('pdfFile', selectedPdfFile);
      Object.entries({title: paperTitle.trim(), subject: paperSubject, streams: JSON.stringify(paperStreams), year: String(paperYear), syllabus: paperSyllabus, type: paperType, medium: paperMedium, isModelPaper: String(paperIsModel)}).forEach(([key, value]) => data.append(key, value));
      const {paper} = paperToEdit ? await api.updatePastPaper(paperToEdit.id, data) : await api.createPastPaper(data);
      if(!paperToEdit) onAddPastPaper?.(paper);
      let notice=(paperToEdit?'Updated: ':'Published: ')+paper.title;
      if(markingPdf){try{await api.uploadMarkingScheme(paper.id,markingPdf);notice+=' (marking scheme included)';}catch(e:any){notice+=' - marking scheme was not saved: '+e.message+'. Use Add marking scheme PDF in the published list to retry.';}}
      window.dispatchEvent(new Event('mindmaze_papers_updated'));
      setPaperSuccess(notice);setMarkingPdf(null);
      resetPaperForm();
    } catch (err: any) {
      setPaperError(err.message || 'Could not save the PDF. Please try again.');
    } finally { setPublishingPaper(false); }
  };


  const handleDownloadCsv = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://mindmaze-30xp.onrender.com/api';
    const token = getAuthToken();
    window.open(`${API_URL}/admin/export-csv?token=${token}`, '_blank');
  };

  const filteredUsers = users;
  if(!canManageContent)return <p role="alert">Access restricted.</p>;

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
              {isAdmin?'Admin Command Center':'Content Manager'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin?'Manage students, add past papers, send email broadcasts & inspect analytics':'Manage PDF lessons, quizzes, past papers and marking schemes'}
            </p>
          </div>
        </div>

        {isAdmin&&<div className="flex flex-wrap items-center gap-2">
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
        </div>}
      </div>

      {/* Control Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
        {isAdmin&&<button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-[#6B4EFF] text-white shadow-lg shadow-purple-500/25'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Directory & Email Broadcast</span>
        </button>}

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
            Papers
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
          <span>Practice Quiz Publisher</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
            Daily · Weekly
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
      {isAdmin && activeTab === 'directory' && (
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

          {/* ── Upcoming Exam Dates (Admin Sets for Both 2027 & 2028 Batches) ── */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-amber-500/20 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Set Batch Years and Exam Dates </span>
              </h3>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-400/30 text-amber-300">
                2 Batches Active
              </span>
            </div>
            <form onSubmit={handleSaveGlobalExamDate} className="space-y-4">
              <p className="text-xs text-slate-400">Set the two batches shown in countdowns and exam-year choices. Existing students keep their saved exam year.</p>
              <div className="grid grid-cols-2 gap-4">{[{value:batchYear1,set:setBatchYear1},{value:batchYear2,set:setBatchYear2}].map((b,i)=><label key={i} className="text-sm text-slate-300">Batch {i+1} year<input required aria-label={'Batch '+(i+1)+' year'} type="number" min="2000" max="2099" value={b.value} onChange={e=>b.set(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-white/20 p-2"/></label>)}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-300">
                      Batch {batchYear1} Exam Date <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">Batch {batchYear1}</span>
                  </div>
                  <input
                    type="date"
                    value={adminExamDate2027}
                    onChange={(e) => setAdminExamDate2027(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-400/30 text-white text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                    required
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-cyan-300">
                      Batch {batchYear2} Exam Date <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">Batch {batchYear2}</span>
                  </div>
                  <input
                    type="date"
                    value={adminExamDate2028}
                    onChange={(e) => setAdminExamDate2028(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-400/30 text-white text-sm focus:outline-none focus:border-cyan-400 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={examDateSaving || (!adminExamDate2027 && !adminExamDate2028)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white text-sm font-bold transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {examDateSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Both Batches...</span>
                    </>
                  ) : (
                    <span>Save Exam Dates</span>
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
                    <p className="text-amber-300 text-xs font-bold">Setup Required : Add one of these to Render Environment Variables:</p>
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
                  placeholder="e.g. New Combined Maths and Physics Past Papers Uploaded!"
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
                <span>Registered Student Directory ({usersPage.pagination.total})</span>
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
              {verificationTarget&&<div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="manual-verification-title">
 <form onSubmit={submitVerification} className="w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900 p-6 space-y-4 text-left whitespace-normal">
 <h2 id="manual-verification-title" className="text-xl font-bold text-white">Verify account manually</h2>
 <p className="text-slate-300">Confirm that you contacted {verificationTarget.name} and checked ownership of their registered number.</p>
 <p className="text-sm text-white break-all">{verificationTarget.email}<br/>{verificationTarget.whatsappNumber||verificationTarget.mobileNumber||verificationTarget.phoneNumber||verificationTarget.phone||'No registered number'}</p>
 <label className="block text-sm">Verification method<select autoFocus disabled={verificationBusy} value={verificationMethod} onChange={e=>setVerificationMethod(e.target.value as 'call'|'whatsapp')} className="block mt-2 p-2 rounded bg-slate-950 w-full"><option value="call">Phone call</option><option value="whatsapp">WhatsApp</option></select></label>
 <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={verificationBusy}/>I confirmed that this student owns the registered phone number.</label>
 {verificationError&&<p role="alert" className="text-rose-300 text-sm">{verificationError}</p>}
 <div className="flex justify-end gap-3"><button type="button" disabled={verificationBusy} onClick={()=>setVerificationTarget(null)}>Cancel</button><button type="submit" disabled={verificationBusy||!(verificationTarget.whatsappNumber||verificationTarget.mobileNumber||verificationTarget.phoneNumber||verificationTarget.phone)} className="rounded-lg bg-emerald-600 px-4 py-2 disabled:opacity-40">{verificationBusy?'Verifying…':'Confirm verification'}</button></div>
 </form></div>}
 {usersPage.error&&<p role="alert" className="p-4 text-rose-300">{usersPage.error} <button onClick={usersPage.reload}>Retry</button></p>}
 <Pagination {...usersPage.pagination} label="Registered users"/>
 <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Verification</th>
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
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        {usersPage.loading?'Loading users…':usersPage.error?'Unable to load users. Please retry.':'No matching registered students found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <tr key={u._id} className="hover:bg-white/5 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div><span className="mr-2 text-slate-400">{(usersPage.pagination.page-1)*usersPage.pagination.pageSize+i+1}.</span>{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-emerald-400 text-[11px] whitespace-nowrap">
                          {u.whatsappNumber || u.mobileNumber || u.phoneNumber || u.phone || "—"}
                        </td>
                        <td className="py-3.5 px-4"><span className={u.accountVerified||u.telegramVerified?'text-emerald-300':'text-amber-300'}>{u.manuallyVerified?'Verified by admin':u.telegramVerified?'Verified (Telegram)':u.telegramVerificationRequired?'Verification required':'Not verified (optional)'}</span>{u.manuallyVerified&&u.manualVerification&&<div className="text-xs text-slate-400 mt-1">{u.manualVerification.approvedByName} · {new Date(u.manualVerification.approvedAt).toLocaleString()} · {u.manualVerification.method==='call'?'Phone call':'WhatsApp'}</div>}</td>
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
                            {u.role==='content_manager'?'Content Manager':u.role || 'student'}
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
                            {!(u.accountVerified||u.telegramVerified)&&u.isActive!==false&&<button type="button" className="px-3 py-1.5 rounded-xl border border-emerald-400/40 text-emerald-300 text-xs" onClick={()=>{setVerificationTarget(u);setVerificationMethod('call');setVerificationError('');}}>Verify manually</button>}
                            <select aria-label={'Role for '+u.name} value={u.role||'student'} disabled={roleUpdating!==null} onChange={e=>handleToggleRole(u._id,e.target.value)} className="rounded-xl bg-slate-900 border border-white/20 px-3 py-2 text-xs text-white disabled:opacity-50"><option value="student">Student</option><option value="content_manager">Content Manager</option><option value="admin">Admin</option></select>

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
                <span>{paperToEdit ? 'Edit Past Paper' : 'Upload / Add Past Paper'}</span>
              </h3>
              <span className="text-xs text-slate-400">Pushes directly to student Past Papers page</span>
            </div>

            {paperError && <div role="alert" className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{paperError}</div>}
            {paperSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{paperSuccess}</span>
              </div>
            )}

            <form id="past-paper-form" onSubmit={handleCreatePastPaper} className="space-y-4">
              <fieldset disabled={publishingPaper} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Paper Title <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    required
                    id="past-paper-title"
                    aria-label="Paper Title"
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. G.C.E. A/L Physics 2025 Past Paper I (MCQ)"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* PDF Drag & Drop Upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {paperToEdit ? 'Replace PDF (optional — leave empty to keep the current file)' : 'Upload / Drop Past Paper PDF Document *'}
                  </label>
                  <div className="relative border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-2xl p-6 text-center bg-white/5 transition-all cursor-pointer">
                    <input
                      key={paperFormKey}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if(file.size>25*1024*1024){setPaperError('The PDF exceeds the application limit of 25 MiB. Compress it before uploading.');e.target.value='';setSelectedPdfFile(null);setPaperPdfName('');return;}
                          setPaperError(null);
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
                          <p className="text-[10px] text-slate-400">PDF files up to 25 MiB. Your storage account may have a lower limit.</p>
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

                <fieldset><legend className="text-xs font-bold text-slate-300 mb-2">Target streams — select all that apply</legend>
                  {['Maths','Bio','Non-stream'].map(stream=><label key={stream} className="flex gap-2 text-sm text-slate-300 mb-2"><input type="checkbox" checked={paperStreams.includes(stream)} onChange={e=>setPaperStreams(prev=>e.target.checked?[...prev,stream]:prev.filter(s=>s!==stream))}/>{stream==='Non-stream'?stream:stream+' Stream'}</label>)}
                  {!paperStreams.length&&<p className="text-xs text-rose-300">Select at least one target stream.</p>}
                </fieldset>

                <label className="block text-xs text-slate-300">Marking scheme PDF (optional, up to 25 MiB)<input key={paperFormKey} type="file" accept="application/pdf,.pdf" disabled={publishingPaper} onChange={e=>{const file=e.target.files?.[0]||null;if(file&&file.size>25*1024*1024){alert('Maximum marking scheme size is 25 MiB.');e.target.value='';setMarkingPdf(null);return;}setMarkingPdf(file);}} className="block mt-2"/><span>{markingPdf?.name||'You can also add it later from the published papers list.'}</span></label>
                {/* Examination Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Exam / Practice Year</label>
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2100}
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
                  <span>Mark as Official Past Paper</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={publishingPaper}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold transition shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{publishingPaper ? (paperToEdit ? 'Saving...' : 'Publishing...') : (paperToEdit ? 'Save changes' : 'Publish Past Paper')}</span>
              </button>
              {paperToEdit && <button type="button" onClick={()=>{resetPaperForm();setPaperSuccess(null);}} className="px-4 py-2 rounded-xl border border-white/20 text-sm text-slate-200">Cancel</button>}
              </fieldset>
            </form>
          </div>

          {editingPaper && <PaperQuizEditor paperId={editingPaper.id} title={editingPaper.title} onClose={() => setEditingPaper(null)} onSaved={() => window.dispatchEvent(new Event('mindmaze_papers_updated'))} />}
          {/* Past Papers List */}
          <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-300" />
              <span>Published Past Papers Library ({papersPage.pagination.total})</span>
            </h3>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Search papers
                <input type="search" value={paperSearch} onChange={e=>setPaperSearch(e.target.value)} placeholder="Search by title, subject or year" className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" />
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {paperFilterOptions.map(({key,label,values})=>(
                  <label key={key} className="block text-xs font-semibold text-slate-300">
                    {label}
                    <select value={paperFilters[key]} onChange={e=>setPaperFilters(prev=>({...prev,[key]:e.target.value}))} className="mt-1 w-full rounded-xl bg-[#1e2042] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400">
                      <option value="">All</option>
                      {values.map(value=><option key={value} value={value}>{key==='syllabus' ? (value==='current'?'Current (2019+)':'Old (pre-2019)') : value}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                <span role="status">{papersPage.pagination.total} matching papers</span>
                {papersPage.error&&<p role="alert" className="text-rose-300">{papersPage.error} <button onClick={papersPage.reload}>Retry</button></p>}
                <Pagination {...papersPage.pagination} label="Published papers"/>
                {hasPaperFilters && <button type="button" onClick={clearPaperFilters} className="rounded-lg border border-white/20 px-3 py-2 text-cyan-300 hover:bg-white/5">Clear filters</button>}
              </div>
            </div>

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
                  {filteredAdminPapers.length===0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{papersPage.loading?'Loading papers…':papersPage.error?'Unable to load papers. Please retry.':'No papers match your search and filters.'}</td></tr>}
                  {filteredAdminPapers.map((paper, i) => (
                    <tr key={paper.id} className="hover:bg-white/5 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span><span className="mr-2 text-slate-400">{(papersPage.pagination.page-1)*papersPage.pagination.pageSize+i+1}.</span>{paper.title}</span>
                          {paper.isModelPaper && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9px] font-bold">Official Past Paper</span>
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
                        <button type="button" disabled={publishingPaper} onClick={() => startEditingPaper(paper)} aria-label={'Edit '+paper.title} className="mb-2 ml-auto flex items-center gap-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 text-cyan-300 disabled:opacity-50"><Pencil className="w-3 h-3"/>Edit</button>
                        <MarkingSchemeUpload paper={paper}/>
                        {paper.type === 'MCQ' && <button type="button" onClick={() => setEditingPaper(paper)} className="mb-2 rounded-lg bg-indigo-600 px-3 py-2 text-white">Edit MCQ questions</button>}
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

      {/* Tab 3: Practice Quiz Publisher (Weekly Century / Daily Spark) */}
      {activeTab === 'quiz' && <PracticePublisher />}
    </div>
  );
};
