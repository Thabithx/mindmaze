import React,{useEffect,useRef,useState} from 'react';
import {api,getAuthToken,getStoredUser} from '../../services/api';
import {getSubjectsForStream} from '../../data/alSyllabusData';
import {Lesson,Progress,subjects,control,button,panel} from './learning';
import {LessonView} from './LessonView';

export const CourseCatalogScreen:React.FC=()=>{
  const [lessons,setLessons]=useState<Lesson[]>([]),[progress,setProgress]=useState<Record<string,Progress>>({});
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[progressError,setProgressError]=useState('');
  const [subject,setSubject]=useState(''),[topic,setTopic]=useState(''),[query,setQuery]=useState('');
  const [allSubjects,setAllSubjects]=useState(!getStoredUser()?.stream),[medium,setMedium]=useState(''),[syllabus,setSyllabus]=useState(''),[kind,setKind]=useState('');
  const [active,setActive]=useState<Lesson|null>(null),[opening,setOpening]=useState(false),[revisionOnly,setRevisionOnly]=useState(false);
  const request=useRef(0),catalogRequest=useRef(0);
  const user=getStoredUser();
  const mySubjects=getSubjectsForStream(user?.stream||'Maths',user?.physicalScienceElective||'Chemistry').map(s=>s.name==='Combined Mathematics'?'Combined Maths':s.name);
  const updateProgress=(p:Progress)=>setProgress(prev=>({...prev,[p.course]:p}));
  const load=async()=>{
    const version=++catalogRequest.current;setLoading(true);setError('');setProgressError('');
    const results=await Promise.allSettled([api.getCourses(),getAuthToken()?api.getCourseProgress():Promise.resolve({progress:[]})]);
    if(version!==catalogRequest.current)return;
    if(results[0].status==='fulfilled')setLessons(results[0].value.courses);else setError('Could not load lessons. Please retry.');
    if(results[1].status==='fulfilled')setProgress(Object.fromEntries(results[1].value.progress.map((p:Progress)=>[p.course,p])));else setProgressError('Saved progress could not be loaded. Retry before continuing.');
    setLoading(false);
  };
  useEffect(()=>{load();window.addEventListener('mindmaze_courses_updated',load);return()=>{catalogRequest.current++;request.current++;window.removeEventListener('mindmaze_courses_updated',load);};},[]);
  const openLesson=async(id:string)=>{
    const version=++request.current;setOpening(true);setError('');
    try{
      const res=await api.getCourseById(id);if(version!==request.current)return;
      setActive(res.course);setSubject(res.course.subject);setTopic(res.course.topic);setQuery('');setRevisionOnly(false);
      if(getAuthToken()){
        try{const saved=await api.saveCourseProgress(id,{});if(version===request.current)updateProgress(saved.progress);}
        catch(e:any){if(version===request.current)setProgressError('Progress was not saved: '+e.message);}
      }
    }catch(e:any){if(version===request.current)setError(e.message);}finally{if(version===request.current)setOpening(false);}
  };
  const navigate=(nextSubject='',nextTopic='')=>{request.current++;setOpening(false);setActive(null);setSubject(nextSubject);setTopic(nextTopic);setQuery('');setRevisionOnly(false);};
  const eligible=lessons.filter(l=>(allSubjects||mySubjects.includes(l.subject))&&(!medium||l.medium===medium)&&(!syllabus||l.syllabus===syllabus)&&(!kind||(kind==='video'?l.videoCount>0:kind==='pdf'?l.resourceCount>0:l.quizCount>0)));
  const visible=eligible.filter(l=>(query.trim()?[l.title,l.topic,l.subject,l.description].join(' ').toLowerCase().includes(query.trim().toLowerCase()):(!subject||l.subject===subject)&&(!topic||l.topic===topic))&&(!revisionOnly||progress[l._id]?.needsRevision));
  const resumed=lessons.filter(l=>progress[l._id]&&!progress[l._id].completed).sort((a,b)=>Date.parse(progress[b._id].lastOpenedAt)-Date.parse(progress[a._id].lastOpenedAt))[0];
  const reviseCount=lessons.filter(l=>progress[l._id]?.needsRevision).length;
  const topicNames=[...new Set(visible.map(l=>l.topic))];
  const nextLesson=active?lessons.filter(l=>l.subject===active.subject&&l.topic===active.topic).find((l,i,items)=>i>0&&items[i-1]._id===active._id):null;
  const stats=(items:Lesson[])=>({done:items.filter(l=>progress[l._id]?.completed).length,total:items.length,minutes:items.reduce((n,l)=>n+l.estimatedMinutes,0)});
  const progressBar=(items:Lesson[])=>{const s=stats(items);return <div className="space-y-2"><p className="text-xs text-slate-400">{s.done} / {s.total} lessons completed · {s.minutes} min</p><progress aria-label="Lesson completion" value={s.done} max={s.total||1} className="w-full h-1.5 accent-cyan-400"/></div>;};
  return <div className="space-y-6 pb-10">
    <header className={panel}><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Courses & Media</p><h1 className="text-2xl sm:text-3xl font-bold text-white">What will you learn today?</h1><p className="text-sm text-slate-400">Choose a subject, explore a topic, and learn at your own pace.</p></header>
    {error&&<div role="alert" className="text-rose-300">{error} <button className="underline" onClick={load}>Retry catalogue</button></div>}
    {progressError&&<div role="alert" className="text-amber-300 text-sm">{progressError} <button className="underline" onClick={load}>Retry progress</button></div>}
    <nav aria-label="Learning navigation" className="flex flex-wrap gap-2 text-sm text-slate-400"><button className="text-cyan-300" onClick={()=>navigate()}>Subjects</button>{subject&&<><span>/</span><button className="text-cyan-300" onClick={()=>navigate(subject)}>{subject}</button></>}{topic&&<><span>/</span><button className="text-cyan-300" onClick={()=>navigate(subject,topic)}>{topic}</button></>}{active&&<><span>/</span><span>{active.title}</span></>}</nav>
    {opening&&<p role="status" className="text-cyan-300">Opening lesson…</p>}
    {active?<LessonView key={active._id+':'+active.revision} lesson={active} progress={progress[active._id]} onProgress={updateProgress} onNext={nextLesson?()=>openLesson(nextLesson._id):undefined}/>:<>
      {!subject&&!query&&!revisionOnly&&resumed&&<section className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-5 flex flex-wrap gap-4 items-center justify-between"><div><p className="text-xs text-indigo-300 mb-2">Continue learning</p><h2 className="text-lg font-bold text-white">{resumed.title}</h2><p className="text-sm text-slate-400">{resumed.subject} · {resumed.topic}</p></div><button disabled={opening} onClick={()=>openLesson(resumed._id)} className={button}>Resume lesson →</button></section>}
      <div className={panel}><label className="block text-sm text-slate-300">Search all topics and lessons<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try cell biology or mechanics" className={control+' mt-2'}/></label><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs text-slate-400">Language<select className={control+' mt-1'} value={medium} onChange={e=>setMedium(e.target.value)}><option value="">All languages</option>{['English','Sinhala','Tamil'].map(m=><option key={m}>{m}</option>)}</select></label>
        <label className="text-xs text-slate-400">Syllabus<select className={control+' mt-1'} value={syllabus} onChange={e=>setSyllabus(e.target.value)}><option value="">All syllabuses</option><option value="current">Current syllabus</option><option value="old">Old syllabus</option></select></label>
        <label className="text-xs text-slate-400">Material<select className={control+' mt-1'} value={kind} onChange={e=>setKind(e.target.value)}><option value="">All materials</option><option value="video">Video lessons</option><option value="pdf">PDF notes</option><option value="quiz">Practice quizzes</option></select></label>
      </div><div className="flex flex-wrap gap-4 text-sm"><label className="text-slate-300 flex gap-2 items-center"><input type="checkbox" checked={allSubjects} onChange={e=>{setAllSubjects(e.target.checked);navigate();}}/>Browse all subjects</label>{reviseCount>0&&<button className="text-amber-300" onClick={()=>{navigate();setAllSubjects(true);setRevisionOnly(!revisionOnly);}}>{revisionOnly?'Show all lessons':`Needs revision (${reviseCount})`}</button>}{(query||medium||syllabus||kind||revisionOnly)&&<button className="text-cyan-300" onClick={()=>{setQuery('');setMedium('');setSyllabus('');setKind('');setRevisionOnly(false);}}>Clear filters</button>}</div></div>
      {loading?<p role="status" className="text-slate-400">Loading lessons…</p>:<>
        <h2 className="text-xl font-bold text-white">{revisionOnly?'Needs revision':query?'Search results':topic?'Lessons':subject?'Choose a topic':'Choose a subject'}</h2>
        {visible.length===0?<div className={panel}><p className="text-slate-300">No lessons found here yet.</p><p className="text-sm text-slate-400">Try another subject or clear the filters.</p></div>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {!subject&&!query&&!revisionOnly?subjects.filter(s=>visible.some(l=>l.subject===s)).map(s=>{const items=visible.filter(l=>l.subject===s);return <button key={s} onClick={()=>setSubject(s)} className={panel+' text-left hover:border-cyan-400/60'}><span className="text-2xl">{{Physics:'⚡',Chemistry:'🧪',Biology:'🌿','Combined Maths':'📐',ICT:'💻'}[s]}</span><h3 className="font-bold text-lg text-white">{s}</h3><p className="text-sm text-slate-400">{new Set(items.map(l=>l.topic)).size} topics</p>{progressBar(items)}</button>;}):!topic&&!query&&!revisionOnly?topicNames.map((t,i)=>{const items=visible.filter(l=>l.topic===t);return <button key={t} onClick={()=>setTopic(t)} className={panel+' text-left hover:border-cyan-400/60'}><p className="text-xs text-cyan-300">Topic {i+1}</p><h3 className="font-bold text-lg text-white">{t}</h3>{progressBar(items)}</button>;}):visible.map(l=><button key={l._id} disabled={opening} onClick={()=>openLesson(l._id)} className={panel+' text-left hover:border-cyan-400/60 disabled:opacity-60'}><p className="text-xs text-cyan-300">{l.subject} · {l.topic}</p><h3 className="text-lg font-bold text-white">{l.title}</h3><p className="text-sm text-slate-400 line-clamp-2">{l.description}</p><p className="text-xs text-slate-400">{l.estimatedMinutes} min · {l.medium}{l.videoCount>0?` · ${l.videoCount} videos`:''}{l.resourceCount>0?` · ${l.resourceCount} PDFs`:''}{l.quizCount>0?` · ${l.quizCount} questions`:''}</p><p className={`text-sm ${progress[l._id]?.completed?'text-emerald-300':'text-indigo-300'}`}>{progress[l._id]?.completed?'Completed ✓':progress[l._id]?'In progress →':'Start lesson →'}</p></button>)}
        </div>}
      </>}
    </>}
  </div>;
};
