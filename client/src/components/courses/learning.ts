export interface Lesson {
  _id:string; title:string; description:string; subject:string; stream:string; topic:string;
  topicOrder:number; lessonOrder:number; estimatedMinutes:number; medium:string; syllabus:string;
  status:string; revision:number; videoCount:number; resourceCount:number; quizCount:number;
  videos?:{title:string;url:string}[];
  resources?:{id:string;title:string;size?:number;path:string}[];
  quiz?:{questionText:string;options:string[];correctOptionIndex?:number;explanation?:string}[];
  relatedPaperIds?:string[]; relatedPapers?:{_id:string;title:string;pdfPath:string}[];
}
export interface Progress {course:string;completed:boolean;lastOpenedAt:string;quizScore:number|null;quizTotal:number;needsRevision:boolean}
export const subjects=['Physics','Chemistry','Biology','Combined Maths','ICT'];
export const control='learning-control w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400';
export const button='learning-button rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50';
export const panel='learning-panel rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 space-y-4';
export function youtubeEmbed(link:string) {
  try {
    const u=new URL(link);let id='';
    if(u.hostname==='youtu.be')id=u.pathname.slice(1);
    else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]||'';
    return /^[\w-]{11}$/.test(id)?`https://www.youtube-nocookie.com/embed/${id}`:null;
  }catch{return null;}
}
export function safeLink(link:string){try{return ['https:','http:'].includes(new URL(link).protocol);}catch{return false;}}
