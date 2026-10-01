import { useSyncExternalStore } from 'react';
export const normalizeBatch = (value: unknown): string => /^20\d{2}$/.test(String(value)) ? String(value) : value === 'Batch 2' ? '2028' : '2027';

export type Batch = {year:string;examDate:string};
let batches:Batch[]=[{year:'2027',examDate:'2027-11-25'},{year:'2028',examDate:'2028-11-25'}];
try { const saved=JSON.parse(localStorage.getItem('mindmaze_batches')||'null');if(Array.isArray(saved)&&saved.length===2&&saved.every(b=>/^20\d{2}$/.test(b.year)&&typeof b.examDate==='string'))batches=saved; }catch{}
const listeners=new Set<()=>void>();
export function setBatches(value:Batch[]) { if(!Array.isArray(value)||value.length!==2)return;batches=value;try{localStorage.setItem('mindmaze_batches',JSON.stringify(value));}catch{}listeners.forEach(fn=>fn()); }
export function useBatches(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>batches);}
