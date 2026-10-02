import {useEffect,useState} from 'react';
import {apiFetch,api} from '../services/api';
const EMPTY: never[]=[];

export function usePagedResource<T>(endpoint:string, field:string, filters:Record<string,string> = {}, event?:string, enabled=true) {
  const key=JSON.stringify(filters);
  const [state,setState]=useState({key,page:1,pageSize:20});
  const page=state.key===key?state.page:1;
  useEffect(()=>setState(s=>s.key===key?s:{...s,key,page:1}),[key]);
  const [revision,setRevision]=useState(0);
  const [result,setResult]=useState<{key:string;items:T[];total:number;page:number}|null>(null);
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const requestKey=JSON.stringify([key,page,state.pageSize,revision]);
  useEffect(()=>{
    if(!enabled)return;
    let cancelled=false;
    const controller=new AbortController();
    setLoading(true);setError('');
    // Debounce typing, and cancel obsolete requests on filter/page changes.
    const timer=setTimeout(()=>{
      const query=new URLSearchParams({...JSON.parse(key),page:String(page),pageSize:String(state.pageSize)});
      apiFetch(`${endpoint}?${query}`,{signal:controller.signal}).then(data=>{
        if(cancelled)return;
        const items=field==='papers'?data.papers.map(api.presentPaper):data[field];
        setResult({key:requestKey,items,total:data.pagination.total,page:data.pagination.page});
        if(data.pagination.page!==page)setState(s=>({...s,key,page:data.pagination.page}));
      }).catch(e=>{if(!cancelled){setResult(null);setError(e.message);}}).finally(()=>{if(!cancelled)setLoading(false);});
    },200);
    return()=>{cancelled=true;clearTimeout(timer);controller.abort();};
  },[endpoint,field,key,page,state.pageSize,revision,enabled]);
  const reload=()=>setRevision(n=>n+1);
  useEffect(()=>{if(!event)return;window.addEventListener(event,reload);return()=>window.removeEventListener(event,reload);},[event]);
  const current=result?.key===requestKey;
  return {items:current?result.items:EMPTY,error,loading:enabled&&(loading||(!current&&!error)),reload,
    pagination:{page:current?result.page:page,pageSize:state.pageSize,total:result?.total||0,loading:enabled&&(loading||(!current&&!error)),
      onPageChange:(page:number)=>setState(s=>({...s,key,page})),onPageSizeChange:(pageSize:number)=>setState({key,page:1,pageSize})}};
}

export function usePaperFilters() {
  const [facets,setFacets]=useState<{subjects:string[];years:number[];mediums:string[]}>({subjects:[],years:[],mediums:[]});
  useEffect(()=>{let cancelled=false;const load=()=>apiFetch('/past-papers/filters').then(data=>{if(!cancelled)setFacets(data);}).catch(()=>{});load();window.addEventListener('mindmaze_papers_updated',load);return()=>{cancelled=true;window.removeEventListener('mindmaze_papers_updated',load);};},[]);
  return facets;
}
