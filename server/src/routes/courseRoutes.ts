import {Router, RequestHandler} from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import {savePdf, removePdf, downloadPdf} from '../services/pdfStorage.js';
import Course from '../models/Course.js';
import CourseProgress from '../models/CourseProgress.js';
import PastPaper from '../models/PastPaper.js';
import {protect, adminOnly, AuthRequest} from '../middleware/authMiddleware.js';
import {publishedFilter, validateLesson, gradeLesson} from '../services/courseLearning.js';

const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:8}}).fields([{name:'pdfFiles',maxCount:8},{name:'pdfFile',maxCount:1}]);
const summary=(c:any)=>({_id:String(c._id),title:c.title,description:c.description,subject:c.subject,stream:c.stream,topic:c.topic||'General',topicOrder:c.topicOrder??1,lessonOrder:c.lessonOrder??1,estimatedMinutes:c.estimatedMinutes||15,medium:c.medium||'English',syllabus:c.syllabus||'current',status:c.status||'published',revision:c.revision||0,videoCount:(c.videos?.length||0)+(c.videoUrl?1:0),resourceCount:(c.resources?.length||0)+(c.pdfUrl||c.pdfPublicId?1:0),quizCount:c.quizCount??c.quiz?.length??0});
const present=(c:any,admin=false)=>({ ...summary(c),
  videos:[...(c.videoUrl?[{title:'Video lesson',url:c.videoUrl}]:[]),...(c.videos||[]).map((v:any)=>({title:v.title,url:v.url}))],
  resources:[...(c.pdfUrl||c.pdfPublicId?[{id:'legacy',title:c.pdfFileName||'Study notes',path:`/courses/${c._id}/download`}]:[]),...(c.resources||[]).map((r:any)=>({id:String(r._id),title:r.pdfFileName,size:r.size,path:`/courses/${c._id}/resources/${r._id}/download`}))],
  quiz:(c.quiz||[]).map((q:any)=>({questionText:q.questionText,options:q.options,...(admin?{correctOptionIndex:q.correctOptionIndex,explanation:q.explanation}:{})})),
  relatedPaperIds:c.relatedPaperIds||[],
});
const fail=(res:any,error:any)=>res.status(error?.name==='CastError'?400:500).json({message:'Could not complete the lesson request. Please try again.'});
router.param('id',(req,res,next,id)=>{if(!mongoose.isValidObjectId(id)){res.status(400).json({message:'Invalid lesson.'});return;}next();});

// Register named routes before /:id. Public queries always exclude drafts.
router.get('/admin/list',protect,adminOnly,async(_req,res)=>{try{res.json({courses:(await Course.find().sort({subject:1,topicOrder:1,lessonOrder:1})).map(c=>present(c,true))});}catch(e){fail(res,e);}});
router.get('/progress',protect,async(req:AuthRequest,res)=>{try{res.json({progress:await CourseProgress.find({user:req.user!._id}).lean()});}catch(e){fail(res,e);}});
router.get('/',async(req,res)=>{try{
  const filter:any={...publishedFilter};
  if(typeof req.query.subject==='string')filter.subject=req.query.subject;
  if(typeof req.query.stream==='string')filter.stream=req.query.stream;
  const courses=await Course.aggregate([{$match:filter},{$project:{title:1,description:1,subject:1,stream:1,topic:1,topicOrder:1,lessonOrder:1,estimatedMinutes:1,medium:1,syllabus:1,status:1,revision:1,videoUrl:1,videos:1,pdfUrl:1,pdfPublicId:1,resources:1,quizCount:{$size:{$ifNull:['$quiz',[]]}}}},{$sort:{subject:1,topicOrder:1,lessonOrder:1,title:1}}]);
  res.json({courses:courses.map(summary)});
}catch(e){fail(res,e);}});

router.get('/:id/download',async(req,res)=>{try{const c=await Course.findOne({_id:req.params.id,...publishedFilter});if(!c){res.status(404).json({message:'Lesson not found.'});return;}await downloadPdf(c,res);}catch(e){if(!res.headersSent)fail(res,e);}});
router.get('/:id/resources/:resourceId/download',async(req,res)=>{try{const c=await Course.findOne({_id:req.params.id,...publishedFilter});const resource=c?.resources.find((r:any)=>String(r._id)===req.params.resourceId);if(!resource){res.status(404).json({message:'Resource not found.'});return;}await downloadPdf(resource,res);}catch(e){if(!res.headersSent)fail(res,e);}});
router.get('/:id',async(req,res)=>{try{
  const c=await Course.findOne({_id:req.params.id,...publishedFilter});if(!c){res.status(404).json({message:'Lesson not found.'});return;}
  const papers=await PastPaper.find({_id:{$in:c.relatedPaperIds||[]}}).select('title year subject type').lean();
  res.json({course:{...present(c),relatedPapers:papers.map(p=>({...p,pdfPath:`/past-papers/${p._id}/download`}))}});
}catch(e){fail(res,e);}});

router.put('/:id/progress',protect,async(req:AuthRequest,res)=>{try{
  if(!await Course.exists({_id:req.params.id,...publishedFilter})){res.status(404).json({message:'Lesson not found.'});return;}
  if(req.body.completed!==undefined&&typeof req.body.completed!=='boolean'){res.status(400).json({message:'Invalid completion status.'});return;}
  const update:any={lastOpenedAt:new Date()};if(typeof req.body.completed==='boolean')update.completed=req.body.completed;
  const progress=await CourseProgress.findOneAndUpdate({user:req.user!._id,course:req.params.id},{$set:update},{upsert:true,new:true,setDefaultsOnInsert:true});
  res.json({progress});
}catch(e){fail(res,e);}});
router.post('/:id/quiz',protect,async(req:AuthRequest,res)=>{try{
  const c=await Course.findOne({_id:req.params.id,...publishedFilter});if(!c){res.status(404).json({message:'Lesson not found.'});return;}
  if(req.body.revision!==(c.revision||0)){res.status(409).json({message:'This lesson changed. Reopen it before trying the quiz.'});return;}
  if(!c.quiz?.length){res.status(400).json({message:'This lesson has no quiz.'});return;}
  let result;try{result=gradeLesson(c.quiz,req.body.answers);}catch(e:any){res.status(400).json({message:e.message});return;}
  const progress=await CourseProgress.findOneAndUpdate({user:req.user!._id,course:c._id},{$set:{lastOpenedAt:new Date(),quizScore:result.score,quizTotal:result.total,needsRevision:result.score<result.total}},{upsert:true,new:true,setDefaultsOnInsert:true});
  res.json({...result,progress});
}catch(e){fail(res,e);}});

const parseUpload:RequestHandler=(req,res,next)=>upload(req,res,e=>{if(e){res.status(400).json({message:e.code==='LIMIT_FILE_SIZE'?'Each PDF must be 25 MiB or smaller.':e.message});return;}next();});
const saveLesson=(updating:boolean):RequestHandler=>async(req:AuthRequest,res)=>{
  const saved:any[]=[];
  try{
    const existing=updating?await Course.findById(req.params.id):null;
    if(updating&&!existing){res.status(404).json({message:'Lesson not found.'});return;}
    let details:any,keep:string[];
    try{
      details=validateLesson(req.body);
      keep=req.body.keepResourceIds?JSON.parse(req.body.keepResourceIds):existing?['legacy',...existing.resources.map((r:any)=>String(r._id))]:[];
      if(!Array.isArray(keep)||keep.some(id=>typeof id!=='string'))throw Error('Invalid resource selection.');
    }catch(e:any){res.status(400).json({message:e.message});return;}
    if(existing&&Number(req.body.revision)!==(existing.revision||0)){res.status(409).json({message:'This lesson was edited elsewhere. Reload it before saving.'});return;}
    const groups=req.files as Record<string,Express.Multer.File[]>|undefined;
    const files=[...(groups?.pdfFiles||[]),...(groups?.pdfFile||[])];
    if(files.some(f=>f.buffer.subarray(0,5).toString()!=='%PDF-')){res.status(400).json({message:'Select valid PDF files.'});return;}
    const retained=existing?.resources.filter((r:any)=>keep.includes(String(r._id)))||[];
    if(retained.length+files.length>20){res.status(400).json({message:'A lesson can contain up to 20 PDF resources.'});return;}
    for(const file of files)saved.push({...await savePdf(file),size:file.size});
    details.resources=[...retained,...saved];
    if(existing&&!keep.includes('legacy'))Object.assign(details,{pdfUrl:'',pdfPublicId:'',pdfFileName:''});
    let course;
    if(existing){
      const filter:any={_id:existing._id};
      filter.$or=[{revision:existing.revision||0},...(!existing.revision?[{revision:{$exists:false}}]:[])];
      course=await Course.findOneAndUpdate(filter,{$set:details,$inc:{revision:1}},{new:true,runValidators:true});
      if(!course){await Promise.all(saved.map(r=>removePdf(r).catch(()=>{})));res.status(409).json({message:'This lesson changed while saving. Reload and retry.'});return;}
    }else course=await Course.create({...details,createdBy:req.user!._id});
    saved.length=0;
    if(existing){
      const removed=existing.resources.filter((r:any)=>!keep.includes(String(r._id)));
      if(!keep.includes('legacy'))removed.push(existing);
      await Promise.all(removed.map(r=>removePdf(r).catch(()=>{})));
    }
    res.status(updating?200:201).json({course:present(course,true)});
  }catch(e:any){
    await Promise.all(saved.map(r=>removePdf(r).catch(()=>{})));
    const tooLarge=e?.http_code===413||/file size too large/i.test(e?.message||'');
    res.status(tooLarge?413:500).json({message:tooLarge?'Your PDF exceeds the storage account’s file-size limit. Compress it or increase your storage limit.':'Could not save the lesson. Check PDF storage and try again.'});
  }
};
router.post('/',protect,adminOnly,parseUpload,saveLesson(false));
router.put('/:id',protect,adminOnly,parseUpload,saveLesson(true));
router.delete('/:id',protect,adminOnly,async(req,res)=>{try{
  const c=await Course.findByIdAndDelete(req.params.id);if(!c){res.status(404).json({message:'Lesson not found.'});return;}
  await Promise.all([c,...c.resources].map(r=>removePdf(r).catch(()=>{})));
  await CourseProgress.deleteMany({course:c._id});res.json({message:'Lesson removed.'});
}catch(e){fail(res,e);}});
export default router;
