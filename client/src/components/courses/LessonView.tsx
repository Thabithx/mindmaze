import React,{useState} from 'react';
import {api,getAuthToken} from '../../services/api';
import {Lesson,Progress,button,panel,safeLink,youtubeEmbed} from './learning';

export function LessonView({lesson,progress,onProgress,onNext,preview=false}:{lesson:Lesson;progress?:Progress;onProgress:(p:Progress)=>void;onNext?:()=>void;preview?:boolean}) {
  const [answers,setAnswers]=useState<number[]>([]),[result,setResult]=useState<any>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[playing,setPlaying]=useState<number|null>(null);
  const [mistakesOnly,setMistakesOnly]=useState(false);
  const signedIn=Boolean(getAuthToken());
  const quiz=lesson.quiz||[];
  const saveCompletion=async()=>{setBusy(true);setError('');try{const res=await api.saveCourseProgress(lesson._id,{completed:!progress?.completed});onProgress(res.progress);}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  const submit=async()=>{
    setBusy(true);setError('');
    try{
      if(preview){const results=quiz.map((q,i)=>({...q,selectedIndex:answers[i],correct:answers[i]===q.correctOptionIndex}));setResult({results,score:results.filter(r=>r.correct).length,total:quiz.length});}
      else{const res=await api.submitCourseQuiz(lesson._id,answers,lesson.revision);setResult(res);onProgress(res.progress);}
    }catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  return <div className="space-y-5">
    <header className={panel}>
      <p className="text-xs font-semibold text-cyan-300">{lesson.subject} / {lesson.topic} · {lesson.medium} · {lesson.estimatedMinutes} min</p>
      <h2 className="text-2xl font-bold text-white">{lesson.title}</h2>
      <p className="whitespace-pre-wrap text-sm text-slate-300">{lesson.description}</p>
      {preview?<p className="text-amber-300 text-sm">Student preview — progress is not saved. Draft PDF downloads become available after publishing.</p>:!signedIn?<p className="text-sm text-amber-300">Sign in to save progress and take the quiz.</p>:<button disabled={busy} className={button} onClick={saveCompletion}>{progress?.completed?'Completed ✓ — mark unfinished':'Mark lesson completed'}</button>}
    </header>
    {error&&<p role="alert" className="text-rose-300">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
      <div className="space-y-5 min-w-0">
        {(lesson.videos||[]).map((video,i)=>{const embed=youtubeEmbed(video.url);return <section key={i} className={panel}>
          <h3 className="text-white font-bold">{video.title}</h3>
          {embed ? playing===i?<iframe src={embed} title={video.title} className="aspect-video w-full rounded-xl" allow="encrypted-media; picture-in-picture" allowFullScreen/>:<button className="aspect-video w-full rounded-xl bg-slate-800 text-cyan-300 font-semibold" onClick={()=>setPlaying(i)}>▶ Play video</button> : safeLink(video.url)?<a href={video.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline">Open video ↗</a>:<p className="text-slate-400">Video link unavailable.</p>}
        </section>;})}
        {!!quiz.length&&<section className={panel}>
          <h3 className="font-bold text-white text-lg">Check your understanding</h3>
          {result?<>
            <p role="status" className="text-emerald-300">You scored {result.score} / {result.total}.</p>
            <div className="flex flex-wrap gap-3"><button className={button} onClick={()=>{setResult(null);setAnswers([]);setMistakesOnly(false);}}>Try again</button><button className="text-cyan-300 text-sm" onClick={()=>setMistakesOnly(v=>!v)}>{mistakesOnly?'Show all answers':'Review mistakes'}</button></div>
            {mistakesOnly&&result.score===result.total&&<p className="text-slate-300">All answers correct. You’re ready for the next lesson.</p>}
            {result.results.filter((r:any)=>!mistakesOnly||!r.correct).map((r:any,i:number)=><div key={i} className="rounded-xl bg-slate-800 p-4 space-y-2 text-sm"><p className="font-semibold text-white">{r.correct?'✓':'↻'} {r.questionText}</p><p className="text-slate-300">Your answer: {r.options[r.selectedIndex]}</p>{!r.correct&&<p className="text-emerald-300">Correct answer: {r.options[r.correctOptionIndex]}</p>}{r.explanation&&<p className="text-slate-300">{r.explanation}</p>}</div>)}
          </>:<>
            {quiz.map((q,i)=><fieldset key={i} disabled={busy} className="space-y-2 border-t border-slate-700 pt-4"><legend className="text-sm font-semibold text-white">{i+1}. {q.questionText}</legend>{q.options.map((o,j)=><label key={j} className={`flex items-start gap-3 rounded-xl p-3 text-sm cursor-pointer ${answers[i]===j?'bg-indigo-600/25 text-white':'bg-slate-800 text-slate-300'}`}><input type="radio" name={`question-${i}`} checked={answers[i]===j} onChange={()=>setAnswers(a=>{const next=[...a];next[i]=j;return next;})}/>{o}</label>)}</fieldset>)}
            <button className={button} disabled={busy||(!signedIn&&!preview)||quiz.some((_,i)=>answers[i]===undefined)} onClick={submit}>{busy?'Checking…':'Check answers'}</button>
          </>}
        </section>}
      </div>
      <aside className="space-y-5">
        <section className={panel}><h3 className="text-white font-bold">Study notes</h3>{lesson.resources?.length?lesson.resources.map(r=><a key={r.id} className="block rounded-xl bg-slate-800 p-3 text-sm text-cyan-300" href={api.courseResourceUrl(r.path)} target="_blank" rel="noreferrer">{r.title} ↗<span className="block text-xs text-slate-400 mt-1">PDF{r.size?` · ${(r.size/1024/1024).toFixed(1)} MiB`:''}</span></a>):<p className="text-sm text-slate-400">No notes attached yet.</p>}</section>
        {!!lesson.relatedPapers?.length&&<section className={panel}><h3 className="text-white font-bold">Related past papers</h3>{lesson.relatedPapers.map(p=><a key={p._id} href={api.courseResourceUrl(p.pdfPath)} target="_blank" rel="noreferrer" className="block text-sm text-cyan-300 underline">{p.title} ↗</a>)}</section>}
        {onNext&&<button className={button+' w-full'} onClick={onNext}>Next lesson →</button>}
      </aside>
    </div>
  </div>;
}
