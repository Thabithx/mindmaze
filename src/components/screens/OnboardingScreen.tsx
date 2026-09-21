import React, { useState } from 'react';
import { MediumType, ScreenId, StreamType, SyllabusType, UserProfile } from '../../types';
import { SUBJECTS_BY_STREAM } from '../../data/mockData';
import {
  Compass,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calculator,
  Dna,
  Calendar,
  Layers,
  Award,
  Check,
  Globe,
  Target,
} from 'lucide-react';

interface OnboardingScreenProps {
  initialProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialProfile,
  onSaveProfile,
  onNavigate,
}) => {
  const [stream, setStream] = useState<StreamType>(initialProfile.stream);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    initialProfile.selectedSubjects.length > 0
      ? initialProfile.selectedSubjects
      : SUBJECTS_BY_STREAM[initialProfile.stream].slice(0, 3)
  );
  const [medium, setMedium] = useState<MediumType>(initialProfile.medium || 'English');
  const [targetGrade, setTargetGrade] = useState<string>(initialProfile.targetGrade);
  const [examYear, setExamYear] = useState<string>('2027');
  const [examDate, setExamDate] = useState<string>(initialProfile.examDate || '2027-11-15');
  const [syllabus, setSyllabus] = useState<SyllabusType>(initialProfile.syllabus);
  const [dailyGoalMCQs, setDailyGoalMCQs] = useState<number>(initialProfile.dailyGoalMCQs || 20);

  const streamsConfig = [
    {
      id: 'Maths' as StreamType,
      title: 'Physical Science (Maths)',
      desc: 'Combined Maths, Physics, Chemistry / ICT',
      icon: Calculator,
      color: 'border-blue-500/40 bg-blue-950/20 text-blue-400',
      badge: 'Engineering & Computing',
    },
    {
      id: 'Bio' as StreamType,
      title: 'Biological Science',
      desc: 'Biology, Chemistry, Physics / Agricultural Science',
      icon: Dna,
      color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400',
      badge: 'Medicine & Bioscience',
    },
  ];

  const targetGrades = [
    { grade: "3 A's", desc: 'University Entry & Faculty Merit Target', highlight: true },
    { grade: "2 A's 1 B", desc: 'High Z-Score & State University Placement', highlight: false },
    { grade: "1 A 2 B's", desc: 'Strong Academic Standing', highlight: false },
    { grade: "3 B's", desc: 'Solid Foundation Standard', highlight: false },
  ];

  const handleStreamChange = (newStream: StreamType) => {
    setStream(newStream);
    setSelectedSubjects(SUBJECTS_BY_STREAM[newStream].slice(0, 3));
  };

  const toggleSubject = (subj: string) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  const handleComplete = () => {
    const updated: UserProfile = {
      ...initialProfile,
      stream,
      selectedSubjects,
      targetGrade,
      examDate,
      syllabus,
      medium,
      dailyGoalMCQs,
      currentOnlyFilter: syllabus === 'current',
    };
    onSaveProfile(updated);
    onNavigate('dashboard');
  };

  return (
    <div id="mind-maze-onboarding-screen" className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/15 px-3.5 py-1 text-xs font-semibold text-purple-300 mb-3 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Customize Your A/L Study Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Set Your A/L Goals & Syllabus Track
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-xl mx-auto">
            Mind Maze adapts its MCQ difficulty, repeat-pattern predictions, and countdown targets based on your exact GCE A/L stream.
          </p>
        </div>

        {/* Step 1: Select Stream */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6B4EFF] font-bold text-white text-sm shadow-[0_0_10px_rgba(107,78,255,0.4)]">
              1
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Select Your GCE A/L Stream
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {streamsConfig.map((item) => {
              const Icon = item.icon;
              const isSelected = stream === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`onboarding-stream-${item.id.toLowerCase()}`}
                  onClick={() => handleStreamChange(item.id)}
                  className={`group relative flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-200 backdrop-blur-sm ${
                    isSelected
                      ? 'border-[#6B4EFF] bg-[#6B4EFF]/20 shadow-[0_0_15px_rgba(107,78,255,0.3)] ring-1 ring-[#6B4EFF]'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`p-2.5 rounded-xl border ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6B4EFF] text-white shadow-sm">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
                  <span className="mt-3 text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-400/30">
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Subject Picker */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-md mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#6B4EFF] font-bold text-white text-sm shadow-[0_0_10px_rgba(107,78,255,0.4)]">
              2
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Confirm Your 3 Primary Subjects
              </h2>
              <p className="text-xs text-slate-400">Select the 3 subjects you will sit for in A/L</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {SUBJECTS_BY_STREAM[stream]?.map((subj) => {
              const isSelected = selectedSubjects.includes(subj);
              const isLive = subj === 'Physics';
              return (
                <button
                  key={subj}
                  type="button"
                  id={`subject-toggle-${subj.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => toggleSubject(subj)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-cyan-400/50 bg-cyan-400/15 text-white font-semibold shadow-[0_0_10px_rgba(0,245,255,0.2)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-white">{subj}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                        isLive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      {isLive ? '⚡ Live' : '⏳ Coming Soon'}
                    </span>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-md flex items-center justify-center border shrink-0 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                        : 'border-white/20 bg-white/10'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-xs text-purple-200 flex items-center gap-2">
            <span className="text-base">⚡</span>
            <span>
              <strong>Physics MCQs & 2000–2026 Archive</strong> are 100% live right now. Other subjects will automatically unlock as new question banks launch!
            </span>
          </div>
        </div>

        {/* Step 3: Target Grade & Exam Date & Syllabus Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Target Grade */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 backdrop-blur-md flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6B4EFF] font-bold text-white text-xs shadow-[0_0_10px_rgba(107,78,255,0.4)]">
                  3
                </div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  Target Grade Goal
                </h3>
              </div>

              <div className="space-y-2.5">
                {targetGrades.map((tg) => {
                  const isSelected = targetGrade === tg.grade;
                  return (
                    <button
                      key={tg.grade}
                      type="button"
                      onClick={() => setTargetGrade(tg.grade)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-400/50 bg-amber-400/15 text-white shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-amber-300">{tg.grade}</div>
                        <div className="text-[11px] text-slate-400">{tg.desc}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Exam Date & Syllabus Toggle */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 backdrop-blur-md space-y-6 shadow-sm">
            {/* Exam Date */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6B4EFF] font-bold text-white text-xs shadow-[0_0_10px_rgba(107,78,255,0.4)]">
                  4
                </div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-300" />
                  A/L Exam Sitting
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {['2027 (Nov)', '2028 (Nov)'].map((opt) => {
                  const val = opt.includes('2027') ? '2027-11-15' : '2028-11-15';
                  const isSelected = examDate === val;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setExamDate(val)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-400/20 text-white shadow-[0_0_10px_rgba(0,245,255,0.2)]'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Exact Target Date:</span>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bg-[#161831] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Syllabus Toggle */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-400" />
                  <span className="font-bold text-sm text-white">Syllabus Mode</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {syllabus === 'current' ? 'Current (2019+ Curriculum)' : 'Old Syllabus'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-white/10 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setSyllabus('current')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    syllabus === 'current'
                      ? 'bg-[#6B4EFF] text-white shadow-[0_0_10px_rgba(107,78,255,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✨ Current Syllabus (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => setSyllabus('old')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    syllabus === 'old'
                      ? 'bg-purple-900/80 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📜 Old Syllabus
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {syllabus === 'current'
                  ? 'Filters out obsolete questions and emphasizes 2019–2026 exam blueprints.'
                  : 'Includes pre-2019 syllabus topics and older past papers (2000–2018).'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 4: Study Medium & Daily MCQ Goal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Study Medium */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <Globe className="h-5 w-5 text-cyan-400" />
              <h3 className="font-bold text-white text-base">Medium of Study</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Select your primary exam instruction medium for past paper explanations.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['English', 'Sinhala', 'Tamil'] as MediumType[]).map((med) => {
                const isSelected = medium === med;
                return (
                  <button
                    key={med}
                    type="button"
                    onClick={() => setMedium(med)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400/20 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {med}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily MCQ Goal */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <Target className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Daily Practice Target</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              How many MCQs would you like to target each day to build your streak?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((goal) => {
                const isSelected = dailyGoalMCQs === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setDailyGoalMCQs(goal)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-400/20 text-white shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div>{goal}</div>
                    <div className="text-[10px] font-normal text-slate-400">MCQs/day</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-center">
          <button
            id="btn-onboarding-complete"
            onClick={handleComplete}
            className="group flex items-center justify-center gap-3 w-full max-w-md rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] px-8 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(107,78,255,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span>Enter Study Dashboard</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
