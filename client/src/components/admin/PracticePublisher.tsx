import React, { useEffect, useState } from 'react';
import { Sparkles, Plus, Pencil, Trash2, Eye, EyeOff, CalendarDays, Search } from 'lucide-react';
import { api, practiceImageUrl } from '../../services/api';
import { usePagedResource } from '../../hooks/usePagedResource';
import { Pagination } from '../common/Pagination';
import { parsePaperQuizImport } from '../../lib/paperQuizImport';
import { PRACTICE_AI_PROMPT, PRACTICE_CATEGORY_INFO, PRACTICE_SUBJECTS, formatPublishDate } from '../../lib/practice';
import { PracticeCategory, PracticeSetSummary } from '../../types';
import { getTodayDateString } from '../../lib/storage';

const EVENT = 'mindmaze_practice_updated';
const input = 'w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-white text-sm';

/* ───────────── List + publish controls ───────────── */
export function PracticePublisher() {
  const [category, setCategory] = useState('All');
  const [subject, setSubject] = useState('All');
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const filters: Record<string, string> = { q };
  if (category !== 'All') filters.category = category;
  if (subject !== 'All') filters.subject = subject;
  if (status !== 'All') filters.status = status;
  const list = usePagedResource<PracticeSetSummary>('/practice/admin/sets', 'sets', filters, EVENT);
  const refresh = () => window.dispatchEvent(new Event(EVENT));

  const togglePublish = async (s: PracticeSetSummary) => {
    setBusyId(s.id); setMessage('');
    try { await api.setPracticeSetPublished(s.id, !s.isPublished); refresh(); }
    catch (e: any) { setMessage(e.message); }
    finally { setBusyId(null); }
  };
  const remove = async (s: PracticeSetSummary) => {
    if (!window.confirm(`Delete "${s.title}" and all of its questions and images? Students' saved Mistake Notebook entries are not affected.`)) return;
    setBusyId(s.id); setMessage('');
    try { await api.deletePracticeSet(s.id); refresh(); }
    catch (e: any) { setMessage(e.message); }
    finally { setBusyId(null); }
  };

  const select = 'rounded-xl bg-[#1e2042] border border-white/10 px-3 py-2 text-xs text-white';
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#161831]/80 border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-300" /> Practice Quiz Publisher</h3>
            <p className="text-xs text-slate-400 mt-1">Weekly Century (up to 100 MCQs) and Daily Spark (one question) sets, per subject. Students only see a set once it is <strong>published</strong> and its publish date has arrived.</p>
          </div>
          <button type="button" onClick={() => setEditing('new')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold cursor-pointer"><Plus className="w-4 h-4" /> New set</button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><input aria-label="Search sets" value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, topic or date…" className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500" /></div>
          <select aria-label="Category" className={select} value={category} onChange={e => setCategory(e.target.value)}><option value="All">All categories</option><option value="weekly">Weekly Century</option><option value="daily">Daily Spark</option></select>
          <select aria-label="Subject" className={select} value={subject} onChange={e => setSubject(e.target.value)}><option value="All">All subjects</option>{PRACTICE_SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
          <select aria-label="Status" className={select} value={status} onChange={e => setStatus(e.target.value)}><option value="All">Any status</option><option value="published">Published</option><option value="draft">Draft</option></select>
        </div>

        {(message || list.error) && <p role="alert" className="text-sm text-rose-300">{message || list.error}</p>}
        {!list.loading && !list.items.length && !list.error && <div className="py-8 text-center text-slate-500 text-xs">No sets match. Create the first one with “New set”.</div>}

        <div className="space-y-3">
          {list.items.map(s => {
            const state = !s.isPublished ? { label: 'Draft', cls: 'bg-slate-500/20 text-slate-300 border-slate-400/30' } : s.scheduled ? { label: 'Scheduled', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/30' } : { label: 'Published', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
            return (
              <div key={s.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className={`px-2 py-0.5 rounded-full border ${state.cls}`}>{state.label}</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">{PRACTICE_CATEGORY_INFO[s.category].name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">{s.subject}</span>
                    <span className="inline-flex items-center gap-1 text-slate-400"><CalendarDays className="w-3 h-3" />{formatPublishDate(s.publishDate)}</span>
                    <span className="text-slate-500">{s.questionCount} Q</span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button type="button" disabled={busyId === s.id} onClick={() => togglePublish(s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer disabled:opacity-50 ${s.isPublished ? 'bg-slate-500/10 border-slate-400/30 text-slate-200' : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'}`}>
                    {s.isPublished ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                  </button>
                  <button type="button" onClick={() => setEditing(s.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                  <button type="button" disabled={busyId === s.id} onClick={() => remove(s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-300 cursor-pointer disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination {...list.pagination} label="Practice sets" />
      </div>
      {editing && <PracticeSetEditor setId={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onChanged={refresh} />}
    </div>
  );
}

/* ───────────── Editor ───────────── */
type RImage = { imageId: string; alt: string };
type Draft = { text: string; options: string[]; correctIndices: number[]; explanation: string; imageId?: string; imageAlt?: string; reviewImages: RImage[]; reviewNote?: string };
const blank = (): Draft => ({ text: '', options: ['', '', '', '', ''], correctIndices: [], explanation: '', reviewImages: [] });

function PracticeSetEditor({ setId, onClose, onChanged }: { setId: string | null; onClose: () => void; onChanged: () => void }) {
  const [id, setId_] = useState<string | null>(setId);
  const [category, setCategory] = useState<PracticeCategory>('weekly');
  const [subject, setSubject] = useState(PRACTICE_SUBJECTS[0]);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [publishDate, setPublishDate] = useState(getTodayDateString());
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<Draft[]>([blank()]);
  const [loading, setLoading] = useState(!!setId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    if (!setId) return;
    let cancelled = false;
    api.getPracticeSetForEdit(setId).then(({ set }) => {
      if (cancelled) return;
      setCategory(set.category); setSubject(set.subject); setTitle(set.title); setTopic(set.topic || '');
      setPublishDate(set.publishDate); setIsPublished(set.isPublished);
      setQuestions(set.questions.length ? set.questions.map((q: any) => ({ ...q, reviewImages: q.reviewImages || [] })) : [blank()]);
      setLoading(false);
    }).catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [setId]);

  const touch = () => { setReviewed(false); setStatus(''); };
  const update = (i: number, patch: Partial<Draft>) => { touch(); setQuestions(prev => prev.map((q, n) => n === i ? { ...q, ...patch } : q)); };
  const max = category === 'daily' ? 1 : 100;

  const body = (qs: Draft[]) => ({
    category, subject, title, topic, publishDate,
    questions: qs.map(({ reviewNote, ...q }) => ({ ...q, reviewImages: q.reviewImages.map(r => ({ imageId: r.imageId, alt: r.alt })) })),
  });

  // publish: undefined = keep current state; true/false = set it.
  const persist = async (publish?: boolean) => {
    if (busy) return;
    if (questions.some(q => q.reviewNote?.trim())) { setError('Resolve every review note before saving.'); return; }
    if (publish && (!reviewed || questions.some(q => !q.correctIndices.length))) { setError('Tick the confirmation box and select every correct answer before publishing.'); return; }
    if (questions.length > max) { setError(category === 'daily' ? 'A Daily Spark holds exactly one question.' : 'A Weekly Century holds at most 100 questions.'); return; }
    setBusy(true); setError(''); setStatus('');
    try {
      let current = id;
      if (!current) {
        const created = await api.createPracticeSet(body(questions));
        current = created.set.id; setId_(current);
      } else {
        await api.updatePracticeSet(current, { ...body(questions), isPublished: publish === undefined ? isPublished : publish });
      }
      // New sets are always created as drafts; publishing is a second step.
      if (!id && publish === true) await api.setPracticeSetPublished(current!, true);
      if (publish !== undefined) setIsPublished(publish);
      onChanged();
      setStatus(publish === true ? 'Saved and published.' : publish === false ? 'Saved and unpublished.' : id ? 'Saved.' : 'Saved as a draft. You can now add images.');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const importQuestions = () => {
    try {
      const draft = parsePaperQuizImport(importText);
      if (category === 'daily' && draft.length !== 1) throw new Error('A Daily Spark must contain exactly one question.');
      setQuestions(draft.map(d => ({ ...d, reviewImages: [] }))); touch(); setError('');
      setStatus(`Imported ${draft.length} question${draft.length === 1 ? '' : 's'} into the draft. Review them, then save.`);
    } catch (e: any) { setError(e.message); setStatus(''); }
  };

  const upload = async (file: File | undefined, apply: (imageId: string) => void) => {
    if (!file || !id) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be at most 5 MiB.'); return; }
    setBusy(true); setError('');
    try { const r = await api.uploadPracticeImage(id, file); apply(r.imageId); setStatus('Image uploaded. Click Save to attach it.'); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };
  const imgUrl = (imageId: string) => practiceImageUrl(`/practice/sets/${id}/images/${imageId}`);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Practice set editor">
      <form onSubmit={e => { e.preventDefault(); persist(); }} className="mx-auto max-w-3xl rounded-2xl bg-slate-900 p-6 text-white space-y-5">
        <div className="flex justify-between gap-4"><h2 className="text-xl font-bold">{id ? 'Edit practice set' : 'New practice set'}</h2><button type="button" disabled={busy} onClick={onClose}>Close</button></div>
        {loading && <p>Loading…</p>}
        {error && <p role="alert" className="text-rose-300 text-sm">{error}</p>}
        {status && <p role="status" className="text-emerald-300 text-sm">{status}</p>}

        <fieldset disabled={loading || busy} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm">Category
              <select className={input} value={category} onChange={e => { const c = e.target.value as PracticeCategory; if (c === 'daily' && questions.length > 1) { setError('Remove extra questions first: a Daily Spark holds exactly one.'); return; } setError(''); touch(); setCategory(c); }}>
                <option value="weekly">Weekly Century — 100 MCQ Challenge</option><option value="daily">Daily Spark — One Question a Day</option>
              </select></label>
            <label className="block text-sm">Subject
              <select className={input} value={subject} onChange={e => { touch(); setSubject(e.target.value); }}>{PRACTICE_SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></label>
            <label className="block text-sm sm:col-span-2">Title<input required maxLength={160} className={input} value={title} onChange={e => { touch(); setTitle(e.target.value); }} placeholder={category === 'daily' ? 'e.g. Projectile apex curvature' : 'e.g. Week 12 — Mechanics & Waves'} /></label>
            <label className="block text-sm">Topic (optional)<input maxLength={120} className={input} value={topic} onChange={e => { touch(); setTopic(e.target.value); }} /></label>
            <label className="block text-sm">Publish date<input required type="date" className={input} value={publishDate} onChange={e => { touch(); setPublishDate(e.target.value); }} />
              <span className="text-xs text-slate-400">Students see it from this date (Sri Lanka time) once published. A future date schedules it.</span></label>
          </div>

          <details className="rounded-xl border border-indigo-400/30 bg-indigo-500/5 p-4 space-y-3">
            <summary className="cursor-pointer font-semibold text-indigo-200">Import questions from AI output</summary>
            <p className="text-sm text-slate-300">Copy this prompt into your AI chat with your MCQs attached, then paste the JSON it returns. Importing replaces the questions in this editor (nothing is published).</p>
            <textarea aria-label="AI extraction prompt" readOnly rows={6} value={PRACTICE_AI_PROMPT} className={input} />
            <button type="button" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm" onClick={async () => { try { await navigator.clipboard.writeText(PRACTICE_AI_PROMPT); setStatus('Prompt copied.'); } catch { setStatus('Select and copy the prompt text above.'); } }}>Copy AI prompt</button>
            <textarea aria-label="Paste AI JSON" rows={6} className={input} value={importText} onChange={e => setImportText(e.target.value)} placeholder={'{"questions": [...]}'} />
            <button type="button" disabled={!importText.trim()} onClick={importQuestions} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm disabled:opacity-40">Replace draft with imported questions</button>
          </details>

          {!id && <p className="text-xs text-amber-300">Question and review photos can be added after the first save (the set is saved as a draft).</p>}

          {questions.map((q, i) => (
            <section key={i} className="rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex justify-between"><h3 className="font-bold">Question {i + 1}</h3>
                {questions.length > 1 && <button type="button" className="text-rose-300 text-sm" onClick={() => { touch(); setQuestions(prev => prev.filter((_, n) => n !== i)); }}>Remove</button>}</div>
              {q.reviewNote && <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200"><p>Review required: {q.reviewNote}</p><button type="button" className="mt-2 underline" onClick={() => update(i, { reviewNote: '' })}>I corrected this question</button></div>}
              <label className="block text-sm">Question text<textarea required className={input} rows={3} value={q.text} onChange={e => update(i, { text: e.target.value })} /></label>

              <div className="text-sm space-y-2">
                <span>Question diagram (optional)</span>
                {id ? <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; upload(f, imageId => update(i, { imageId })); }} /> : <p className="text-xs text-slate-500">Save the draft first.</p>}
                {q.imageId && id && <div className="space-y-2"><img src={imgUrl(q.imageId)} alt={q.imageAlt || 'Question diagram preview'} className="max-h-72 max-w-full object-contain rounded-lg bg-white" />
                  <input className={input} maxLength={1000} placeholder="Image description" value={q.imageAlt || ''} onChange={e => update(i, { imageAlt: e.target.value })} />
                  <button type="button" className="text-rose-300" onClick={() => update(i, { imageId: '', imageAlt: '' })}>Remove diagram</button></div>}
              </div>

              {q.options.map((o, n) => <label key={n} className="block text-sm">Answer {String.fromCharCode(65 + n)}<input required className={input} value={o} onChange={e => update(i, { options: q.options.map((v, k) => k === n ? e.target.value : v) })} /></label>)}
              <div className="flex gap-3 text-sm"><button type="button" disabled={q.options.length >= 5} onClick={() => update(i, { options: [...q.options, ''] })}>Add answer</button><button type="button" disabled={q.options.length <= 2} onClick={() => update(i, { options: q.options.slice(0, -1), correctIndices: q.correctIndices.filter(n => n < q.options.length - 1) })}>Remove last answer</button></div>
              <fieldset className="rounded-lg border border-white/15 p-3 space-y-2"><legend className="px-1 text-sm font-semibold">Accepted answers — tick every option that earns the mark</legend>
                {q.options.map((_, n) => <label key={n} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={q.correctIndices.includes(n)} onChange={e => update(i, { correctIndices: e.target.checked ? [...q.correctIndices, n].sort((a, b) => a - b) : q.correctIndices.filter(v => v !== n) })} />Answer {String.fromCharCode(65 + n)}</label>)}</fieldset>

              <label className="block text-sm">Review / explanation (shown after the student submits)<textarea className={input} rows={4} value={q.explanation} onChange={e => update(i, { explanation: e.target.value })} /></label>

              <div className="text-sm space-y-2 rounded-lg border border-white/15 p-3">
                <span className="font-semibold">Review photos (up to 6) — shown with the review and in the Mistake Notebook</span>
                {q.reviewImages.map((r, n) => id && (
                  <div key={r.imageId} className="space-y-1.5 rounded-lg bg-white/5 p-2">
                    <img src={imgUrl(r.imageId)} alt={r.alt || 'Review photo preview'} className="max-h-64 max-w-full object-contain rounded bg-white" />
                    <input className={input} maxLength={1000} placeholder="Photo description" value={r.alt} onChange={e => update(i, { reviewImages: q.reviewImages.map((x, k) => k === n ? { ...x, alt: e.target.value } : x) })} />
                    <div className="flex gap-4 text-xs">
                      <label className="cursor-pointer underline">Replace photo<input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; upload(f, imageId => update(i, { reviewImages: q.reviewImages.map((x, k) => k === n ? { ...x, imageId } : x) })); }} /></label>
                      <button type="button" className="text-rose-300 underline" onClick={() => update(i, { reviewImages: q.reviewImages.filter((_, k) => k !== n) })}>Remove</button>
                    </div>
                  </div>
                ))}
                {id ? (q.reviewImages.length < 6 && <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; upload(f, imageId => update(i, { reviewImages: [...q.reviewImages, { imageId, alt: '' }] })); }} />) : <p className="text-xs text-slate-500">Save the draft first, then add photos.</p>}
              </div>
            </section>
          ))}

          {category === 'weekly' && <button type="button" disabled={questions.length >= max} onClick={() => { touch(); setQuestions(prev => [...prev, blank()]); }} className="rounded-lg bg-white/10 p-3 text-sm">Add question ({questions.length}/{max})</button>}

          <label className="flex gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I checked all questions, accepted answers and reviews.</label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold disabled:opacity-40">{busy ? 'Saving…' : id ? 'Save' : 'Save as draft'}</button>
            <button type="button" disabled={busy || !reviewed} onClick={() => persist(true)} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold disabled:opacity-40">{isPublished ? 'Save & keep published' : 'Save & publish'}</button>
            {isPublished && <button type="button" disabled={busy} onClick={() => persist(false)} className="rounded-xl bg-slate-600 px-5 py-3 text-sm font-bold disabled:opacity-40">Save & unpublish</button>}
          </div>
        </fieldset>
      </form>
    </div>
  );
}
