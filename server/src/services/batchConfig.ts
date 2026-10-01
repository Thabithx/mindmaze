import SiteConfig from '../models/SiteConfig.js';
export type BatchConfig = {year:string;examDate:string}[];
export async function getBatchConfig(): Promise<BatchConfig> {
 const saved=await SiteConfig.findOne({key:'active_batches'});
 if(saved) return JSON.parse(saved.value);
 const dates=await SiteConfig.find({key:{$in:['upcoming_exam_date_2027','upcoming_exam_date_2028']}});
 return ['2027','2028'].map(year=>({year,examDate:dates.find(d=>d.key==='upcoming_exam_date_'+year)?.value||year+'-11-25'}));
}
export function validBatches(batches:any): batches is BatchConfig {
 return Array.isArray(batches)&&batches.length===2&&batches.every(b=>b&&/^20\d{2}$/.test(b.year)&&typeof b.examDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.examDate)&&b.examDate.slice(0,4)===b.year&&Number.isFinite(Date.parse(b.examDate))&&new Date(b.examDate).toISOString().slice(0,10)===b.examDate)&&Number(batches[0].year)<Number(batches[1].year);
}
