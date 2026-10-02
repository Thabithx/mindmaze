import React from 'react';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading?: boolean;
  label?: string;
}

export function Pagination({page, pageSize, total, onPageChange, onPageSizeChange, loading = false, label = 'Results'}: PaginationProps) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, last);
  const pages = [...new Set([1, current - 1, current, current + 1, last])].filter(p => p > 0 && p <= last).sort((a,b)=>a-b);
  const button = 'min-h-9 min-w-9 rounded-lg border border-slate-500/40 px-3 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400';
  return <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-slate-400">
    <span role="status" className="text-xs">{loading ? 'Loading…' : `${total ? (current-1)*pageSize+1 : 0}–${Math.min(current*pageSize,total)} of ${total}`}</span>
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" className={button} disabled={loading || current === 1} onClick={()=>onPageChange(current-1)}>Previous</button>
      {pages.map((p,i)=><React.Fragment key={p}>{i>0 && p-pages[i-1]>1 && <span aria-hidden="true" className="px-1">…</span>}<button type="button" aria-label={`Page ${p}`} aria-current={p===current?'page':undefined} disabled={loading} className={`${button} ${p===current?'bg-indigo-600 text-white border-indigo-500':''}`} onClick={()=>onPageChange(p)}>{p}</button></React.Fragment>)}
      <button type="button" className={button} disabled={loading || current === last} onClick={()=>onPageChange(current+1)}>Next</button>
    </div>
    <label className="flex items-center gap-2 text-xs">Per page<select aria-label={`${label} per page`} value={pageSize} disabled={loading} onChange={e=>onPageSizeChange(Number(e.target.value))} className="rounded-lg border border-slate-500/40 bg-slate-900 px-2 py-2 text-slate-300">{[10,20,50].map(size=><option key={size} value={size}>{size}</option>)}</select></label>
  </nav>;
}
