import {useEffect,useState} from 'react';

// Keep complete offline/synchronised data intact; only page its rendered rows.
export function usePagination<T>(items: T[], resetKey = '') {
  const [state, setState] = useState({key:resetKey,page:1,pageSize:20});
  const page = state.key === resetKey ? Math.min(state.page, Math.max(1, Math.ceil(items.length/state.pageSize))) : 1;
  useEffect(()=>setState(s=>s.key===resetKey&&s.page===page?s:{...s,key:resetKey,page}),[resetKey,page]);
  const onPageChange = (next: number) => setState(s=>({...s,key:resetKey,page:Math.max(1,next)}));
  const onPageSizeChange = (pageSize: number) => setState({key:resetKey,page:1,pageSize});
  return {items:items.slice((page-1)*state.pageSize,page*state.pageSize),offset:(page-1)*state.pageSize,
    pagination:{page,pageSize:state.pageSize,total:items.length,onPageChange,onPageSizeChange}};
}
