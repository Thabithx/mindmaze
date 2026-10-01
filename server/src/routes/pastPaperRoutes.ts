import { deliverRemotePdf } from '../services/pdfDelivery.js';
import {Router} from 'express';
import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import PastPaper from '../models/PastPaper.js';
import cloudinary from '../config/cloudinary.js';
import {protect,adminOnly,AuthRequest} from '../middleware/authMiddleware.js';
const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024}}).single('pdfFile');
const directory=()=>path.resolve(process.env.UPLOAD_DIR||'uploads');
const present=(p:any)=>({id:String(p._id),questionCount:p.quizQuestions?.length||0,quizReady:p.type==='MCQ'&&Boolean(p.quizQuestions?.length),title:p.title,subject:p.subject,stream:p.stream,streams:p.streams?.length?p.streams:p.stream==='Both'?['Maths','Bio']:[p.stream==='Physical Science'?'Maths':p.stream==='Biological Science'?'Bio':p.stream||'Non-stream'],year:p.year,syllabus:p.syllabus,type:p.type,medium:p.medium,isModelPaper:p.isModelPaper,topicTags:p.topicTags||[],downloadSize:`${(p.size/1024/1024).toFixed(2)} MB`,pdfPath:`/past-papers/${p._id}/download`});
async function removeFile(p:any){if(p.provider==='local')await unlink(path.join(directory(),path.basename(p.fileKey))).catch((e:any)=>{if(e.code!=='ENOENT')throw e;});else await cloudinary.uploader.destroy(p.fileKey,{resource_type:'raw'});}
router.get('/',async(_req,res)=>{try{res.json({papers:(await PastPaper.find().sort({createdAt:-1})).map(present)});}catch{res.status(500).json({message:'Could not load published papers.'});}});
router.post('/',protect,adminOnly,(req,res,next)=>{upload(req,res,e=>{if(e)res.status(400).json({message:e.message});else next();});},async(req:AuthRequest,res)=>{
  let stored:any;
  try{
    if(!req.file||req.file.buffer.subarray(0,5).toString()!=='%PDF-'){res.status(400).json({message:'Select a valid PDF file (maximum 25 MB).'});return;}
    const {title,subject,year,syllabus,type,medium}=req.body;
    let streams:any;
    try { streams=req.body.streams?JSON.parse(req.body.streams):[req.body.stream]; }catch{res.status(400).json({message:'Invalid target streams.'});return;}
    if(Array.isArray(streams)) streams=streams.flatMap(s=>s==='Both'?['Maths','Bio']:[s==='Physical Science'?'Maths':s==='Biological Science'?'Bio':s]);
    if(!Array.isArray(streams)||!streams.length||streams.some(s=>!['Maths','Bio','Non-stream'].includes(s))){res.status(400).json({message:'Select one or more valid target streams.'});return;}
    streams=[...new Set(streams)];const stream=streams[0];
    if(![title,subject,stream,medium].every(v=>typeof v==='string'&&v.trim())||!Number.isInteger(Number(year))||Number(year)<2000||Number(year)>2100){res.status(400).json({message:'Provide a title, subject, stream, medium and valid year.'});return;}
    if(process.env.UPLOAD_STORAGE==='local'){
      const fileKey=`${randomUUID()}.pdf`;await mkdir(directory(),{recursive:true});await writeFile(path.join(directory(),fileKey),req.file.buffer,{flag:'wx'});stored={provider:'local',fileKey};
    }else{
      if(!process.env.CLOUDINARY_CLOUD_NAME||!process.env.CLOUDINARY_API_KEY||!process.env.CLOUDINARY_API_SECRET||process.env.CLOUDINARY_CLOUD_NAME==='local-disabled'){
        res.status(503).json({message:'PDF storage is not configured. Ask the administrator to configure Cloudinary.'});return;
      }
      const result:any=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({resource_type:'raw',folder:'mind_maze_past_papers',public_id:`${randomUUID()}.pdf`},(e,r)=>e?reject(e):resolve(r));stream.end(req.file!.buffer);});
      stored={provider:'cloudinary',fileKey:result.public_id,remoteUrl:result.secure_url};
    }
    const paper=await PastPaper.create({title:title.trim(),subject,stream,streams,year:Number(year),syllabus:syllabus||'current',type:type||'MCQ',medium,isModelPaper:req.body.isModelPaper==='true',fileName:req.file.originalname,size:req.file.size,...stored,createdBy:req.user!._id});
    res.status(201).json({paper:present(paper)});
  }catch(e:any){if(stored)await removeFile(stored).catch(()=>{});res.status(500).json({message:'Could not publish the paper. Please try again.'});}
});
router.get('/:id/download',async(req,res)=>{
  try{
    const p=await PastPaper.findById(req.params.id);if(!p){res.status(404).json({message:'Paper not found.'});return;}
    if(p.provider==='local'){res.download(path.join(directory(),path.basename(p.fileKey)),p.fileName,error=>{if(error&&!res.headersSent)res.status(404).json({message:'PDF file is missing. Ask the administrator to upload it again.'});});return;}
    await deliverRemotePdf(p.remoteUrl,p.fileName,res);
  }catch{if(!res.headersSent)res.status(500).json({message:'Could not download this paper.'});}
});
router.delete('/:id',protect,adminOnly,async(req,res)=>{try{const p=await PastPaper.findById(req.params.id);if(!p){res.status(404).json({message:'Paper not found.'});return;}await removeFile(p);await p.deleteOne();res.json({message:'Paper removed.'});}catch{res.status(500).json({message:'Could not remove the paper.'});}});
export default router;
