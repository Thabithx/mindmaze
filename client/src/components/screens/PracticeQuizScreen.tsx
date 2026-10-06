import React, { useEffect, useMemo, useState } from 'react';
import {
  Zap, CalendarDays, ArrowLeft, ArrowRight, ChevronRight, CheckCircle2, XCircle, BookmarkCheck,
  Lightbulb, RotateCcw, Award, Loader2, Trophy, FileText,
} from 'lucide-react';
import { MistakeItem, PracticeCategory, PracticeReview, PracticeSetSummary, PracticeStudentQuestion, ScreenId, UserProfile } from '../../types';
import { api, practiceImageUrl } from '../../services/api';
import { usePagedResource } from '../../hooks/usePagedResource';
import { Pagination } from '../common/Pagination';
import { SubjectIcon } from '../common/SubjectIcon';
import { PRACTICE_CATEGORY_INFO, PRACTICE_SUBJECTS, formatPublishDate } from '../../lib/practice';

interface PracticeQuizScreenProps {
  userProfile?: UserProfile;
  onNavigate: (screen: ScreenId) => void;
  onSaveMistake: (mistake: MistakeItem) => void;
}

type View =
  | { step: 'hub' }
  | { step: 'subjects'; category: PracticeCategory }
  | { step: 'sets'; category: PracticeCategory; subject: string }
  | { step: 'play'; category: PracticeCategory; subject: string; setId: string };

type Overview = { daily: Record<string, { sets: number; latest: string }>; weekly: Record<string, { sets: number; latest: string }> };

const card = 'rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md';
const errBox = 'rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300';

export const PracticeQuizScreen: React.FC<PracticeQuizScreenProps> = ({ onNavigate, onSaveMistake }) => {
  const [view, setView] = useState<View>({ step: 'hub' });
  const go = (v: View) => { setView(v); window.scrollTo({ top: 0 }); };

  return (
    <div id="mind-maze-practice-quiz-view" className="space-y-6 pb-16 max-w-4xl mx-auto">
      {view.step === 'hub' && <Hub onPick={(category) => go({ step: 'subjects', category })} onNavigate={onNavigate} />}
      {view.step === 'subjects' && (
        <Subjects category={view.category} onBack={() => go({ step: 'hub' })} onPick={(subject) => go({ step: 'sets', category: view.category, subject })} />
      )}
      {view.step === 'sets' && (
        <SetList
          category={view.category}
          subject={view.subject}
          onBack={() => go({ step: 'subjects', category: view.category })}
          onTry={(setId) => go({ step: 'play', category: view.category, subject: view.subject, setId })}
        />
      )}
      {view.step === 'play' && (
        <Player
          setId={view.setId}
          onBack={() => go({ step: 'sets', category: view.category, subject: view.subject })}
          onSaveMistake={onSaveMistake}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};

/* ───────── Step 1: the two category cards ───────── */
const Hub: React.FC<{ onPick: (c: PracticeCategory) => void; onNavigate: (s: ScreenId) => void }> = ({ onPick, onNavigate }) => (
  <>
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 mb-2">
        <Zap className="w-3.5 h-3.5" /> Practice Quiz
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Pick your challenge</h1>
      <p className="text-sm text-slate-400 mt-1">Choose a rhythm, then a subject. New questions are published by the Mind Maze team.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {(['weekly', 'daily'] as PracticeCategory[]).map((c) => {
        const info = PRACTICE_CATEGORY_INFO[c];
        const Icon = c === 'weekly' ? Trophy : Zap;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            className={`group text-left p-6 sm:p-7 space-y-4 transition-all hover:-translate-y-1 hover:border-[#6B4EFF]/60 cursor-pointer ${card} ${c === 'weekly' ? 'bg-gradient-to-br from-[#6B4EFF]/25 to-transparent' : 'bg-gradient-to-br from-amber-400/20 to-transparent'}`}
          >
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${c === 'weekly' ? 'bg-purple-500/20 border-purple-400/40 text-cyan-300' : 'bg-amber-400/15 border-amber-400/40 text-amber-300'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{info.name}</h2>
              <p className="text-sm font-bold text-cyan-300">{info.tagline}</p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{info.blurb}</p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <span>Choose subject</span> <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        );
      })}
    </div>

    <button
      type="button"
      onClick={() => onNavigate('pastpapers')}
      className={`w-full flex items-center justify-between gap-3 p-4 text-left hover:border-cyan-400/40 transition cursor-pointer ${card}`}
    >
      <span className="flex items-center gap-3 text-sm text-slate-300"><FileText className="w-4 h-4 text-cyan-300" /> Looking for full exam papers? Open Past Papers.</span>
      <ChevronRight className="w-4 h-4 text-slate-500" />
    </button>
  </>
);

const BackLink: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer min-h-[36px]">
    <ArrowLeft className="w-4 h-4" /> {label}
  </button>
);

/* ───────── Step 2: subject cards ───────── */
const Subjects: React.FC<{ category: PracticeCategory; onBack: () => void; onPick: (s: string) => void }> = ({ category, onBack, onPick }) => {
  const info = PRACTICE_CATEGORY_INFO[category];
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    api.getPracticeOverview().then((o) => { if (!cancelled) setOverview(o); }).catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <BackLink onClick={onBack} label="Back to Practice Quiz" />
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{info.name} <span className="text-cyan-300 text-lg font-bold">· {info.tagline}</span></h1>
        <p className="text-sm text-slate-400 mt-1">Choose a subject.</p>
      </div>
      {error && <div role="alert" className={errBox}>{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRACTICE_SUBJECTS.map((subject) => {
          const stat = overview?.[category]?.[subject];
          return (
            <button key={subject} type="button" onClick={() => onPick(subject)} className={`group flex items-center gap-4 p-5 text-left hover:-translate-y-0.5 hover:border-[#6B4EFF]/60 transition cursor-pointer ${card}`}>
              <span className="h-12 w-12 shrink-0 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-cyan-300 flex items-center justify-center"><SubjectIcon subject={subject} className="w-6 h-6" /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-white">{subject}</span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  {!overview ? 'Loading…' : stat ? `${stat.sets} published · latest ${formatPublishDate(stat.latest)}` : 'Nothing published yet'}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>
          );
        })}
      </div>
    </>
  );
};

/* ───────── Step 3: every published set for the subject, newest first ───────── */
const SetList: React.FC<{ category: PracticeCategory; subject: string; onBack: () => void; onTry: (id: string) => void }> = ({ category, subject, onBack, onTry }) => {
  const info = PRACTICE_CATEGORY_INFO[category];
  const list = usePagedResource<PracticeSetSummary>('/practice/sets', 'sets', { category, subject });
  return (
    <>
      <BackLink onClick={onBack} label={`${info.name} subjects`} />
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3"><SubjectIcon subject={subject} className="w-7 h-7 text-cyan-300" /> {subject}</h1>
        <p className="text-sm text-slate-400 mt-1">{info.name} · every published {category === 'daily' ? 'question' : 'challenge'}, newest first.</p>
      </div>
      {list.error && <div role="alert" className={errBox}>{list.error} <button type="button" className="underline ml-1" onClick={list.reload}>Retry</button></div>}
      {list.loading && !list.items.length && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
      {!list.loading && !list.error && list.items.length === 0 && (
        <div className={`${card} p-10 text-center text-slate-400`}>
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-500" />
          <p className="font-bold text-white">Nothing published yet</p>
          <p className="text-xs mt-1">Check back soon — new questions appear here as soon as they are published.</p>
        </div>
      )}
      <div className="space-y-3">
        {list.items.map((s) => (
          <div key={s.id} className={`${card} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-md bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 font-bold text-cyan-300"><CalendarDays className="w-3 h-3" /> {formatPublishDate(s.publishDate)}</span>
                <span className="text-slate-400">{s.questionCount} {s.questionCount === 1 ? 'question' : 'questions'}</span>
                {s.topic && <span className="text-purple-300 font-semibold">{s.topic}</span>}
              </div>
              <h3 className="text-sm font-bold text-white truncate">{s.title}</h3>
            </div>
            <button type="button" onClick={() => onTry(s.id)} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] px-5 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] cursor-pointer">
              Try Questions <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {list.pagination.total > 0 && <Pagination {...list.pagination} label="Practice sets" />}
    </>
  );
};

/* ───────── Step 4: answer one question at a time, review right after each submission ───────── */
const Player: React.FC<{ setId: string; onBack: () => void; onSaveMistake: (m: MistakeItem) => void; onNavigate: (s: ScreenId) => void }> = ({ setId, onBack, onSaveMistake, onNavigate }) => {
  const [set, setSet] = useState<(PracticeSetSummary & { questions: PracticeStudentQuestion[] }) | null>(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [review, setReview] = useState<PracticeReview | null>(null);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSet(null); setError('');
    api.getPracticeSet(setId).then((s) => { if (!cancelled) setSet(s); }).catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [setId, attempt]);

  const q = set?.questions[index];
  const total = set?.questions.length ?? 0;
  const correctCount = useMemo(() => results.filter(Boolean).length, [results]);

  const submit = async () => {
    if (!set || !q || selected === null || checking || review) return;
    setChecking(true); setError('');
    try {
      const r: PracticeReview = await api.checkPracticeAnswer(set.id, index, selected);
      setReview(r);
      setResults((prev) => { const next = [...prev]; next[index] = r.correct; return next; });
      if (!r.correct) {
        // Wrong answers go to the Mistake Notebook with the review text and photos.
        onSaveMistake({
          id: `practice-${set.id}-${index}`,
          subject: set.subject,
          topic: set.topic || set.title,
          questionText: q.text,
          options: q.options,
          yourAnswer: q.options[selected],
          correctAnswer: r.correctAnswers.join(' / '),
          explanation: r.explanation,
          reviewImages: r.reviewImages,
          questionImage: q.imageId ? `/practice/sets/${set.id}/images/${q.imageId}` : '',
          source: `${PRACTICE_CATEGORY_INFO[set.category].name} · ${set.title} (${set.publishDate})`,
          reviewStatus: 'Needs Review',
          isMastered: false,
          dateAdded: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      setError(e.message || 'Could not check your answer.');
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    if (index + 1 < total) { setIndex(index + 1); setSelected(null); setReview(null); }
    else setFinished(true);
  };

  const restart = () => { setIndex(0); setSelected(null); setReview(null); setResults([]); setFinished(false); setAttempt((n) => n + 1); };

  if (error && !set) return (<><BackLink onClick={onBack} label="Back to list" /><div role="alert" className={errBox}>{error}</div></>);
  if (!set || !q) return <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading questions…</div>;

  if (finished) {
    const wrong = results.filter((r) => !r).length;
    const pct = Math.round((correctCount / Math.max(1, total)) * 100);
    return (
      <div className={`${card} p-6 sm:p-10 text-center space-y-7 shadow-xl`}>
        <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-purple-500/20 border border-purple-400/40"><Award className="w-12 h-12 text-cyan-300" /></div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">{set.title}</h2>
          <p className="text-sm text-slate-300 mt-1">{set.subject} · {formatPublishDate(set.publishDate)}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <Stat value={`${pct}%`} label="Accuracy" />
          <Stat value={String(correctCount)} label="Correct" tone="text-emerald-400" />
          <Stat value={String(wrong)} label="In Notebook" tone="text-rose-400" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 max-w-xl mx-auto">
          {wrong > 0 && (
            <button type="button" onClick={() => onNavigate('mistakes')} className="flex-1 min-w-[190px] flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-3 text-xs font-bold text-white cursor-pointer">
              <BookmarkCheck className="w-4 h-4 text-rose-400" /> Open Mistake Notebook ({wrong})
            </button>
          )}
          <button type="button" onClick={restart} className="flex-1 min-w-[150px] flex items-center justify-center gap-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] px-5 py-3 text-xs font-bold text-white cursor-pointer">
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <button type="button" onClick={onBack} className="flex-1 min-w-[150px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 text-xs font-bold text-slate-200 cursor-pointer">Back to list</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BackLink onClick={onBack} label="Back to list" />
      <div className={`${card} p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0">
          <div className="text-xs text-slate-400 flex flex-wrap gap-x-2"><span className="font-semibold text-purple-300">{set.subject}</span><span>•</span><span>{formatPublishDate(set.publishDate)}</span>{set.topic && <><span>•</span><span className="text-cyan-300">{set.topic}</span></>}</div>
          <div className="text-sm font-bold text-white truncate">{set.title}</div>
        </div>
        <div className="text-xs font-mono font-bold text-slate-200">{index + 1} / {total}</div>
      </div>
      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + (review ? 1 : 0)}>
        <div className="bg-gradient-to-r from-[#6B4EFF] to-cyan-400 h-full transition-all" style={{ width: `${((index + (review ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <div className={`${card} p-5 sm:p-8 space-y-6 shadow-xl`}>
        <p className="text-base sm:text-lg font-medium text-white leading-relaxed whitespace-pre-wrap">{q.text}</p>
        {q.imageId && <img src={practiceImageUrl(`/practice/sets/${set.id}/images/${q.imageId}`)} alt={q.imageAlt || 'Question diagram'} className="max-h-96 max-w-full object-contain rounded-xl bg-white" />}

        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
          {q.options.map((text, i) => {
            const isSel = selected === i;
            const isCorrect = !!review?.correctIndices.includes(i);
            let style = 'border-white/10 bg-white/5 text-slate-200 hover:border-purple-400/40 hover:bg-white/10';
            if (review) {
              if (isCorrect) style = 'border-emerald-500 bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500';
              else if (isSel) style = 'border-rose-500 bg-rose-500/20 text-rose-100 ring-1 ring-rose-500';
              else style = 'border-white/5 bg-white/[0.02] text-slate-500 opacity-60';
            } else if (isSel) style = 'border-purple-400 bg-purple-500/20 text-white ring-1 ring-purple-400';
            return (
              <button key={i} type="button" role="radio" aria-checked={isSel} disabled={!!review || checking} onClick={() => setSelected(i)}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left text-sm font-medium transition-all ${style}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold text-xs border border-white/15 bg-white/10">{String.fromCharCode(65 + i)}</span>
                <span className="pt-0.5 flex-1 whitespace-pre-wrap">{text}</span>
                {review && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {review && isSel && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {error && <div role="alert" className={errBox}>{error}</div>}

        {!review ? (
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button type="button" onClick={submit} disabled={selected === null || checking}
              className={`px-8 py-3 rounded-xl text-xs font-bold text-white transition ${selected !== null && !checking ? 'bg-[#6B4EFF] hover:bg-[#7C5DFA] cursor-pointer shadow-[0_0_15px_rgba(107,78,255,0.4)]' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}`}>
              {checking ? 'Checking…' : 'Submit Answer'}
            </button>
          </div>
        ) : (
          <div className="pt-4 border-t border-white/10 space-y-4" aria-live="polite">
            <div className={`rounded-2xl border p-4 ${review.correct ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
              <div className={`flex items-center gap-2 text-sm font-bold ${review.correct ? 'text-emerald-300' : 'text-rose-300'}`}>
                {review.correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {review.correct ? 'Correct!' : 'Not quite'}
              </div>
              {!review.correct && <p className="text-xs text-slate-200 mt-1.5">Correct answer: <strong>{review.correctAnswers.join(' / ')}</strong></p>}
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider"><Lightbulb className="w-4 h-4 text-amber-400" /> Review</div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{review.explanation || 'No written explanation was added for this question.'}</p>
              {review.reviewImages.length > 0 && (
                <div className="grid gap-3 pt-2">
                  {review.reviewImages.map((img) => (
                    <img key={img.path} src={practiceImageUrl(img.path)} alt={img.alt || 'Review diagram'} className="max-w-full rounded-xl bg-white object-contain" loading="lazy" />
                  ))}
                </div>
              )}
            </div>

            {!review.correct && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-200">
                <span className="flex items-center gap-2"><BookmarkCheck className="w-4 h-4" /> Saved to your Mistake Notebook with this review.</span>
                <button type="button" onClick={() => onNavigate('mistakes')} className="font-bold underline cursor-pointer">View Mini-Lesson</button>
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={next} className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-xs font-bold text-white shadow-[0_0_15px_rgba(107,78,255,0.4)] cursor-pointer">
                {index + 1 < total ? 'Next Question' : 'View Results'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const Stat: React.FC<{ value: string; label: string; tone?: string }> = ({ value, label, tone = 'text-white' }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div className={`text-2xl font-black ${tone}`}>{value}</div>
    <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
  </div>
);
