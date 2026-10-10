import React, { useState } from 'react';
import { api } from '../../services/api';
import { Lesson } from './learning';
import {
  CreditCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Lock,
  Sparkles,
  Loader2,
  X,
  Building,
} from 'lucide-react';

interface CourseEnrollModalProps {
  course: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: 'approved' | 'pending') => void;
}

export const CourseEnrollModal: React.FC<CourseEnrollModalProps> = ({
  course,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isFree = course.isFree || !course.price || course.price <= 0;
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyBank = () => {
    if (course.bankDetails) {
      navigator.clipboard.writeText(course.bankDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setError('Slip file size must be less than 15 MB.');
        return;
      }
      setSlipFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFree && !slipFile) {
      setError('Please upload your bank deposit receipt / transfer screenshot.');
      return;
    }

    setBusy(true);
    try {
      if (isFree) {
        // Free enrollment
        const res = await api.enrollInCourse(course._id);
        onSuccess(res.status || 'approved');
      } else {
        // Paid enrollment with slip upload
        const formData = new FormData();
        formData.append('slipFile', slipFile!);
        if (bankReference.trim()) formData.append('bankReference', bankReference.trim());
        if (notes.trim()) formData.append('notes', notes.trim());

        const res = await api.enrollInCourse(course._id, formData);
        onSuccess(res.status || 'pending');
      }
    } catch (err: any) {
      setError(err.message || 'Could not process enrollment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                {course.subject} • {course.topic}
              </span>
              <h3 className="text-base font-bold text-white leading-tight">{course.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Fee / Price Banner */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Course Access Fee:</span>
              <p className="text-2xl font-black text-white mt-0.5">
                {isFree ? (
                  <span className="text-emerald-400">FREE COURSE</span>
                ) : (
                  <span className="text-amber-300">Rs. {course.price?.toLocaleString()}</span>
                )}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isFree
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isFree ? 'Instant Access' : 'Bank Deposit'}
            </span>
          </div>

          {/* If Course is FREE */}
          {isFree ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>This course is completely free for all Mind Maze students!</span>
              </p>
              <p className="text-slate-300">
                Click the button below to enroll instantly. You will unlock all videos, PDF study notes, and quizzes immediately.
              </p>
            </div>
          ) : (
            /* If Course is PAID */
            <>
              {/* Bank Details Box */}
              <div className="rounded-xl border border-indigo-500/30 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    <span>Bank Transfer Details</span>
                  </span>
                  {course.bankDetails && (
                    <button
                      type="button"
                      onClick={handleCopyBank}
                      className="text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Info'}</span>
                    </button>
                  )}
                </div>

                <div className="text-xs font-mono text-slate-300 whitespace-pre-line leading-relaxed bg-black/40 p-3 rounded-lg border border-slate-800">
                  {course.bankDetails || 'Bank: Commercial Bank | Account: 8009234567 | Name: Mind Maze'}
                </div>
              </div>

              {/* Upload Bank Slip */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Upload Bank Deposit Receipt / Transfer Slip <span className="text-rose-400">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl p-5 text-center transition bg-slate-950/40">
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-7 h-7 text-cyan-400" />
                    {slipFile ? (
                      <div>
                        <p className="text-sm font-bold text-white">{slipFile.name}</p>
                        <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                          ✓ Ready to upload ({(slipFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-white">Click or drag deposit slip here</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Supports JPG, PNG photos or PDF receipts (up to 15 MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Reference & Notes */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Reference No. / Depositor Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REF-8921 or Your Name"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Optional Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid from HNB Online Banking"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={busy}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-lg flex items-center gap-2 disabled:opacity-50 ${
                isFree
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isFree ? 'Enrolling...' : 'Uploading Slip & Enrolling...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isFree ? 'Enroll for Free Now' : 'Submit Bank Slip & Enroll'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
