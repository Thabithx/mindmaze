import {readPagination,pageInfo,paperListFilter,PaginationError} from '../services/pagination.js';
import PaperAsset from '../models/PaperAsset.js';
import { removeAsset } from '../services/paperAssets.js';
import { deliverRemotePdf } from '../services/pdfDelivery.js';
import {Router} from 'express';
import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import PastPaper from '../models/PastPaper.js';
import cloudinary from '../config/cloudinary.js';
import {protect,contentManagerOnly,AuthRequest} from '../middleware/authMiddleware.js';
const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024}}).single('pdfFile');
const directory=()=>path.resolve(process.env.UPLOAD_DIR||'uploads');
const present=(p:any)=>({id:String(p._id),questionCount:p.questionCount??p.quizQuestions?.length??0,quizReady:p.type==='MCQ'&&Boolean(p.questionCount??p.quizQuestions?.length),title:p.title,subject:p.subject,stream:p.stream,streams:p.streams?.length?p.streams:p.stream==='Both'?['Maths','Bio']:[p.stream==='Physical Science'?'Maths':p.stream==='Biological Science'?'Bio':p.stream||'Non-stream'],year:p.year,syllabus:p.syllabus,type:p.type,medium:p.medium,isModelPaper:p.isModelPaper,topicTags:p.topicTags||[],downloadSize:`${(p.size/1024/1024).toFixed(2)} MB`,markingSchemePath:p.markingSchemeId?`/past-papers/${p._id}/marking-scheme`:null,pdfPath:`/past-papers/${p._id}/download`});
async function removeFile(p:any){if(p.provider==='local')await unlink(path.join(directory(),path.basename(p.fileKey))).catch((e:any)=>{if(e.code!=='ENOENT')throw e;});else await cloudinary.uploader.destroy(p.fileKey,{resource_type:'raw'});}
router.get('/filters',async(_req,res)=>{try{
  const [subjects,years,mediums]=await Promise.all([PastPaper.distinct('subject'),PastPaper.distinct('year'),PastPaper.distinct('medium')]);
  res.json({subjects:subjects.sort(),years:years.sort((a,b)=>b-a),mediums:mediums.sort()});
}catch{res.status(500).json({message:'Could not load paper filters.'});}});
router.get('/',async(req,res)=>{try{
  const requested=readPagination(req.query),filter=paperListFilter(req.query);
  const pagination=pageInfo(await PastPaper.countDocuments(filter),requested);
  const papers=await PastPaper.aggregate([{$match:filter},{$sort:{createdAt:-1,_id:-1}},{$skip:(pagination.page-1)*pagination.pageSize},{$limit:pagination.pageSize},{$project:{title:1,subject:1,stream:1,streams:1,year:1,syllabus:1,type:1,medium:1,isModelPaper:1,topicTags:1,size:1,markingSchemeId:1,questionCount:{$size:{$ifNull:['$quizQuestions',[]]}}}}]);
  res.json({papers:papers.map(present),pagination});
}catch(e){res.status(e instanceof PaginationError?400:500).json({message:e instanceof PaginationError?e.message:'Could not load published papers.'});}});
const savePaper = (updating:boolean) => [protect,contentManagerOnly,(req:import('express').Request,res:import('express').Response,next:import('express').NextFunction)=>{upload(req,res,e=>{if(e)res.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({message:e.code==='LIMIT_FILE_SIZE'?'The PDF exceeds the application limit of 25 MiB. Compress it before uploading.':e.message});else next();});},async(req:AuthRequest,res:import('express').Response)=>{
  let stored:any;
  try{
    const existing = updating ? await PastPaper.findById(req.params.id) : null;
    if(updating&&!existing){res.status(404).json({message:'Paper not found.'});return;}
    if((!updating&&!req.file)||(req.file&&req.file.buffer.subarray(0,5).toString()!=='%PDF-')){res.status(400).json({message:'Select a valid PDF file (maximum 25 MB).'});return;}
    const {title,subject,year,syllabus,type,medium}=req.body;
    let streams:any;
    try { streams=req.body.streams?JSON.parse(req.body.streams):[req.body.stream]; }catch{res.status(400).json({message:'Invalid target streams.'});return;}
    if(Array.isArray(streams)) streams=streams.flatMap(s=>s==='Both'?['Maths','Bio']:[s==='Physical Science'?'Maths':s==='Biological Science'?'Bio':s]);
    if(!Array.isArray(streams)||!streams.length||streams.some(s=>!['Maths','Bio','Non-stream'].includes(s))){res.status(400).json({message:'Select one or more valid target streams.'});return;}
    streams=[...new Set(streams)];const stream=streams[0];
    if(![title,subject,stream,medium].every(v=>typeof v==='string'&&v.trim())||!Number.isInteger(Number(year))||Number(year)<2000||Number(year)>2100){res.status(400).json({message:'Provide a title, subject, stream, medium and valid year.'});return;}
    if(!['MCQ','Structured','Essay'].includes(type)||!['current','old'].includes(syllabus)||!['English','Sinhala','Tamil'].includes(medium)){res.status(400).json({message:'Select a valid paper type, syllabus and medium.'});return;}
    if(req.file){
    if(process.env.UPLOAD_STORAGE==='local'){
      const fileKey=`${randomUUID()}.pdf`;await mkdir(directory(),{recursive:true});await writeFile(path.join(directory(),fileKey),req.file.buffer,{flag:'wx'});stored={provider:'local',fileKey};
    }else{
      if(!process.env.CLOUDINARY_CLOUD_NAME||!process.env.CLOUDINARY_API_KEY||!process.env.CLOUDINARY_API_SECRET||process.env.CLOUDINARY_CLOUD_NAME==='local-disabled'){
        res.status(503).json({message:'PDF storage is not configured. Ask the administrator to configure Cloudinary.'});return;
      }
      const result:any=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({resource_type:'raw',folder:'mind_maze_past_papers',public_id:`${randomUUID()}.pdf`},(e,r)=>{
        if(e){
          const message=String(e.message||'');
          const tooLarge=e.http_code===413||/file size too large|file too large|maximum.*file.*size|exceeds.*size.*limit/i.test(message);
          const timedOut=e.http_code===408||e.http_code===504||/timeout|timed out/i.test(message);
          reject(Object.assign(new Error(tooLarge?'Cloudinary rejected this PDF because it exceeds your storage account’s file-size limit. Compress the PDF or increase the Cloudinary raw-file limit, then retry.':timedOut?'The PDF storage service timed out. Please retry the upload.':'The PDF storage service could not accept the file. Check its configuration and account limits.'),{uploadStatus:tooLarge?413:timedOut?504:502}));
        }else resolve(r);
      });stream.end(req.file!.buffer);});
      stored={provider:'cloudinary',fileKey:result.public_id,remoteUrl:result.secure_url};
    }
    }
    const details={title:title.trim(),subject,stream,streams,year:Number(year),syllabus,type,medium,isModelPaper:req.body.isModelPaper==='true',...(req.file?{fileName:req.file.originalname,size:req.file.size,...stored}:{})};
    const previous=existing?.toObject();
    const paper=existing ? await PastPaper.findByIdAndUpdate(existing._id,{$set:details},{new:true,runValidators:true}) : await PastPaper.create({...details,createdBy:req.user!._id});
    if(!paper){if(stored)await removeFile(stored).catch(()=>{});res.status(404).json({message:'Paper not found.'});return;}
    stored=undefined;
    if(previous&&req.file)await removeFile(previous).catch(()=>{});
    res.status(updating?200:201).json({paper:present(paper)});
  }catch(e:any){if(stored)await removeFile(stored).catch(()=>{});res.status(e.uploadStatus||(e?.name==='CastError'?400:500)).json({message:e.uploadStatus?e.message:updating?'Could not update the paper. Please try again.':'Could not publish the paper. Please try again.'});}
}] as import('express').RequestHandler[];
router.post('/',...savePaper(false));
router.put('/:id',...savePaper(true));
router.get('/:id/download',async(req,res)=>{
  try{
    const p=await PastPaper.findById(req.params.id);if(!p){res.status(404).json({message:'Paper not found.'});return;}
    if(p.provider==='local'){res.download(path.join(directory(),path.basename(p.fileKey)),p.fileName,error=>{if(error&&!res.headersSent)res.status(404).json({message:'PDF file is missing. Ask the administrator to upload it again.'});});return;}
    await deliverRemotePdf(p.remoteUrl,p.fileName,res);
  }catch{if(!res.headersSent)res.status(500).json({message:'Could not download this paper.'});}
});
router.delete('/:id',protect,contentManagerOnly,async(req,res)=>{try{const p=await PastPaper.findById(req.params.id);if(!p){res.status(404).json({message:'Paper not found.'});return;}await removeFile(p);await p.deleteOne();for(const asset of await PaperAsset.find({paper:p._id}))await removeAsset(asset).catch(()=>{});res.json({message:'Paper removed.'});}catch{res.status(500).json({message:'Could not remove the paper.'});}});
export default router;
