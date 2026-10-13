import React, { useState } from 'react';
import { api } from '../../services/api';
import { Lesson, CourseEnrollmentRecord } from './learning';
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
  RefreshCw,
  PieChart,
  Calendar,
  Clock,
} from 'lucide-react';

interface CourseEnrollModalProps {
  course: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: 'approved' | 'pending') => void;
  existingEnrollment?: CourseEnrollmentRecord | null;
}

export const CourseEnrollModal: React.FC<CourseEnrollModalProps> = ({
  course,
  isOpen,
  onClose,
  onSuccess,
  existingEnrollment,
}) => {
  const isFree = course.isFree || !course.price || course.price <= 0;
  const isReapplying = existingEnrollment?.status === 'rejected';

  const [paymentType, setPaymentType] = useState<'full' | 'partial'>(
    existingEnrollment?.paymentType === 'partial' ? 'partial' : 'full'
  );
  const [amountPaid, setAmountPaid] = useState<string>(() => {
    if (existingEnrollment?.amountPaid) return String(existingEnrollment.amountPaid);
    return course.price ? String(course.price) : '';
  });
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState(existingEnrollment?.bankReference || '');
  const [notes, setNotes] = useState(existingEnrollment?.notes || '');
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

    if (!isFree && paymentType === 'partial') {
      const parsed = Number(amountPaid);
      if (isNaN(parsed) || parsed <= 0) {
        setError('Please enter a valid partial payment amount in Rupees.');
        return;
      }
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
        formData.append('paymentType', paymentType);
        formData.append('amountPaid', paymentType === 'partial' ? amountPaid : String(course.price || 0));
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
          {/* Rejection Alert Banner if Student is Re-applying */}
          {isReapplying && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Previous Enrollment Request Declined</span>
              </div>
              <p className="text-slate-200 leading-relaxed bg-black/30 p-2.5 rounded-lg border border-rose-500/20">
                <strong className="text-white">Admin Note:</strong>{' '}
                {existingEnrollment?.adminNotes || 'Payment slip could not be verified. Please check the deposit details and re-upload.'}
              </p>
              <p className="text-[11px] text-amber-300 font-medium">
                💡 You can upload a new or corrected bank deposit slip below to re-submit your enrollment for approval.
              </p>
            </div>
          )}

          {/* Expired Subscription Alert */}
          {existingEnrollment?.isExpired && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Subscription Expired</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Your previous access period has expired. Upload your latest deposit slip to renew access for the new session.
              </p>
            </div>
          )}

          {/* Target Month & Validity Badges */}
          {(course.targetMonth || course.validityPeriod) && (
            <div className="flex items-center gap-2 flex-wrap">
              {course.targetMonth && (
                <span className="px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Target Month: <strong>{course.targetMonth}</strong></span>
                </span>
              )}
              {course.validityPeriod && (
                <span className="px-3 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Access Validity:{' '}
                    <strong>
                      {course.validityPeriod === '1_month'
                        ? '1 Month (30 Days)'
                        : course.validityPeriod === '3_months'
                        ? '3 Months (90 Days)'
                        : course.validityPeriod === '6_months'
                        ? '6 Months (180 Days)'
                        : course.validityPeriod === '1_year'
                        ? '1 Year (365 Days)'
                        : 'Lifetime Access'}
                    </strong>
                  </span>
                </span>
              )}
            </div>
          )}

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
              <p className="text-slate-300 leading-relaxed">
                Click the <strong>Enroll for Free Now</strong> button below to enroll immediately. You will be registered and gain instant access to all videos, PDF notes, and practice quizzes.
              </p>
            </div>
          ) : (
            /* If Course is PAID */
            <>
              {/* Payment Methods (Fully Paid vs Partially Paid) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Payment Option:</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('full');
                      setAmountPaid(String(course.price || 0));
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      paymentType === 'full'
                        ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Full Payment</span>
                      {paymentType === 'full' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Rs. {(course.price || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">Complete course fee</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('partial');
                      if (!amountPaid || amountPaid === String(course.price)) {
                        setAmountPaid(String(Math.round((course.price || 0) / 2)));
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      paymentType === 'partial'
                        ? 'bg-amber-600/20 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Partial Payment</span>
                      {paymentType === 'partial' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300">Installment / Advance</span>
                    <span className="text-[10px] text-slate-400">Pay part now, rest later</span>
                  </button>
                </div>

                {/* Partial Amount Input */}
                {paymentType === 'partial' && (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-200">
                        Amount Paid in this Slip (Rs.) <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Total Fee: Rs. {(course.price || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={course.price || undefined}
                        required
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="e.g. 2500"
                        className="w-full rounded-xl border border-amber-500/50 bg-slate-950 pl-10 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Remaining balance:{' '}
                      <strong className="text-amber-300 font-mono">
                        Rs. {Math.max(0, (course.price || 0) - (Number(amountPaid) || 0)).toLocaleString()}
                      </strong>{' '}
                      to be settled later.
                    </p>
                  </div>
                )}
              </div>

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
                  <span>
                    {isFree
                      ? 'Enroll for Free Now'
                      : isReapplying
                      ? 'Re-submit Bank Slip & Re-apply'
                      : 'Submit Bank Slip & Enroll'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
