import { normalizeBatch, useBatches } from '../../lib/batches';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StreamType } from '../../types';
import { X, Save, User as UserIcon, Calendar, Target, Phone, Clock, Award, Loader2 } from 'lucide-react';
import { validateName, validatePhone, validateYear } from '../../lib/validation';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onProfileUpdated: (updatedUser: any) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {

  const [name, setName] = useState(currentUser?.name || '');
  const [stream, setStream] = useState<StreamType>(currentUser?.stream || 'Physical Science');
  const [elective, setElective] = useState<'Chemistry' | 'ICT'>(currentUser?.physicalScienceElective || 'Chemistry');
  const batches = useBatches();
  const [targetExamYear, setTargetExamYear] = useState(normalizeBatch(currentUser?.targetExamYear));
  const [targetZScore, setTargetZScore] = useState(currentUser?.targetZScore || '');
  const [mobileNumber, setMobileNumber] = useState(currentUser?.mobileNumber || '');
  const [motivationNote, setMotivationNote] = useState(currentUser?.motivationNote || '');
  const [dailyHoursGoal, setDailyHoursGoal] = useState<number>(currentUser?.dailyHoursGoal || 4);
  const [weeklyHoursGoal, setWeeklyHoursGoal] = useState<number>(currentUser?.weeklyHoursGoal || 28);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (isOpen) setTargetExamYear(normalizeBatch(currentUser?.targetExamYear)); }, [isOpen, currentUser?.targetExamYear]);
  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameErr = validateName(name, 'Full Name');
    if (nameErr) {
      setError(nameErr);
      return;
    }

    const phoneErr = validatePhone(mobileNumber, false);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    if (targetExamYear) {
      const yearErr = validateYear(targetExamYear, 2000, 2035);
      if (yearErr) {
        setError(yearErr);
        return;
      }
    }

    try {
      setSaving(true);

      const res = await api.updateProfile({
        name,
        stream,
        physicalScienceElective: elective,
        targetExamYear,
        targetZScore,
        mobileNumber,
        motivationNote,
        dailyHoursGoal,
        weeklyHoursGoal,
      });

      onProfileUpdated(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-400" /> Edit Student Profile
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">A/L Stream</label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value as StreamType)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
              >
                <option value="Physical Science">Physical Science</option>
                <option value="Biological Science">Biological Science</option>
                <option value="Maths">Maths</option>
                <option value="Bio">Bio</option>
              </select>
            </div>

            {stream === 'Physical Science' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Elective Subject</label>
                <select
                  value={elective}
                  onChange={(e) => setElective(e.target.value as 'Chemistry' | 'ICT')}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                >
                  <option value="Chemistry">Chemistry</option>
                  <option value="ICT">ICT</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target A/L Batch</label>
              <select
                value={targetExamYear}
                onChange={(e) => setTargetExamYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none cursor-pointer"
              >
                {!batches.some(b=>b.year===targetExamYear)&&<option value={targetExamYear}>Batch {targetExamYear} (saved)</option>}{batches.map(b=><option key={b.year} value={b.year}>Batch {b.year}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Z-Score</label>
              <input
                type="text"
                value={targetZScore}
                onChange={(e) => setTargetZScore(e.target.value)}
                placeholder="e.g. 2.1500"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mobile Contact No. <span className="text-slate-500 font-normal">(10 digits)</span>
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setMobileNumber(digits);
              }}
              maxLength={10}
              placeholder="0771234567"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Daily Study Target (Hours)</label>
              <input
                type="number"
                min={1}
                max={24}
                value={dailyHoursGoal}
                onChange={(e) => setDailyHoursGoal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Weekly Target (Hours)</label>
              <input
                type="number"
                min={1}
                max={168}
                value={weeklyHoursGoal}
                onChange={(e) => setWeeklyHoursGoal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Motivation Motto</label>
            <input
              type="text"
              value={motivationNote}
              onChange={(e) => setMotivationNote(e.target.value)}
              placeholder="e.g. Work hard, aim for Engineering / Medicine!"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
