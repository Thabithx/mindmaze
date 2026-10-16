import {readPagination,pageInfo,literalSearch,queryText,PaginationError} from '../services/pagination.js';
import {Router, RequestHandler} from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import {savePdf, removePdf, downloadPdf, saveImage, removeImage, saveSubmissionFile} from '../services/pdfStorage.js';
import Course from '../models/Course.js';
import CourseProgress from '../models/CourseProgress.js';
import PastPaper from '../models/PastPaper.js';
import {protect, contentManagerOnly, AuthRequest} from '../middleware/authMiddleware.js';
import {publishedFilter, validateLesson, gradeLesson} from '../services/courseLearning.js';
import {extractDownloadWatermark} from '../services/downloadAuth.js';

const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024,files:30}}).fields([
  {name:'pdfFiles',maxCount:25},
  {name:'pdfFile',maxCount:5},
  {name:'resultSheetFiles',maxCount:25},
  {name:'thumbnail',maxCount:1},
  {name:'coverImage',maxCount:1}
]);
const singleSubmissionUpload = multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024,files:1}}).single('submissionFile');
const summary=(c:any)=>({_id:String(c._id),title:c.title,description:c.description,subject:c.subject,stream:c.stream,topic:c.topic||'General',topicOrder:c.topicOrder??1,lessonOrder:c.lessonOrder??1,estimatedMinutes:c.estimatedMinutes||15,medium:c.medium||'English',syllabus:c.syllabus||'current',status:c.status||'published',revision:c.revision||0,courseType:c.courseType||(c.isFree?'free':(c.billingType==='monthly'?'monthly':'one_time')),isMonthlyProgram:Boolean(c.isMonthlyProgram),parentCourseId:c.parentCourseId?String(c.parentCourseId):undefined,targetMonth:c.targetMonth||'',validityPeriod:c.validityPeriod||'lifetime',validityMonths:c.validityMonths??0,price:c.price??0,isFree:c.isFree??(c.price===0),billingType:c.billingType||'one_time',monthlyFee:c.monthlyFee||0,bankDetails:c.bankDetails||'',thumbnailUrl:c.thumbnailUrl||'',videoCount:(c.videos?.length||0)+(c.videoUrl?1:0),resourceCount:(c.resources?.length||0)+(c.pdfUrl||c.pdfPublicId?1:0),quizCount:c.quizCount??c.quiz?.length??0,subCourseCount:c.subCourseCount||0});
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

export function cleanupExpiredLiveClasses(c: any): boolean {
  if (!c || !c.curriculumBlocks || !Array.isArray(c.curriculumBlocks)) return false;
  const now = Date.now();
  const fiveHoursMs = 5 * 60 * 60 * 1000;
  const originalLen = c.curriculumBlocks.length;

  c.curriculumBlocks = c.curriculumBlocks.filter((b: any) => {
    if (b.type !== 'live_class') return true;
    if (!b.scheduledTime) return true;
    const time = Date.parse(b.scheduledTime);
    if (isNaN(time)) return true;
    // Auto-delete if more than 5 hours have passed since scheduledTime
    return (now - time) <= fiveHoursMs;
  });

  return c.curriculumBlocks.length !== originalLen;
}

const present=(c:any,admin=false)=>{
  cleanupExpiredLiveClasses(c);
  const rawVideos = [...(c.videoUrl?[{title:'Video lesson',url:c.videoUrl,description:''}]:[]), ...(c.videos||[])];
  return {
    ...summary(c),
    price: c.price ?? 0,
    isFree: c.isFree ?? (c.price === 0),
    billingType: c.billingType || 'one_time',
    monthlyFee: c.monthlyFee || 0,
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
        formatted.pdfUrl = b.pdfUrl || b.recordingPdfUrl || '';
        formatted.pdfFileName = b.pdfFileName || b.recordingPdfFileName || '';
        if (formatted.pdfUrl) {
          formatted.pdfPath = `/courses/${c._id}/blocks/${b._id}/download`;
        }
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
        formatted.recordingPdfUrl = b.recordingPdfUrl || b.pdfUrl || '';
        formatted.recordingPdfFileName = b.recordingPdfFileName || b.pdfFileName || '';
        if (formatted.recordingPdfUrl) {
          formatted.pdfPath = `/courses/${c._id}/blocks/${b._id}/download`;
        }
      } else if (b.type === 'document') {
        formatted.pdfUrl = b.pdfUrl || '';
        formatted.pdfFileName = b.pdfFileName || 'Document';
        formatted.size = b.size || 0;
        formatted.path = `/courses/${c._id}/blocks/${b._id}/download`;
      } else if (b.type === 'quiz') {
        formatted.passPercentage = b.passPercentage ?? 50;
        formatted.quizQuestions = (b.quizQuestions || []).map((q: any) => ({
          _id: q._id ? String(q._id) : undefined,
          questionText: q.questionText,
          questionType: q.questionType || 'mcq',
          imageUrl: q.imageUrl || '',
          imagePublicId: q.imagePublicId || '',
          options: q.options || [],
          ...(admin ? { correctOptionIndex: q.correctOptionIndex, explanation: q.explanation } : {}),
        }));
      } else if (b.type === 'paper') {
        const hasPaperFile = Boolean(b.paperUrl || b.pdfUrl || b.paperPublicId || b.pdfPublicId);
        formatted.paperUrl = b.paperUrl || b.pdfUrl || (hasPaperFile ? `/courses/${c._id}/blocks/${b._id}/download` : '');
        formatted.paperFileName = b.paperFileName || b.pdfFileName || 'Question Paper.pdf';
        formatted.pdfUrl = formatted.paperUrl;
        formatted.pdfFileName = formatted.paperFileName;
        if (hasPaperFile) {
          formatted.pdfPath = `/courses/${c._id}/blocks/${b._id}/download`;
          formatted.paperPath = `/courses/${c._id}/blocks/${b._id}/download`;
        }
        const hasResultFile = Boolean(b.resultSheetUrl || b.resultSheetPublicId);
        formatted.resultSheetUrl = b.resultSheetUrl || (hasResultFile ? `/courses/${c._id}/blocks/${b._id}/result-sheet/download` : '');
        formatted.resultSheetFileName = b.resultSheetFileName || 'Result Sheet.pdf';
        if (hasResultFile) {
          formatted.resultSheetPath = `/courses/${c._id}/blocks/${b._id}/result-sheet/download`;
        }
        formatted.totalMarks = b.totalMarks || 100;
        formatted.deadline = b.deadline || '';
      }
      return formatted;
    }),
    quiz:(c.quiz||[]).map((q:any)=>({
      _id: q._id ? String(q._id) : undefined,
      questionText: q.questionText,
      questionType: q.questionType || 'mcq',
      imageUrl: q.imageUrl || '',
      imagePublicId: q.imagePublicId || '',
      options: q.options || [],
      ...(admin ? { correctOptionIndex: q.correctOptionIndex, explanation: q.explanation } : {}),
    })),
    relatedPaperIds:c.relatedPaperIds||[],
  };
};
const fail=(res:any,error:any)=>res.status(error?.name==='CastError'?400:500).json({message:'Could not complete the lesson request. Please try again.'});

const imageOnlyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('imageFile');

// Upload quiz diagram/image to Cloudinary
router.post('/admin/quiz-image', protect, contentManagerOnly, imageOnlyUpload, async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Select an image file (PNG, JPG, WEBP).' });
      return;
    }
    const uploaded = await saveImage(req.file);
    res.json({ url: uploaded.url, publicId: uploaded.publicId });
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Could not upload quiz image.' });
  }
});

router.param('id',(req,res,next,id)=>{if(!mongoose.isValidObjectId(id)){res.status(400).json({message:'Invalid lesson.'});return;}next();});

// Register named routes before /:id. Public queries always exclude drafts.
router.get('/admin/topics',protect,contentManagerOnly,async(req:AuthRequest,res)=>{try{
  const topics=await Course.aggregate([{$match:{createdBy:req.user!._id}},{$group:{_id:{subject:'$subject',topic:'$topic'},topicOrder:{$min:'$topicOrder'}}},{$project:{_id:0,subject:'$_id.subject',topic:'$_id.topic',topicOrder:1}},{$sort:{subject:1,topicOrder:1,topic:1}}]);
  res.json({topics});
}catch(e){fail(res,e);}});
router.get('/admin/list',protect,contentManagerOnly,async(req:AuthRequest,res)=>{try{
  const requested=readPagination(req.query),filter:any={createdBy:req.user!._id};
  for(const key of ['subject','status'])if(queryText(req.query[key]))filter[key]=queryText(req.query[key]);
  if(req.query.parentCourseId) {
    filter.parentCourseId = req.query.parentCourseId;
  } else if (req.query.mainOnly === 'true') {
    filter.$or = [{ parentCourseId: { $exists: false } }, { parentCourseId: null }];
  }
  const search=literalSearch(req.query.q);
  if(search) {
    const searchOr = ['title','topic','subject'].map(key=>({[key]:search}));
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }
  const pagination=pageInfo(await Course.countDocuments(filter),requested);
  const courses=await Course.find(filter).sort({createdAt:-1,_id:1}).skip((pagination.page-1)*pagination.pageSize).limit(pagination.pageSize).lean();
  const withCounts = await Promise.all(courses.map(async (c) => {
    const subCount = await Course.countDocuments({ parentCourseId: c._id });
    return {
      ...present(c, true),
      subCourseCount: subCount,
    };
  }));
  res.json({courses:withCounts,pagination});
}catch(e){if(e instanceof PaginationError)res.status(400).json({message:e.message});else fail(res,e);}});
router.get('/progress',protect,async(req:AuthRequest,res)=>{try{res.json({progress:await CourseProgress.find({user:req.user!._id}).lean()});}catch(e){fail(res,e);}});
router.get('/',async(req,res)=>{try{
  const filter:any={
    ...publishedFilter,
    $or: [{ parentCourseId: { $exists: false } }, { parentCourseId: null }]
  };
  if(typeof req.query.subject==='string')filter.subject=req.query.subject;
  if(typeof req.query.stream==='string')filter.stream=req.query.stream;
  const courses=await Course.aggregate([
    {$match:filter},
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: 'parentCourseId',
        as: 'subCoursesList'
      }
    },
    {
      $project:{
        title:1,description:1,subject:1,stream:1,topic:1,topicOrder:1,lessonOrder:1,
        estimatedMinutes:1,medium:1,syllabus:1,status:1,revision:1,courseType:1,
        isMonthlyProgram:1,parentCourseId:1,targetMonth:1,validityPeriod:1,validityMonths:1,
        price:1,isFree:1,billingType:1,monthlyFee:1,bankDetails:1,videoUrl:1,videos:1,
        pdfUrl:1,pdfPublicId:1,thumbnailUrl:1,resources:1,
        quizCount:{$size:{$ifNull:['$quiz',[]]}},
        subCourseCount:{$size:'$subCoursesList'}
      }
    },
    {$sort:{subject:1,topicOrder:1,lessonOrder:1,title:1}}
  ]);
  res.json({courses:courses.map(summary)});
}catch(e){fail(res,e);}});

router.get('/:id/download',async(req,res)=>{try{const c=await Course.findOne({_id:req.params.id,...publishedFilter});if(!c){res.status(404).json({message:'Lesson not found.'});return;}const watermark=await extractDownloadWatermark(req);const isInline=req.query.inline==='1'||req.query.inline==='true';await downloadPdf(c,res,watermark,isInline);}catch(e){if(!res.headersSent)fail(res,e);}});
router.get('/:id/resources/:resourceId/download',async(req,res)=>{try{const c=await Course.findOne({_id:req.params.id,...publishedFilter});const resource=c?.resources.find((r:any)=>String(r._id)===req.params.resourceId);if(!resource){res.status(404).json({message:'Resource not found.'});return;}const watermark=await extractDownloadWatermark(req);const isInline=req.query.inline==='1'||req.query.inline==='true';await downloadPdf(resource,res,watermark,isInline);}catch(e){if(!res.headersSent)fail(res,e);}});
router.get('/:id/blocks/:blockId/download',async(req,res)=>{
  try{
    const c=await Course.findOne({_id:req.params.id,...publishedFilter});
    if(!c){res.status(404).json({message:'Lesson not found.'});return;}
    const block=c?.curriculumBlocks?.find((b:any)=>String(b._id)===req.params.blockId) ||
                (Number.isInteger(Number(req.params.blockId)) ? c?.curriculumBlocks?.[Number(req.params.blockId)] : undefined);
    if(!block || (block.type !== 'document' && block.type !== 'paper' && !block.pdfUrl && !block.recordingPdfUrl && !block.paperUrl && !block.paperPublicId && !block.pdfPublicId)){
      res.status(404).json({message:'Document or paper not found.'});
      return;
    }
    const watermark=await extractDownloadWatermark(req);
    const effectivePdfUrl = block.paperUrl || block.pdfUrl || block.recordingPdfUrl || '';
    const effectiveFileName = block.paperFileName || block.pdfFileName || block.recordingPdfFileName || 'document.pdf';
    const effectivePublicId = block.paperPublicId || block.pdfPublicId || block.recordingPdfPublicId || '';
    const effectiveProvider = block.paperProvider || block.pdfProvider || (effectivePdfUrl.includes('res.cloudinary.com') ? 'cloudinary' : 'local');
    let target: any = {
      ...(typeof (block as any)?.toObject === 'function' ? (block as any).toObject() : block),
      pdfUrl: effectivePdfUrl,
      pdfFileName: effectiveFileName,
      pdfProvider: effectiveProvider,
      pdfPublicId: effectivePublicId,
    };
    if (effectivePdfUrl && effectivePdfUrl.includes('/resources/')) {
      const match = effectivePdfUrl.match(/\/resources\/([a-f\d]{24})\/download/i);
      if (match && match[1]) {
        const linked = c.resources?.find((r: any) => String(r._id) === match[1]);
        if (linked) target = linked;
      }
    }
    const isInline=req.query.inline==='1'||req.query.inline==='true';
    await downloadPdf(target,res,watermark,isInline);
  }catch(e){if(!res.headersSent)fail(res,e);}
});

router.get('/:id/blocks/:blockId/result-sheet/download', async (req: any, res: any) => {
  try {
    const c = await Course.findOne({ _id: req.params.id, ...publishedFilter });
    if (!c) { res.status(404).json({ message: 'Lesson not found.' }); return; }
    const blocks: any[] = (c.curriculumBlocks as any[]) || [];
    const block = blocks.find((b: any) => String(b._id) === req.params.blockId) ||
                  (/^\d+$/.test(req.params.blockId) ? blocks[parseInt(req.params.blockId, 10)] : undefined);
    if (!block || !block.resultSheetUrl) {
      res.status(404).json({ message: 'Result sheet not found or not published yet.' });
      return;
    }
    const watermark = await extractDownloadWatermark(req);
    const target = {
      pdfUrl: block.resultSheetUrl,
      pdfFileName: block.resultSheetFileName || 'result-sheet.pdf',
      pdfProvider: block.resultSheetProvider || 'cloudinary',
      pdfPublicId: block.resultSheetPublicId || '',
    };
    const isInline = req.query.inline === '1' || req.query.inline === 'true';
    await downloadPdf(target, res, watermark, isInline);
  } catch (e) { if (!res.headersSent) fail(res, e); }
});

router.post(
  '/:id/blocks/:blockId/paper-submit',
  protect,
  (req: any, res: any, next: any) => {
    singleSubmissionUpload(req, res, (err: any) => {
      if (err) return res.status(400).json({ message: err.message || 'File upload error.' });
      next();
    });
  },
  async (req: any, res: any) => {
    try {
      const c = await Course.findOne({ _id: req.params.id, ...publishedFilter });
      if (!c) { res.status(404).json({ message: 'Course not found.' }); return; }
      const blocks: any[] = (c.curriculumBlocks as any[]) || [];
      const block = blocks.find((b: any) => String(b._id) === req.params.blockId) ||
                    (/^\d+$/.test(req.params.blockId) ? blocks[parseInt(req.params.blockId, 10)] : undefined);
      if (!block) { res.status(404).json({ message: 'Paper section not found.' }); return; }

      let fileData: any = null;
      if (req.file) {
        fileData = await saveSubmissionFile(req.file);
      }

      const studentNotes = typeof req.body.studentNotes === 'string' ? req.body.studentNotes.trim() : '';
      const blockKey = String(block._id || req.params.blockId);
      const blockTitle = block.title || req.body.blockTitle || 'Paper';

      let progress = await CourseProgress.findOne({ user: req.user!._id, course: c._id });
      if (!progress) {
        progress = new CourseProgress({ user: req.user!._id, course: c._id });
      }

      const existingSubIndex = (progress.paperSubmissions || []).findIndex((s: any) => s.blockKey === blockKey);
      let submissionRecord: any;

      if (existingSubIndex >= 0) {
        submissionRecord = progress.paperSubmissions[existingSubIndex];
        submissionRecord.submittedAt = new Date();
        submissionRecord.status = 'pending_review';
        submissionRecord.studentNotes = studentNotes;
        if (fileData) {
          submissionRecord.submissionUrl = fileData.fileUrl;
          submissionRecord.submissionFileName = fileData.fileName;
          submissionRecord.submissionPublicId = fileData.publicId;
          submissionRecord.submissionProvider = fileData.provider;
        }
      } else {
        submissionRecord = {
          blockKey,
          blockTitle,
          submittedAt: new Date(),
          status: 'pending_review',
          submissionUrl: fileData?.fileUrl || '',
          submissionFileName: fileData?.fileName || '',
          submissionPublicId: fileData?.publicId || '',
          submissionProvider: fileData?.provider || 'cloudinary',
          studentNotes,
          maxMarks: block.totalMarks || 100,
        };
        progress.paperSubmissions.push(submissionRecord);
      }

      // Do not mark step as completed until teacher grades and reviews the paper
      const completedBlocks = new Set(progress.completedBlocks || []);
      completedBlocks.delete(blockKey);
      progress.completedBlocks = Array.from(completedBlocks);

      await progress.save();

      res.json({
        success: true,
        message: 'Your paper has been submitted successfully for teacher review!',
        submission: submissionRecord,
        progress,
      });
    } catch (e: any) {
      if (!res.headersSent) fail(res, e);
    }
  }
);
router.get('/:id',async(req,res)=>{try{
  const c=await Course.findOne({_id:req.params.id,...publishedFilter});if(!c){res.status(404).json({message:'Lesson not found.'});return;}
  if(cleanupExpiredLiveClasses(c)){
    Course.updateOne({_id:c._id},{$set:{curriculumBlocks:c.curriculumBlocks}}).catch(()=>{});
  }
  const papers=await PastPaper.find({_id:{$in:c.relatedPaperIds||[]}}).select('title year subject type').lean();
  const subCourses = await Course.find({ parentCourseId: c._id, ...publishedFilter })
    .sort({ lessonOrder: 1, createdAt: 1 })
    .lean();
  res.json({
    course:{
      ...present(c),
      subCourses: subCourses.map(sc => present(sc, false)),
      relatedPapers:papers.map(p=>({...p,pdfPath:`/past-papers/${p._id}/download`}))
    }
  });
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
  if(req.body.revision!=null && Number(req.body.revision)!==(c.revision||0)){res.status(409).json({message:'This lesson changed. Reopen it before trying the quiz.'});return;}

  const blockKey = req.body.blockKey;
  let targetQuiz: any[] = [];
  let passPercentage = 50;
  let targetBlock: any = null;

  if (c.curriculumBlocks && c.curriculumBlocks.length > 0) {
    if (blockKey) {
      targetBlock = c.curriculumBlocks.find((b: any) => String(b._id) === blockKey || b.type === 'quiz');
    } else {
      targetBlock = c.curriculumBlocks.find((b: any) => b.type === 'quiz');
    }
    if (targetBlock?.quizQuestions?.length) {
      targetQuiz = targetBlock.quizQuestions;
      passPercentage = typeof targetBlock.passPercentage === 'number' ? targetBlock.passPercentage : 50;
    }
  }

  if (!targetQuiz.length) {
    targetQuiz = c.quiz || [];
  }

  if(!targetQuiz.length){res.status(400).json({message:'This lesson has no quiz.'});return;}

  let result;
  try{
    result=gradeLesson(targetQuiz,req.body.answers);
  }catch(e:any){
    res.status(400).json({message:e.message});
    return;
  }

  const total = result.total;
  const score = result.score;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const hasOpenEnded = Boolean(result.hasOpenEnded);

  let status: 'passed' | 'failed' | 'pending_review' = 'pending_review';
  if (!hasOpenEnded) {
    status = percentage >= passPercentage ? 'passed' : 'failed';
  }

  const submission = {
    blockKey: blockKey || (targetBlock?._id ? String(targetBlock._id) : 'quiz'),
    blockTitle: targetBlock?.title || 'Practice Quiz',
    submittedAt: new Date(),
    status,
    score,
    totalQuestions: total,
    passPercentage,
    percentage,
    hasOpenEnded,
    answers: result.results.map((r: any) => ({
      questionText: r.questionText,
      questionType: r.questionType || 'mcq',
      imageUrl: r.imageUrl || '',
      options: r.options || [],
      selectedIndex: r.selectedIndex,
      textAnswer: r.textAnswer || '',
      correctOptionIndex: r.correctOptionIndex,
      explanation: r.explanation || '',
      isCorrect: Boolean(r.isCorrect),
      adminGraded: Boolean(r.adminGraded),
    })),
  };

  const existingProgress = await CourseProgress.findOne({ user: req.user!._id, course: c._id });
  const completedBlocks = new Set<string>(existingProgress?.completedBlocks || []);

  const effectiveBlockKey = submission.blockKey;
  if (status === 'passed' && effectiveBlockKey) {
    completedBlocks.add(effectiveBlockKey);
  } else if (status === 'failed' && effectiveBlockKey) {
    completedBlocks.delete(effectiveBlockKey);
  }

  const progress = await CourseProgress.findOneAndUpdate(
    { user: req.user!._id, course: c._id },
    {
      $set: {
        lastOpenedAt: new Date(),
        quizScore: score,
        quizTotal: total,
        needsRevision: status === 'failed',
        completedBlocks: Array.from(completedBlocks),
      },
      $push: {
        quizSubmissions: submission,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({
    ...result,
    percentage,
    passPercentage,
    status,
    submission,
    progress,
  });
}catch(e){fail(res,e);}});

const parseUpload:RequestHandler=(req,res,next)=>upload(req,res,e=>{if(e){res.status(400).json({message:e.code==='LIMIT_FILE_SIZE'?'Each PDF must be 25 MiB or smaller.':e.message});return;}next();});
const saveLesson=(updating:boolean):RequestHandler=>async(req:AuthRequest,res)=>{
  const saved:any[]=[];
  try{
    const existing=updating?await Course.findById(req.params.id):null;
    if(updating&&!existing){res.status(404).json({message:'Lesson not found.'});return;}
    if(existing && existing.createdBy && String(existing.createdBy) !== String(req.user!._id)){
      res.status(403).json({message:'You can only edit courses created by you.'});
      return;
    }
    let details:any,keep:string[];
    try{
      details=validateLesson(req.body);
      keep=req.body.keepResourceIds?JSON.parse(req.body.keepResourceIds):existing?['legacy',...existing.resources.map((r:any)=>String(r._id))]:[];
      if(!Array.isArray(keep)||keep.some(id=>typeof id!=='string'))throw Error('Invalid resource selection.');
    }catch(e:any){res.status(400).json({message:e.message});return;}
    if(details.parentCourseId) {
      const parentCourse = await Course.findById(details.parentCourseId);
      if(!parentCourse || (parentCourse.createdBy && String(parentCourse.createdBy) !== String(req.user!._id))){
        res.status(403).json({message:'You can only add monthly courses inside a main course created by you.'});
        return;
      }
    }
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
        if ((b.type === 'document' || b.type === 'video' || b.type === 'paper') && b.hasNewUpload && fIdx < saved.length) {
          const s = saved[fIdx++];
          b.pdfUrl = s.pdfUrl;
          b.pdfPublicId = s.pdfPublicId;
          b.pdfFileName = s.pdfFileName || b.title || (b.type === 'paper' ? 'Question Paper.pdf' : 'Document');
          b.recordingPdfUrl = s.pdfUrl;
          b.recordingPdfFileName = s.pdfFileName || b.title || 'Document';
          b.paperUrl = s.pdfUrl;
          b.paperFileName = s.pdfFileName || b.title || 'Question Paper.pdf';
          b.paperPublicId = s.pdfPublicId;
          b.paperProvider = s.pdfProvider || 'raw';
          b.pdfProvider = s.pdfProvider || 'raw';
          b.size = s.size;
        }
      }
    }
    const resultFiles = (groups?.resultSheetFiles || []) as Express.Multer.File[];
    if (resultFiles.length > 0 && Array.isArray(details.curriculumBlocks)) {
      let rfIdx = 0;
      for (const b of details.curriculumBlocks) {
        if (b.type === 'paper' && b.hasNewResultSheet && rfIdx < resultFiles.length) {
          const rSaved = await savePdf(resultFiles[rfIdx++]);
          b.resultSheetUrl = rSaved.pdfUrl;
          b.resultSheetFileName = rSaved.pdfFileName || 'Result Sheet.pdf';
          b.resultSheetPublicId = rSaved.pdfPublicId;
          b.resultSheetProvider = rSaved.pdfProvider || 'raw';
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
    if (Array.isArray(details.curriculumBlocks)) {
      cleanupExpiredLiveClasses(details);
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
router.delete('/:id',protect,contentManagerOnly,async(req:AuthRequest,res)=>{try{
  const c=await Course.findById(req.params.id);
  if(!c){res.status(404).json({message:'Course not found.'});return;}
  if(c.createdBy && String(c.createdBy) !== String(req.user!._id)){
    res.status(403).json({message:'You can only delete courses created by you.'});
    return;
  }
  const subCount = await Course.countDocuments({ parentCourseId: req.params.id });
  if (subCount > 0) {
    res.status(400).json({
      message: `Cannot delete this main course because it contains ${subCount} monthly course(s). Please delete all monthly courses inside it first.`
    });
    return;
  }
  await Course.findByIdAndDelete(req.params.id);
  if(c.thumbnailPublicId) await removeImage(c.thumbnailPublicId).catch(()=>{});
  await Promise.all([c,...c.resources].map(r=>removePdf(r).catch(()=>{})));
  await CourseProgress.deleteMany({course:c._id});
  res.json({message:'Course removed successfully.'});
}catch(e){fail(res,e);}});

// Background worker: automatically delete live classes 5 hours after scheduled time
setInterval(async () => {
  try {
    const courses = await Course.find({ 'curriculumBlocks.type': 'live_class' });
    for (const c of courses) {
      if (cleanupExpiredLiveClasses(c)) {
        await Course.updateOne({ _id: c._id }, { $set: { curriculumBlocks: c.curriculumBlocks } });
      }
    }
  } catch (err) {
    console.error('[Live Class Cleanup Interval Error]:', err);
  }
}, 30 * 60 * 1000);

export default router;
