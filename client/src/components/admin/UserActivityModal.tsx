import React, { useEffect, useState } from 'react';
import { X, Clock, Flame, Award, BookX, ListChecks, GraduationCap, CalendarDays, Phone, Loader2, Info, Activity, FileCheck2, Zap } from 'lucide-react';
import { api } from '../../services/api';

const hm = (min: number) => { const m = Math.round(min || 0); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`; };
const day = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const ago = (iso?: string | null) => {
  if (!iso) return 'Never';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ago`;
  return day(iso);
};
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">{icon}{title}</h4>
    {children}
  </section>
);
const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3"><div className="text-lg font-black text-white">{value}</div><div className="text-[11px] text-slate-400">{label}</div></div>
);

export const UserActivityModal: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setData(null); setError('');
    api.getUserActivity(userId).then(d => { if (!cancelled) setData(d); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = data?.profile, s = data?.study;
  const maxDay = s ? Math.max(1, ...s.daily.map((d: any) => d.minutes)) : 1;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Student activity">
      <div className="mx-auto max-w-3xl rounded-3xl bg-[#12142b] border border-white/10 p-5 sm:p-7 text-white space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-black truncate">{p?.name || 'Student activity'}</h3>
            {p && <p className="text-xs text-slate-400 break-all">{p.email} · <span className="capitalize">{(p.role || 'student').replace('_', ' ')}</span>{!p.isActive && <span className="ml-2 text-rose-300 font-bold">Deactivated</span>}</p>}
            {data && (data.usage.online
              ? <p className="mt-1 text-xs font-bold text-emerald-300 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Online now</p>
              : <p className="mt-1 text-xs text-slate-400">Last seen: {ago(data.usage.lastSeenAt)}</p>)}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {!data && !error && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading activity…</div>}

        {data && (<>
          <Card title="Profile" icon={<Phone className="w-4 h-4" />}>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
              {[['Joined', day(p.joinedAt)], ['Stream', p.stream || '—'], ['Elective', p.elective || '—'],
                ['Phone', p.phone || p.mobileNumber || '—'], ['WhatsApp', p.whatsappNumber || '—'], ['Phone verified', p.telegram?.accountVerified ? 'Yes' : 'No'],
                ['Target exam', p.targetExamYear ? String(p.targetExamYear) : day(p.targetExamDate)], ['Target Z-score', p.targetZScore ?? '—'],
                ['Daily / weekly goal', `${p.dailyHoursGoal ?? '—'}h / ${p.weeklyHoursGoal ?? '—'}h`]].map(([k, v]) => (
                <div key={k as string}><dt className="text-slate-500">{k}</dt><dd className="text-slate-100 font-semibold break-words">{v as any}</dd></div>
              ))}
            </dl>
          </Card>

          <Card title="Study time" icon={<Clock className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Total (study timer)" value={hm(s.totalMinutes)} />
              <Stat label="Last 7 days" value={hm(s.last7Minutes)} />
              <Stat label="Last 30 days" value={hm(s.last30Minutes)} />
              <Stat label="Days studied" value={s.activeDays} />
            </div>
            <div className="text-[11px] text-slate-400">Last studied: {day(s.lastStudyDate)}</div>
            <div className="flex items-end gap-[3px] h-24" aria-label="Minutes studied per day, last 30 days">
              {s.daily.map((d: any) => (
                <div key={d.date} title={`${day(d.date)} — ${hm(d.minutes)}`} className="flex-1 rounded-sm bg-cyan-400/80" style={{ height: `${Math.max(d.minutes ? 6 : 2, (d.minutes / maxDay) * 100)}%`, opacity: d.minutes ? 1 : 0.2 }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500"><span>{day(s.daily[0].date)}</span><span>Today</span></div>
          </Card>

          <Card title="Time in the system" icon={<Activity className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Total time" value={hm(data.usage.totalMinutes)} />
              <Stat label="Last 7 days" value={hm(data.usage.last7Minutes)} />
              <Stat label="Last 30 days" value={hm(data.usage.last30Minutes)} />
              <Stat label="Visits" value={data.usage.sessions} />
            </div>
            <div className="text-[11px] text-slate-400">Active on {data.usage.activeDays} day{data.usage.activeDays === 1 ? '' : 's'}{data.usage.trackingSince ? ` · counted since ${day(data.usage.trackingSince)}` : ''}</div>
            {(() => { const mx = Math.max(1, ...data.usage.daily.map((d: any) => d.minutes)); return (
              <div className="flex items-end gap-[3px] h-20" aria-label="Minutes in the system per day, last 30 days">
                {data.usage.daily.map((d: any) => <div key={d.date} title={`${day(d.date)} — ${hm(d.minutes)}`} className="flex-1 rounded-sm bg-violet-400/80" style={{ height: `${Math.max(d.minutes ? 6 : 2, (d.minutes / mx) * 100)}%`, opacity: d.minutes ? 1 : 0.2 }} />)}
              </div>); })()}
          </Card>

          <Card title="Past papers (online MCQ)" icon={<FileCheck2 className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Papers completed" value={data.papers.completed} />
              <Stat label="Average score" value={data.papers.avgPercent == null ? '—' : `${data.papers.avgPercent}%`} />
              <Stat label="Best score" value={data.papers.bestPercent == null ? '—' : `${data.papers.bestPercent}%`} />
            </div>
            {data.papers.recent.length === 0 ? <p className="text-xs text-slate-500">No submitted online papers yet.</p> : (
              <div className="space-y-1.5">
                {data.papers.recent.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs rounded-lg bg-slate-950/50 px-3 py-2">
                    <div className="min-w-0"><div className="text-slate-200 font-semibold truncate">{r.title}</div><div className="text-[10px] text-slate-500">{day(r.submittedAt)}{r.timedOut ? ' · timed out' : ''}</div></div>
                    <div className="shrink-0 font-bold text-white">{r.score}/{r.total} <span className="text-slate-400 font-normal">({r.percentage}%)</span></div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-500">Only online MCQ papers can be measured. PDF-only papers are not tracked.</p>
          </Card>

          <Card title="Practice Quiz" icon={<Zap className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Sets tried" value={data.practice.sets} />
              <Stat label="Answers submitted" value={data.practice.attempts} />
              <Stat label="Accuracy" value={data.practice.accuracy == null ? '—' : `${data.practice.accuracy}%`} />
              <Stat label="Questions mastered" value={`${data.practice.distinctCorrect}/${data.practice.distinctAnswered}`} />
            </div>
            {data.practice.byCategory.length > 0 && <div className="flex flex-wrap gap-2 text-[11px]">{data.practice.byCategory.map((c: any) => <span key={c.category} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{c.category === 'weekly' ? 'Weekly Century' : 'Daily Spark'}: {c.correct}/{c.attempts} correct · {c.sets} set{c.sets === 1 ? '' : 's'}</span>)}</div>}
            {data.practice.recent.length === 0 ? <p className="text-xs text-slate-500">No practice questions answered yet.</p> : (
              <div className="space-y-1.5">
                {data.practice.recent.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-xs rounded-lg bg-slate-950/50 px-3 py-2">
                    <div className="min-w-0"><div className="text-slate-200 font-semibold truncate">{r.title}</div><div className="text-[10px] text-slate-500">{r.category === 'weekly' ? 'Weekly' : 'Daily'} · {r.subject} · {ago(r.lastAnsweredAt)}</div></div>
                    <div className="shrink-0 text-right"><div className="font-bold text-white">{r.answered}{r.total != null ? `/${r.total}` : ''} <span className="text-slate-400 font-normal">answered</span></div>{r.complete && <div className="text-[10px] text-emerald-300 font-bold">Completed</div>}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Progress" icon={<Flame className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="XP" value={data.progress.xp} />
              <Stat label="Current streak" value={`${data.progress.streakDays}d`} />
              <Stat label="Best streak" value={`${data.progress.bestStreak}d`} />
              <Stat label="Badges" value={data.progress.badges.length} />
            </div>
          </Card>

          <Card title="Mistake notebook" icon={<BookX className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Saved mistakes" value={data.mistakes.total} />
              <Stat label="Mastered" value={data.mistakes.mastered} />
              <Stat label="Needs review" value={data.mistakes.needsReview} />
            </div>
            {data.mistakes.bySubject.length > 0 && <div className="space-y-1 text-xs">{data.mistakes.bySubject.map((r: any) => <div key={r.subject} className="flex justify-between"><span className="text-slate-300">{r.subject}</span><span className="text-slate-400">{r.mastered}/{r.total} mastered</span></div>)}</div>}
          </Card>

          <Card title="Syllabus progress" icon={<ListChecks className="w-4 h-4" />}>
            {data.syllabus.bySubject.length === 0 ? <p className="text-xs text-slate-500">No syllabus topics tracked yet.</p> : (
              <div className="space-y-2.5">
                {data.syllabus.bySubject.map((r: any) => {
                  const total = r.completed + r.inProgress + r.notStarted;
                  return (
                    <div key={r.subject} className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-slate-200 font-semibold">{r.subject}</span><span className="text-slate-400">{r.completed} done · {r.inProgress} in progress · {total} tracked</span></div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${pct(r.completed, total)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card title="Courses" icon={<GraduationCap className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Opened" value={data.courses.opened} />
                <Stat label="Completed" value={data.courses.completed} />
                <Stat label="Quiz attempts" value={data.courses.quizAttempts} />
                <Stat label="Avg quiz score" value={data.courses.avgQuizPercent == null ? '—' : `${data.courses.avgQuizPercent}%`} />
              </div>
            </Card>
            <Card title="Planner" icon={<CalendarDays className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Tasks done" value={`${data.tasks.completed}/${data.tasks.total}`} />
                <Stat label="Timetable slots" value={data.timetableSlots} />
              </div>
            </Card>
          </div>

          <Card title="Badges" icon={<Award className="w-4 h-4" />}>
            {data.progress.badges.length === 0 ? <p className="text-xs text-slate-500">No badges yet.</p> : <div className="flex flex-wrap gap-2">{data.progress.badges.map((b: string) => <span key={b} className="px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-[11px] font-semibold text-amber-200">{b}</span>)}</div>}
          </Card>

          <div className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-slate-400">
            <Info className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Time in the system, paper results and Practice Quiz activity are counted from the day tracking was switched on; earlier activity was not recorded. Time is approximate: it counts only while the app is visible and in use.</span>
          </div>
        </>)}
      </div>
    </div>
  );
};
