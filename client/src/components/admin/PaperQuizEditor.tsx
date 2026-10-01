import React, {useEffect,useState} from 'react';
import {api} from '../../services/api';
import { PAPER_QUIZ_AI_PROMPT, parsePaperQuizImport, PaperQuestionDraft } from '../../lib/paperQuizImport';
type Question=PaperQuestionDraft;
const blank=():Question=>({text:'',options:['','','','',''],correctIndex:0,explanation:''});
export function PaperQuizEditor({paperId,title,onClose,onSaved}:{paperId:string;title:string;onClose:()=>void;onSaved:()=>void}) {
  const [questions,setQuestions]=useState<Question[]>([]);
  const [version,setVersion]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [reviewed,setReviewed]=useState(false);
  const [importText,setImportText]=useState('');
  const [importMessage,setImportMessage]=useState('');
  const importQuestions=()=>{
    try {
      const draft=parsePaperQuizImport(importText);
      setQuestions(draft);setReviewed(false);setError('');
      setImportMessage(`Imported ${draft.length} questions into the draft. Review them before publishing.`);
    } catch(e:any) { setError(e.message);setImportMessage(''); }
  };
  useEffect(()=>{let cancelled=false;api.getPaperQuizForEdit(paperId).then(data=>{if(!cancelled){setQuestions(data.questions.length?data.questions:[blank()]);setVersion(data.version||'');setLoading(false);}}).catch(e=>{if(!cancelled){setError(e.message);setLoading(false);}});return()=>{cancelled=true;};},[paperId]);
  const update=(i:number,patch:Partial<Question>)=>{setReviewed(false);setQuestions(prev=>prev.map((q,n)=>n===i?{...q,...patch}:q));};
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy||!reviewed)return;
    if(questions.some(q=>q.correctIndex<0||q.reviewNote?.trim())){setError('Resolve each review note and select every correct answer before publishing.');return;}
    setBusy(true);setError('');
    try{await api.savePaperQuiz(paperId,{questions,version});onSaved();onClose();}catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const input='w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-white';
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Edit paper questions">
    <form onSubmit={save} className="mx-auto max-w-3xl rounded-2xl bg-slate-900 p-6 text-white space-y-5">
      <div className="flex justify-between gap-4"><h2 className="text-xl font-bold">MCQ questions — {title}</h2><button type="button" disabled={busy} onClick={onClose}>Close</button></div>
      <p className="text-sm text-slate-300">Enter the questions from this paper in order and check the official answer key. The PDF is kept separately for download. One correct answer earns one mark. Diagrams must be described in the question text for this version.</p>
      {loading&&<p>Loading…</p>}{error&&<p role="alert" className="text-rose-300">{error}</p>}
      <details className="rounded-xl border border-indigo-400/30 bg-indigo-500/5 p-4 space-y-3">
        <summary className="cursor-pointer font-semibold text-indigo-200">Import questions from AI output</summary>
        <p className="text-sm text-slate-300">Give your AI the question PDF and matching answer PDF, then use this prompt. Paste its JSON below. Importing replaces this editor’s unsaved draft; it does not publish anything.</p>
        <textarea aria-label="AI extraction prompt" readOnly rows={7} value={PAPER_QUIZ_AI_PROMPT} className={input}/>
        <button type="button" className="rounded-lg bg-indigo-600 px-3 py-2" onClick={async()=>{try{await navigator.clipboard.writeText(PAPER_QUIZ_AI_PROMPT);setImportMessage('Prompt copied.');}catch{setImportMessage('Select and copy the prompt text above.');}}}>Copy AI prompt</button>
        <label className="block text-sm">Paste AI JSON output<textarea rows={8} className={input} value={importText} onChange={e=>setImportText(e.target.value)} placeholder={'{"questions": [...]}'}/></label>
        <button type="button" disabled={loading||busy||!importText.trim()} onClick={importQuestions} className="rounded-lg bg-indigo-600 px-3 py-2 disabled:opacity-40">Replace draft with imported questions</button>
        {importMessage&&<p role="status" className="text-sm text-emerald-300">{importMessage}</p>}
      </details>
      <fieldset disabled={loading||busy} className="space-y-5">
        {questions.map((q,i)=><section key={i} className="rounded-xl border border-white/10 p-4 space-y-3">
          <div className="flex justify-between"><h3 className="font-bold">Question {i+1}</h3><button type="button" className="text-rose-300" onClick={()=>{setQuestions(prev=>prev.filter((_,n)=>n!==i));setReviewed(false);}}>Remove</button></div>
          {q.reviewNote&&<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200"><p>Review required: {q.reviewNote}</p><button type="button" className="mt-2 underline" onClick={()=>update(i,{reviewNote:''})}>I corrected this question against the PDF</button></div>}
          <label className="block">Question text<textarea required className={input} value={q.text} onChange={e=>update(i,{text:e.target.value})}/></label>
          {q.options.map((option,n)=><label key={n} className="block text-sm">Answer {n+1}<input required className={input} value={option} onChange={e=>update(i,{options:q.options.map((v,k)=>k===n?e.target.value:v)})}/></label>)}
          <div className="flex gap-3"><button type="button" disabled={q.options.length>=5} onClick={()=>update(i,{options:[...q.options,'']})}>Add answer</button><button type="button" disabled={q.options.length<=2} onClick={()=>update(i,{options:q.options.slice(0,-1),correctIndex:Math.min(q.correctIndex,q.options.length-2)})}>Remove last answer</button></div>
          <label className="block">Correct answer<select required className={input} value={q.correctIndex<0?'':q.correctIndex} onChange={e=>update(i,{correctIndex:Number(e.target.value)})}><option value="" disabled>Select the verified correct answer</option>{q.options.map((_,n)=><option key={n} value={n}>Answer {n+1}</option>)}</select></label>
          <label className="block">Explanation (optional)<textarea className={input} value={q.explanation} onChange={e=>update(i,{explanation:e.target.value})}/></label>
        </section>)}
        <button type="button" disabled={questions.length>=100} onClick={()=>{setQuestions(prev=>[...prev,blank()]);setReviewed(false);}} className="rounded-lg bg-white/10 p-3">Add question</button>
        <label className="flex gap-3"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>{questions.length?'I checked all questions and correct answers against this paper.':'Remove online practice questions from this paper.'}</label>
        <button type="submit" disabled={!reviewed||busy} className="rounded-xl bg-indigo-600 px-5 py-3 disabled:opacity-40">{busy?'Saving…':questions.length?'Publish questions':'Remove practice questions'}</button>
      </fieldset>
    </form>
  </div>;
}
