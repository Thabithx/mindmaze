import React,{useState} from 'react';
import {api} from '../services/api';
export function EmailVerificationPanel({user,onVerified,onSignOut,required=false}:{user:any;onVerified:(user:any)=>void;onSignOut:()=>void;required?:boolean}) {
 const [code,setCode]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [expanded,setExpanded]=useState(required||!!user.pendingEmail);
 const send=async()=>{setBusy(true);setMessage('');try{const r=await api.sendEmailVerification();setMessage(r.message);}catch(e:any){setMessage(e.message);}finally{setBusy(false);}};
 const verify=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{const r=await api.confirmEmailVerification(code);onVerified(r.user);}catch(e:any){setMessage(e.message);}finally{setBusy(false);}};
 return <section className="rounded-2xl border border-indigo-400/30 bg-slate-900 p-5 text-slate-100 mx-auto w-full max-w-2xl" aria-label="Email verification">
 <h2 className="font-bold text-lg">{user.pendingEmail?'Confirm your new email':required?'Verify your email to continue':'Please verify your email'}</h2>
 <p className="text-sm text-slate-300 mt-2">{required?'Check your inbox for a six-digit code.':user.pendingEmail?'Your current email remains your login until you confirm the new address.':'Your existing account remains accessible while you verify.'} Codes expire after 10 minutes.</p>
 <p className="text-sm mt-2 break-all">{user.pendingEmail||user.email}</p>
 {!expanded?<button type="button" className="mt-3 rounded-lg bg-indigo-600 text-white px-4 py-2" onClick={()=>setExpanded(true)}>Verify email</button>:<form onSubmit={verify} className="mt-4 space-y-3">
 <label className="block text-sm">Verification code<input aria-label="Verification code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} className="block w-full rounded-lg bg-slate-950 border border-white/20 p-3 mt-1"/></label>
 <div className="flex flex-wrap gap-3"><button disabled={busy||code.length!==6} className="rounded-lg bg-indigo-600 text-white px-4 py-2 disabled:opacity-40">{busy?'Please wait…':'Confirm code'}</button><button type="button" disabled={busy} onClick={send} className="px-3 py-2 underline disabled:opacity-40">Send / resend code</button></div>
 <p className="text-xs text-slate-400">Wait 60 seconds between requests. Maximum 5 sends per hour and 5 attempts per code.</p>
 </form>}
 {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
 {required&&<button type="button" onClick={onSignOut} className="mt-4 underline text-sm">Sign out</button>}
 </section>;
}
