import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function PaperPracticeScreen({paperId,onBack}:{paperId:string;onBack:()=>void}) {
  const [quiz,setQuiz]=useState<any>(null);
  const [answers,setAnswers]=useState<number[]>([]);
  const [index,setIndex]=useState(0);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    setQuiz(null);setError('');setResult(null);setIndex(0);
    api.getPaperQuiz(paperId).then(data=>{if(!cancelled){setQuiz(data);setAnswers(Array(data.questions.length).fill(-1));}}).catch(e=>{if(!cancelled)setError(e.message);});
    return ()=>{cancelled=true;};
  },[paperId,reload]);
  const question=quiz?.questions[index];
  const button='rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40';
  const submit=async()=>{
    if(busy)return;
    setBusy(true);setError('');
    try {setResult(await api.submitPaperQuiz(paperId,{version:quiz.version,answers}));}
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-6 text-white space-y-5">
    <button className="text-sm text-indigo-300" onClick={onBack}>← Back to Past Papers</button>
    <h1 className="text-2xl font-bold">{quiz?.title || 'MCQ Paper Practice'}</h1>
    {error&&<div role="alert" className="rounded-xl bg-rose-500/10 p-4 text-rose-200">{error}<button className="block underline mt-2" onClick={()=>setReload(v=>v+1)}>Reload questions</button></div>}
    {!quiz&&!error&&<p>Loading questions…</p>}
    {result ? <>
      <h2 className="text-xl font-bold">Your marks: {result.score} / {result.total} ({result.percentage}%)</h2>
      <p className="text-sm text-slate-300">One mark per correct answer. No negative marking. This is a practice result, not an official examination grade.</p>
      {result.review.map((r:any,i:number)=><div key={i} className="border-t border-white/10 pt-4 space-y-1">
        <p className="font-semibold">{i+1}. {quiz.questions[i].text}</p>
        <p className={r.correct?'text-emerald-300':'text-rose-300'}>{r.correct?'Correct':'Incorrect'} — Your answer: {quiz.questions[i].options[answers[i]]}</p>
        {!r.correct&&<p>Correct answer: {quiz.questions[i].options[r.correctIndex]}</p>}
        {r.explanation&&<p className="text-sm text-slate-400">{r.explanation}</p>}
      </div>)}
      <button className={button} onClick={()=>setReload(v=>v+1)}>Try again</button>
    </> : question&&<>
      <p className="text-sm text-slate-400">Question {index+1} of {quiz.questions.length} · {answers.filter(a=>a>=0).length} answered</p>
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-4 whitespace-pre-wrap text-lg font-semibold">{question.text}</legend>
        {question.options.map((option:string,i:number)=><label key={i} className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${answers[index]===i?'border-indigo-400 bg-indigo-500/10':'border-white/10'}`}>
          <input type="radio" name={'question-'+index} checked={answers[index]===i} onChange={()=>setAnswers(prev=>prev.map((v,n)=>n===index?i:v))}/>
          <span className="whitespace-pre-wrap">{i+1}. {option}</span>
        </label>)}
      </fieldset>
      <div className="flex flex-wrap justify-between gap-3">
        <button className={button} disabled={index===0||busy} onClick={()=>setIndex(v=>v-1)}>Previous</button>
        {index<quiz.questions.length-1?<button className={button} disabled={answers[index]<0||busy} onClick={()=>setIndex(v=>v+1)}>Next question</button>:<button className={button} disabled={answers.some(a=>a<0)||busy} onClick={submit}>{busy?'Marking…':'Submit paper and show marks'}</button>}
      </div>
    </>}
  </section>;
}
