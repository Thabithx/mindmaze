import React,{useState} from 'react';
import {api} from '../../services/api';
export function MarkingSchemeUpload({paper}:{paper:any}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <div className="mb-3 text-xs"><label className="block text-indigo-300">{busy?'Uploading…':paper.markingSchemeUrl?'Replace marking scheme PDF':'Add marking scheme PDF'}<input aria-label={'Marking scheme for '+paper.title} type="file" accept="application/pdf,.pdf" disabled={busy} className="block max-w-[220px] mt-1" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>25*1024*1024){setMessage('Maximum PDF size is 25 MiB.');return;}setBusy(true);setMessage('');try{await api.uploadMarkingScheme(paper.id,file);setMessage('Marking scheme saved.');window.dispatchEvent(new Event('mindmaze_papers_updated'));}catch(err:any){setMessage(err.message);}finally{setBusy(false);}}}/></label>{message&&<p role="status">{message}</p>}</div>;
}
