import React,{useState} from 'react';
export function MarkingSchemeButton({paper}:{paper:any}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!paper.markingSchemeUrl)return null;
 return <span className="inline-flex flex-col"><button type="button" disabled={busy} className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-40" onClick={async()=>{setBusy(true);setError('');try{const r=await fetch(paper.markingSchemeUrl);if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(e.message||'Could not download marking scheme.');}const url=URL.createObjectURL(await r.blob());const link=document.createElement('a');link.href=url;link.download=paper.title+' - Marking Scheme.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>{busy?'Downloading…':'Marking Scheme'}</button>{error&&<span role="alert" className="text-xs text-rose-300">{error}</span>}</span>;
}
