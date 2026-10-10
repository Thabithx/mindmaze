import {readPagination,pageInfo,literalSearch,queryText,PaginationError} from '../services/pagination.js';
import {Router, RequestHandler} from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import {savePdf, removePdf, downloadPdf, saveImage, removeImage} from '../services/pdfStorage.js';
import Course from '../models/Course.js';
import CourseProgress from '../models/CourseProgress.js';
import PastPaper from '../models/PastPaper.js';
import {protect, contentManagerOnly, AuthRequest} from '../middleware/authMiddleware.js';
import {publishedFilter, validateLesson, gradeLesson} from '../services/courseLearning.js';
import {extractDownloadWatermark} from '../services/downloadAuth.js';

const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024,files:25}}).fields([
  {name:'pdfFiles',maxCount:25},
  {name:'pdfFile',maxCount:5},
  {name:'thumbnail',maxCount:1},
  {name:'coverImage',maxCount:1}
]);
const summary=(c:any)=>({_id:String(c._id),title:c.title,description:c.description,subject:c.subject,stream:c.stream,topic:c.topic||'General',topicOrder:c.topicOrder??1,lessonOrder:c.lessonOrder??1,estimatedMinutes:c.estimatedMinutes||15,medium:c.medium||'English',syllabus:c.syllabus||'current',status:c.status||'published',revision:c.revision||0,price:c.price??0,isFree:c.isFree??(c.price===0),bankDetails:c.bankDetails||'',thumbnailUrl:c.thumbnailUrl||'',videoCount:(c.videos?.length||0)+(c.videoUrl?1:0),resourceCount:(c.resources?.length||0)+(c.pdfUrl||c.pdfPublicId?1:0),quizCount:c.quizCount??c.quiz?.length??0});
function formatSecureVideo(title: string, url: string, admin: boolean, description?: string) {
  let isYouTube = false;
  let embedUrl = '';
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(u.hostname)) {
      id = u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] || '';
    }
    if (/^[\w-]{11}$/.test(id)) {
      isYouTube = true;
      embedUrl = `https://www.youtube-nocookie.com/embed/${id}?modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&controls=1`;
    }
  } catch {}

  return {
    title,
    description: description || '',
    ...(admin ? { url } : {}),
    embedUrl: embedUrl || (admin ? url : ''),
    isYouTube,
    isProtected: true,
  };
}

const present=(c:any,admin=false)=>{
  const rawVideos = [...(c.videoUrl?[{title:'Video lesson',url:c.videoUrl,description:''}]:[]), ...(c.videos||[])];
  return {
    ...summary(c),
    price: c.price ?? 0,
    isFree: c.isFree ?? (c.price === 0),
    bankDetails: c.bankDetails || '',
    videos: rawVideos.map(v => formatSecureVideo(v.title, v.url, admin, v.description)),

    resources:[...(c.pdfUrl||c.pdfPublicId?[{id:'legacy',title:c.pdfFileName||'Study notes',path:`/courses/${c._id}/download`}]:[]),...(c.resources||[]).map((r:any)=>({id:String(r._id),title:r.pdfFileName,size:r.size,path:`/courses/${c._id}/resources/${r._id}/download`}))],
    curriculumBlocks: (c.curriculumBlocks || []).map((b: any, idx: number) => {
      const formatted: any = {
        _id: b._id ? String(b._id) : undefined,
        type: b.type,
        title: b.title || '',
        description: b.description || '',
        order: b.order ?? idx,
      };
      if (b.type === 'video') {
        const sec = formatSecureVideo(b.title || 'Video', b.url || '', admin, b.description);
        formatted.url = admin ? b.url : undefined;
        formatted.embedUrl = sec.embedUrl;
        formatted.isYouTube = sec.isYouTube;
        formatted.isProtected = true;
      } else if (b.type === 'live_class') {
        formatted.liveLink = b.liveLink || '';
        formatted.scheduledTime = b.scheduledTime || '';
        formatted.meetingPlatform = b.meetingPlatform || 'Zoom / Google Meet';
        formatted.isCompleted = Boolean(b.isCompleted);
        formatted.recordingUrl = b.recordingUrl || '';
        if (b.recordingUrl) {
          const sec = formatSecureVideo('Recording', b.recordingUrl, admin);
          formatted.recordingEmbedUrl = sec.embedUrl;
        }
      } else if (b.type === 'document') {
        formatted.pdfUrl = b.pdfUrl || '';
        formatted.pdfFileName = b.pdfFileName || 'Document';
        formatted.size = b.size || 0;
        formatted.path = `/courses/${c._id}/blocks/${b._id}/download`;
      } else if (b.type === 'quiz') {
        formatted.quizQuestions = (b.quizQuestions || []).map((q: any) => ({
          questionText: q.questionText,
          options: q.options,
          ...(admin ? { correctOptionIndex: q.correctOptionIndex, explanation: q.explanation } : {}),
        }));
      }
      return formatted;
    }),
    quiz:(c.quiz||[]).map((q:any)=>({questionText:q.questionText,options:q.options,...(admin?{correctOptionIndex:q.correctOptionIndex,explanation:q.explanation}:{})})),
    relatedPaperIds:c.relatedPaperIds||[],
  };
};
const fail=(res:any,error:any)=>res.status(error?.name==='CastError'?400:500).json({message:'Could not complete the lesson request. Please try again.'});
router.param('id',(req,res,next,id)=>{if(!mongoose.isValidObjectId(id)){res.status(400).json({message:'Invalid lesson.'});return;}next();});

// Register named routes before /:id. Public queries always exclude drafts.
router.get('/admin/topics',protect,contentManagerOnly,async(_req,res)=>{try{
  const topics=await Course.aggregate([{$group:{_id:{subject:'$subject',topic:'$topic'},topicOrder:{$min:'$topicOrder'}}},{$project:{_id:0,subject:'$_id.subject',topic:'$_id.topic',topicOrder:1}},{$sort:{subject:1,topicOrder:1,topic:1}}]);
  res.json({topics});
}catch(e){fail(res,e);}});
router.get('/admin/list',protect,contentManagerOnly,async(req,res)=>{try{
  const requested=readPagination(req.query),filter:any={};
  for(const key of ['subject','status'])if(queryText(req.query[key]))filter[key]=queryText(req.query[key]);
  const search=literalSearch(req.query.q);if(search)filter.$or=['title','topic','subject'].map(key=>({[key]:search}));
  const pagination=pageInfo(await Course.countDocuments(filter),requested);
  const courses=await Course.find(filter).sort({subject:1,topicOrder:1,lessonOrder:1,_id:1}).skip((pagination.page-1)*pagination.pageSize).limit(pagination.pageSize).lean();
  res.json({courses:courses.map(c=>present(c,true)),pagination});
}catch(e){if(e instanceof PaginationError)res.status(400).json({message:e.message});else fail(res,e);}});
router.get('/progress',protect,async(req:AuthRequest,res)=>{try{res.json({progress:await CourseProgress.find({user:req.user!._id}).lean()});}catch(e){fail(res,e);}});
router.get('/',async(req,res)=>{try{
  const filter:any={...publishedFilter};
  if(typeof req.query.subject==='string')filter.subject=req.query.subject;
  if(typeof req.query.stream==='string')filter.stream=req.query.stream;
  const courses=await Course.aggregate([{$match:filter},{$project:{title:1,description:1,subject:1,stream:1,topic:1,topicOrder:1,lessonOrder:1,estimatedMinutes:1,medium:1,syllabus:1,status:1,revision:1,price:1,isFree:1,bankDetails:1,videoUrl:1,videos:1,pdfUrl:1,pdfPublicId:1,thumbnailUrl:1,resources:1,quizCount:{$size:{$ifNull:['$quiz',[]]}}}},{$sort:{subject:1,topicOrder:1,lessonOrder:1,title:1}}]);
  res.json({courses:courses.map(summary)});
}catch(e){fail(res,e);}});

router.get('/:id/download',async(req,res)=>{try{const c=await Course.findOne({_id:req.params.id,...publishedFilter});if(!c){res.status(404).json({message:'Lesson not found.'});return;}const watermark=await extractDownloadWatermark(req);await downloadPdf(c,res,watermark);}catch(e){if(!res.headersSent)fail(res,e);}});
router.get('/:id/resources/:resourceId/download',async(req,res)=>{try{const c=await Course.findOne({_id:req.params.id,...publishedFilter});const resource=c?.resources.find((r:any)=>String(r._id)===req.params.resourceId);if(!resource){res.status(404).json({message:'Resource not found.'});return;}const watermark=await extractDownloadWatermark(req);await downloadPdf(resource,res,watermark);}catch(e){if(!res.headersSent)fail(res,e);}});
router.get('/:id/blocks/:blockId/download',async(req,res)=>{
  try{
    const c=await Course.findOne({_id:req.params.id,...publishedFilter});
    if(!c){res.status(404).json({message:'Lesson not found.'});return;}
    const block=c?.curriculumBlocks?.find((b:any)=>String(b._id)===req.params.blockId);
    if(!block || block.type !== 'document'){
      res.status(404).json({message:'Document not found.'});
      return;
    }
    const watermark=await extractDownloadWatermark(req);
    let target: any = block;
    if (block.pdfUrl && block.pdfUrl.includes('/resources/')) {
      const match = block.pdfUrl.match(/\/resources\/([a-f\d]{24})\/download/i);
      if (match && match[1]) {
        const linked = c.resources?.find((r: any) => String(r._id) === match[1]);
        if (linked) target = linked;
      }
    }
    await downloadPdf(target,res,watermark);
  }catch(e){if(!res.headersSent)fail(res,e);}
});
router.get('/:id',async(req,res)=>{try{
  const c=await Course.findOne({_id:req.params.id,...publishedFilter});if(!c){res.status(404).json({message:'Lesson not found.'});return;}
  const papers=await PastPaper.find({_id:{$in:c.relatedPaperIds||[]}}).select('title year subject type').lean();
  res.json({course:{...present(c),relatedPapers:papers.map(p=>({...p,pdfPath:`/past-papers/${p._id}/download`}))}});
}catch(e){fail(res,e);}});

router.put('/:id/progress',protect,async(req:AuthRequest,res)=>{try{
  if(!await Course.exists({_id:req.params.id,...publishedFilter})){res.status(404).json({message:'Lesson not found.'});return;}
  const update:any={lastOpenedAt:new Date()};
  if(typeof req.body.completed==='boolean')update.completed=req.body.completed;
  if(Array.isArray(req.body.completedBlocks))update.completedBlocks=req.body.completedBlocks;
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
    const thumbFiles=[...(groups?.thumbnail||[]),...(groups?.coverImage||[])];
    const isPdf = (f: Express.Multer.File) => f.buffer && f.buffer.length >= 5 && f.buffer.subarray(0, Math.min(f.buffer.length, 1024)).includes(Buffer.from('%PDF-'));
    if(files.some(f => !isPdf(f))){res.status(400).json({message:'Select valid PDF files. (One or more attached files are not valid PDF documents).'});return;}
    const retained=existing?.resources.filter((r:any)=>keep.includes(String(r._id)))||[];
    if(retained.length+files.length>20){res.status(400).json({message:'A lesson can contain up to 20 PDF resources.'});return;}

    let newCover: any = null;
    if (thumbFiles.length > 0) {
      newCover = await saveImage(thumbFiles[0]);
      details.thumbnailUrl = newCover.url;
      details.thumbnailPublicId = newCover.publicId;
    } else if (req.body.removeThumbnail === 'true') {
      if (existing?.thumbnailPublicId) {
        await removeImage(existing.thumbnailPublicId).catch(() => {});
      }
      details.thumbnailUrl = '';
      details.thumbnailPublicId = '';
    } else if (existing) {
      details.thumbnailUrl = existing.thumbnailUrl || '';
      details.thumbnailPublicId = existing.thumbnailPublicId || '';
    }

    for(const file of files)saved.push({...await savePdf(file),size:file.size});
    if (Array.isArray(details.curriculumBlocks) && saved.length > 0) {
      let fIdx = 0;
      for (const b of details.curriculumBlocks) {
        if (b.type === 'document' && (!b.pdfUrl || b.hasNewUpload) && fIdx < saved.length) {
          const s = saved[fIdx++];
          b.pdfUrl = s.pdfUrl;
          b.pdfPublicId = s.pdfPublicId;
          b.pdfFileName = s.pdfFileName || b.title || 'Document';
          b.pdfProvider = s.pdfProvider || 'raw';
          b.size = s.size;
        }
      }
    }
    details.resources=[...retained,...saved];
    if(existing&&!keep.includes('legacy'))Object.assign(details,{pdfUrl:'',pdfPublicId:'',pdfFileName:''});
    let course;
    if(existing){
      const filter:any={_id:existing._id};
      filter.$or=[{revision:existing.revision||0},...(!existing.revision?[{revision:{$exists:false}}]:[])];
      course=await Course.findOneAndUpdate(filter,{$set:details,$inc:{revision:1}},{new:true,runValidators:true});
      if(!course){
        if (newCover?.publicId) await removeImage(newCover.publicId).catch(() => {});
        await Promise.all(saved.map(r=>removePdf(r).catch(()=>{})));
        res.status(409).json({message:'This lesson changed while saving. Reload and retry.'});
        return;
      }
    }else course=await Course.create({...details,createdBy:req.user!._id});
    saved.length=0;
    if(existing){
      if (newCover && existing.thumbnailPublicId) {
        await removeImage(existing.thumbnailPublicId).catch(() => {});
      }
      const removed=existing.resources.filter((r:any)=>!keep.includes(String(r._id)));
      if(!keep.includes('legacy'))removed.push(existing);
      await Promise.all(removed.map(r=>removePdf(r).catch(()=>{})));
    }
    res.status(updating?200:201).json({course:present(course,true)});
  }catch(e:any){
    console.error('[saveLesson error]:', e);
    await Promise.all(saved.map(r=>removePdf(r).catch(()=>{})));
    const tooLarge=e?.http_code===413||/file size too large/i.test(e?.message||'');
    const msg = tooLarge
      ? 'Your PDF exceeds the storage account’s file-size limit. Compress it or increase your storage limit.'
      : (e?.message || 'Could not save the lesson. Check PDF storage and try again.');
    res.status(tooLarge?413:500).json({message:msg});
  }
};
router.post('/',protect,contentManagerOnly,parseUpload,saveLesson(false));
router.put('/:id',protect,contentManagerOnly,parseUpload,saveLesson(true));
router.delete('/:id',protect,contentManagerOnly,async(req,res)=>{try{
  const c=await Course.findByIdAndDelete(req.params.id);if(!c){res.status(404).json({message:'Lesson not found.'});return;}
  if(c.thumbnailPublicId) await removeImage(c.thumbnailPublicId).catch(()=>{});
  await Promise.all([c,...c.resources].map(r=>removePdf(r).catch(()=>{})));
  await CourseProgress.deleteMany({course:c._id});res.json({message:'Lesson removed.'});
}catch(e){fail(res,e);}});
export default router;
