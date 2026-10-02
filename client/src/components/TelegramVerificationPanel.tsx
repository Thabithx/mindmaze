import React,{useEffect,useState} from 'react';
import {api} from '../services/api';
export function TelegramVerificationPanel({user,required=false,onVerified,onSignOut}:{user:any;required?:boolean;onVerified:(u:any)=>void;onSignOut:()=>void}){
 const [status,setStatus]=useState<any>(null),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[url,setUrl]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[expanded,setExpanded]=useState(required);
 useEffect(()=>{let active=true;api.telegramStatus().then(s=>{if(active){setStatus(s);setPhone(s.phone||'');}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[user.id,user._id]);
 if(!required&&(!status?.enabled||(status?.accountVerified||status?.telegramVerified)))return null;
 const checkApproval=async()=>{setBusy(true);setMessage('');try{const r=await api.getProfile();if(r.user?.accountVerified||r.user?.telegramVerified)onVerified(r.user);else setMessage('Your account has not been approved yet. Contact support below.');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}};
 const start=async()=>{setBusy(true);setMessage('');setUrl('');setCode('');try{const r=await api.startTelegramVerification({phone,currentPassword:password});setUrl(r.url);setPhone(r.phone);setMessage(r.message);setPassword('');}catch(e:any){setMessage(e.message);}finally{setBusy(false);}};
 const confirm=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{const r=await api.confirmTelegramVerification(code);onVerified(r.user);}catch(e:any){setMessage(e.message);}finally{setBusy(false);}};
 return <section aria-label="Telegram phone verification" className="mx-auto max-w-2xl rounded-2xl border border-cyan-400/30 bg-slate-900 p-5 text-slate-100 space-y-3">
 <h2 className="text-lg font-bold">{required?'Verify your phone to continue':'Verify your phone with Telegram'}</h2>
 <p className="text-sm text-slate-300">{required?'Verify your phone through Telegram or contact our team for manual verification.':'Verification is optional for your existing account; you can keep using MindMaze.'} You need Telegram with the same phone number.</p>
 {!status&&<p role="status">{message||'Checking verification availability…'}</p>}
 {status&&!status.configured&&<p role="status">Verification setup is not complete. Contact the MindMaze team.</p>}
 {!expanded&&<button type="button" onClick={()=>setExpanded(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Verify with Telegram</button>}
 {expanded&&status?.configured&&<>
 <p className="text-sm text-slate-300">1. Create your link. 2. Open the bot and press Start, then Share my phone number. 3. Enter the bot's code below. Only your own Telegram contact is accepted.</p>
 <label className="block text-sm">Telegram phone number<input aria-label="Telegram phone number" type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+947XXXXXXXX" className="block w-full rounded-lg border border-white/20 bg-slate-950 p-2"/></label>
 {phone!==status.phone&&<label className="block text-sm">Current password to change your number<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-full rounded-lg border border-white/20 bg-slate-950 p-2"/></label>}
 <button type="button" disabled={busy||!phone.trim()} onClick={start} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-40">{busy?'Please wait…':'Create verification link'}</button>
 {url&&<a href={url} target="_blank" rel="noopener noreferrer" className="block underline text-cyan-300">Open Telegram bot</a>}
 <form onSubmit={confirm} className="space-y-2"><label className="block text-sm">Six-digit code from Telegram<input aria-label="Telegram verification code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} className="block w-full rounded-lg border border-white/20 bg-slate-950 p-2"/></label><button disabled={busy||code.length!==6} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-40">Confirm verification</button></form>
 <p className="text-xs text-slate-400">Your link lasts 10 minutes. Wait 60 seconds between requests. Five incorrect code attempts require a new link. MindMaze stores your verified phone number and Telegram account ID to prevent reuse across accounts.</p>
 </>}
 {message&&status&&<p role="status" className="text-sm">{message}</p>}
 <div className="rounded-xl border border-white/15 bg-slate-950 p-4 space-y-3">
 <h3 className="font-semibold">Don't have Telegram? Contact support</h3>
 <p className="text-sm text-slate-300">The Mind Maze team can verify your registered phone number by a call or WhatsApp. Tell us your account email and registered number. Never share your password or login codes.</p>
 <div className="text-sm space-y-2">
 <p>Asjadh Azhar — <a className="underline text-cyan-300" href="tel:+94741138588">+94741138588</a> · <a className="underline text-cyan-300" href="https://wa.me/94741138588" target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
 <p>Athif Ahamed — <a className="underline text-cyan-300" href="tel:+94772065719">+94772065719</a> · <a className="underline text-cyan-300" href="https://wa.me/94772065719" target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
 </div>
 <button type="button" disabled={busy} onClick={checkApproval} className="rounded-lg bg-indigo-600 px-4 py-2 disabled:opacity-40">{busy?'Please wait…':'Check approval'}</button>
 </div>
 {required&&<button type="button" onClick={onSignOut} className="text-sm underline">Sign out</button>}
 </section>;
}
