import React,{useEffect,useRef,useState} from 'react';
import {api,paperImageUrl,getStoredUser} from '../../services/api';

export function PaperPracticeScreen(props:{paperId:string;onBack:()=>void}) {
  return <TimedPaper key={props.paperId} {...props}/>;
}
function TimedPaper({paperId,onBack}:{paperId:string;onBack:()=>void}) {
  const account=getStoredUser();
  const storageKey=`mindmaze_paper_attempt:${account?._id||account?.id||'guest'}:${paperId}`;
  const [quiz,setQuiz]=useState<any>(null),[answers,setAnswers]=useState<number[][]>([]);
  const [index,setIndex]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [result,setResult]=useState<any>(null),[attempt,setAttempt]=useState<any>(null);
  const [remaining,setRemaining]=useState(7200),[saveState,setSaveState]=useState(''),[loading,setLoading]=useState(true);
  const [missingAttempt,setMissingAttempt]=useState(false);
  const live=useRef(true),locked=useRef(false),answersRef=useRef<number[][]>([]),queue=useRef<Promise<void>>(Promise.resolve());
  const clock=useRef({seconds:7200,started:0,wallStarted:0}),autoSubmitted=useRef(false),pending=useRef(0);
  const submitRef=useRef<()=>void>(()=>{});
  const readToken=()=>{try{return localStorage.getItem(storageKey)||undefined;}catch{return undefined;}};
  const storeToken=(token:string)=>{try{localStorage.setItem(storageKey,token);}catch{setError('Browser storage is unavailable. Keep this page open to preserve your attempt.');}};
  const applyAttempt=(data:any)=>{
    setQuiz(data);setAttempt(data);setAnswers(data.answers);answersRef.current=data.answers;setResult(data.result);
    clock.current={seconds:Math.max(0,(Date.parse(data.deadline)-Date.parse(data.serverNow))/1000),started:performance.now(),wallStarted:Date.now()};
    setRemaining(Math.ceil(clock.current.seconds));setSaveState('Answers saved');autoSubmitted.current=false;
  };
  useEffect(()=>{
    live.current=true;
    let cancelled=false;
    const token=readToken();
    const request=token?api.startPaperQuiz(paperId,token):api.getPaperQuiz(paperId);
    request.then(data=>{if(!cancelled){if(token)applyAttempt(data);else setQuiz(data);}})
      .catch(e=>{if(!cancelled){setError(e.message);setMissingAttempt(Boolean(token));}})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;live.current=false;};
  },[paperId]);
  const start=async()=>{
    if(locked.current)return;locked.current=true;setBusy(true);setError('');
    try{const data=await api.startPaperQuiz(paperId);if(live.current){storeToken(data.attemptToken);applyAttempt(data);setIndex(0);setMissingAttempt(false);}}
    catch(e:any){if(live.current)setError(e.message);}finally{locked.current=false;if(live.current)setBusy(false);}
  };
  const save=(next:number[][])=>{
    if(!attempt||result)return;
    pending.current++;setSaveState('Saving answers…');
    queue.current=queue.current.then(async()=>{
      try{await api.savePaperQuizAnswers(paperId,attempt.attemptToken,next);if(live.current&&pending.current===1)setSaveState('Answers saved');}
      catch(e:any){if(live.current)setSaveState(e.message);}
      finally{pending.current--;}
    });
  };
  const select=(option:number)=>{
    if(remaining<=0||locked.current)return;
    const next=answersRef.current.map((a,n)=>n===index?[option]:a);
    answersRef.current=next;setAnswers(next);save(next);
  };
  const submit=async()=>{
    if(locked.current||!attempt||result)return;locked.current=true;setBusy(true);setError('');
    try{
      await queue.current;
      const marked=await api.submitPaperQuiz(paperId,{attemptToken:attempt.attemptToken,answers:answersRef.current});
      if(live.current)setResult(marked);
    }catch(e:any){if(live.current)setError(e.message);}finally{locked.current=false;if(live.current)setBusy(false);}
  };
  submitRef.current=()=>{void submit();};
  useEffect(()=>{
    if(!attempt||result)return;
    const tick=()=>setRemaining(Math.max(0,Math.ceil(clock.current.seconds-Math.max(performance.now()-clock.current.started,Date.now()-clock.current.wallStarted)/1000)));
    tick();const timer=window.setInterval(tick,1000);document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
  },[attempt,result]);
  useEffect(()=>{
    if(attempt&&!result&&remaining===0&&!busy&&!autoSubmitted.current){autoSubmitted.current=true;submitRef.current();}
  },[attempt,result,remaining,busy]);
  const question=quiz?.questions[index];
  const time=`${Math.floor(remaining/3600).toString().padStart(2,'0')}:${Math.floor(remaining%3600/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`;
  const button='rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
  return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-6 text-white space-y-5">
    <button className="text-sm text-indigo-300" onClick={onBack}>← Back to Past Papers</button>
    <h1 className="text-2xl font-bold">{quiz?.title||'MCQ Paper Practice'}</h1>
    {error&&<div role="alert" className="rounded-xl bg-rose-500/10 p-4 text-rose-200">{error}</div>}
    {loading&&<p>Loading paper…</p>}
    {!loading&&!attempt&&!result&&<div className="space-y-4">
      <p>You have <strong>2 hours</strong> to complete this paper. Choose one answer per question; any officially accepted option earns one mark. Unanswered questions earn zero.</p>
      <p className="text-sm text-slate-300">Your answers save as you work. The timer continues if you leave or refresh. When time expires, only answers saved before the deadline are marked. Keep an internet connection while answering.</p>
      {missingAttempt&&<p className="text-amber-300">Your saved attempt could not be resumed. Refresh to retry, or explicitly start a new attempt below.</p>}
      <button className={button} disabled={busy} onClick={start}>{busy?'Starting…':'Start 2-hour paper'}</button>
    </div>}
    {result&&quiz?<>
      <h2 className="text-xl font-bold">Your marks: {result.score} / {result.total} ({result.percentage}%)</h2>
      {result.timedOut&&<p className="text-amber-300">Time is up. Your saved answers were submitted.</p>}
      <p className="text-sm text-slate-300">One mark per question. Any accepted option earns the mark. No negative marking.</p>
      {result.review.map((r:any,i:number)=><div key={i} className="border-t border-white/10 pt-4 space-y-2">
        <p className="font-semibold whitespace-pre-wrap">{i+1}. {quiz.questions[i].text}</p>
        {quiz.questions[i].imageId&&<img src={paperImageUrl(paperId,quiz.questions[i].imageId)} alt={quiz.questions[i].imageAlt||'Question diagram'} className="max-h-96 max-w-full object-contain bg-white rounded-lg"/>}
        <p className={r.correct?'text-emerald-300':'text-rose-300'}>{r.correct?'Correct':r.selectedIndices.length?'Incorrect':'Unanswered'} — Your answer: {r.selectedIndices.length?r.selectedIndices.map((n:number)=>`${n+1}. ${quiz.questions[i].options[n]}`).join(', '):'No answer'}</p>
        <p>Accepted {r.correctIndices.length===1?'answer':'answers'}: {r.correctIndices.map((n:number)=>`${n+1}. ${quiz.questions[i].options[n]}`).join(' OR ')}</p>
        {r.explanation&&<p className="whitespace-pre-wrap text-sm text-slate-300">{r.explanation}</p>}
      </div>)}
      <button className={button} disabled={busy} onClick={start}>Start a new 2-hour attempt</button>
    </>:attempt&&question&&<>
      <div className="sticky top-0 z-10 rounded-xl border border-white/15 bg-slate-900 p-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm">Question {index+1} of {quiz.questions.length} · {answers.filter(a=>a.length).length} answered</span>
        <span role="timer" aria-label="Time remaining" className={`font-mono text-lg font-bold ${remaining<=300?'text-rose-300':'text-cyan-300'}`}>{time}</span>
      </div>
      <p role="status" className="text-xs text-slate-300">{saveState}</p>
      {saveState!=='Answers saved'&&saveState!=='Saving answers…'&&remaining>0&&<button className={button} disabled={busy} onClick={()=>save(answersRef.current)}>Retry saving answers</button>}
      {remaining===0&&<p role="alert" className="text-amber-300">Time is up. Answers are locked.{busy?' Marking your saved answers…':' Use the button below if results have not appeared.'}</p>}
      <fieldset disabled={busy||remaining===0} className="space-y-3">
        <legend className="mb-4 whitespace-pre-wrap text-lg font-semibold">{question.text}</legend>
        {question.imageId&&<a href={paperImageUrl(paperId,question.imageId)} target="_blank" rel="noopener noreferrer"><img src={paperImageUrl(paperId,question.imageId)} alt={question.imageAlt||'Question diagram'} className="max-h-96 max-w-full object-contain bg-white rounded-lg"/></a>}
        {question.options.map((option:string,i:number)=><label key={i} className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${answers[index]?.includes(i)?'border-indigo-400 bg-indigo-500/10':'border-white/10'}`}>
          <input type="radio" name={'question-'+index} checked={answers[index]?.includes(i)||false} onChange={()=>select(i)}/><span className="whitespace-pre-wrap">{i+1}. {option}</span>
        </label>)}
      </fieldset>
      <div className="flex flex-wrap gap-2" aria-label="Question navigation">{quiz.questions.map((_:any,n:number)=><button key={n} aria-label={`Question ${n+1}${answers[n]?.length?', answered':', unanswered'}`} aria-current={index===n?'step':undefined} onClick={()=>setIndex(n)} className={`h-9 min-w-9 rounded-lg border px-2 text-sm ${index===n?'border-indigo-300 bg-indigo-600':answers[n]?.length?'border-emerald-500/40 bg-emerald-500/15':'border-white/15'}`}>{n+1}</button>)}</div>
      <div className="flex flex-wrap justify-between gap-3">
        <button className={button} disabled={index===0||busy} onClick={()=>setIndex(n=>n-1)}>Previous</button>
        {index<quiz.questions.length-1&&<button className={button} disabled={busy} onClick={()=>setIndex(n=>n+1)}>Next question</button>}
        <button className={button} disabled={busy} onClick={()=>{if(remaining===0||window.confirm(`Submit this paper? ${answers.filter(a=>!a.length).length} unanswered question(s) will receive zero marks.`))void submit();}}>{busy?'Marking…':remaining===0?'Show results':'Submit paper'}</button>
      </div>
    </>}
  </section>;
}
