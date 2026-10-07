import PaperAttempt from '../models/PaperAttempt.js';
import {PAPER_DURATION_MS,correctAnswers,validQuestion,validAnswers,gradePaper,publicQuestion} from '../services/paperQuiz.js';
import {createHash,randomBytes} from 'node:crypto';
import PaperAsset from '../models/PaperAsset.js';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import PastPaper from '../models/PastPaper.js';
import { protect, contentManagerOnly, optionalAuth } from '../middleware/authMiddleware.js';
import PaperResult from '../models/PaperResult.js';

const router = Router();
router.param('id', (_req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) { res.status(404).json({message:'Paper not found.'}); return; }
  next();
});
router.get('/:id/quiz/edit', protect, contentManagerOnly, async (req, res) => {
  try {
    const paper = await PastPaper.findById(req.params.id);
    if (!paper) { res.status(404).json({message:'Paper not found.'}); return; }
    res.json({questions:(paper.quizQuestions || []).map(q=>({...q.toObject(),correctIndices:correctAnswers(q)})), version:paper.quizVersion});
  } catch { res.status(500).json({message:'Could not load questions.'}); }
});
router.put('/:id/quiz', protect, contentManagerOnly, async (req, res) => {
  try {
    const paper = await PastPaper.findById(req.params.id);
    if (!paper || paper.type !== 'MCQ') { res.status(400).json({message:'Only MCQ papers support online practice.'}); return; }
    const {questions, version} = req.body;
    if (!Array.isArray(questions) || questions.length > 100) { res.status(400).json({message:'Provide at most 100 questions.'}); return; }
    const valid = questions.every(validQuestion);
    const imageIds=questions.filter(q=>q?.imageId).map(q=>q.imageId);
    if(imageIds.some(id=>typeof id!=='string'||!mongoose.isValidObjectId(id))||questions.some(q=>q?.imageAlt!==undefined&&(typeof q.imageAlt!=='string'||q.imageAlt.length>1000))){res.status(400).json({message:'Invalid question image or description.'});return;}
    if(imageIds.length&&await PaperAsset.countDocuments({_id:{$in:imageIds},paper:paper._id,kind:'image'})!==new Set(imageIds).size){res.status(400).json({message:'Use images uploaded to this paper.'});return;}
    if (!valid) { res.status(400).json({message:'Every question needs text, 2–5 answers, and at least one accepted answer; resolve all review notes.'}); return; }
    if ((version || '') !== (paper.quizVersion || '')) { res.status(409).json({message:'These questions changed in another session. Reload before editing.'}); return; }
    const filter:any = {_id:paper._id};
    if (paper.quizVersion) filter.quizVersion = version;
    else filter.$or = [{quizVersion:{$exists:false}},{quizVersion:''}];
    const updated = await PastPaper.findOneAndUpdate(filter, {$set:{quizVersion:randomUUID(),quizQuestions:questions.map(q=>({text:q.text.trim(),imageId:q.imageId||'',imageAlt:q.imageAlt?.trim()||'', options:q.options.map((o:string)=>o.trim()),correctIndex:correctAnswers(q)[0],correctIndices:correctAnswers(q),explanation:q.explanation?.trim()||''}))}}, {new:true,runValidators:true});
    if (!updated) { res.status(409).json({message:'These questions changed in another session. Reload before editing.'}); return; }
    res.json({version:updated.quizVersion,questionCount:updated.quizQuestions.length});
  } catch { res.status(500).json({message:'Could not save questions.'}); }
});
router.get('/:id/quiz', async (req, res) => {
  try {
    const paper = await PastPaper.findById(req.params.id);
    if (!paper || paper.type !== 'MCQ' || !paper.quizQuestions?.length) { res.status(404).json({message:'Online questions have not been published for this MCQ paper yet.'}); return; }
    res.json({title:paper.title,version:paper.quizVersion,durationSeconds:PAPER_DURATION_MS/1000,questions:paper.quizQuestions.map(publicQuestion)});
  } catch { res.status(500).json({message:'Could not load practice questions.'}); }
});

const tokenHash=(token:unknown)=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)?createHash('sha256').update(token).digest('hex'):'';
const presentAttempt=(a:any)=>({title:a.title,version:a.version,questions:a.questions.map(publicQuestion),answers:a.answers,deadline:a.deadline,serverNow:new Date(),result:a.result||null});
// Starting an attempt snapshots the paper so later edits do not invalidate a timed sitting.
router.post('/:id/quiz/attempt',optionalAuth,async(req:any,res)=>{
 try{
  if(req.body.attemptToken){
   const attempt=await PaperAttempt.findOne({paper:req.params.id,tokenHash:tokenHash(req.body.attemptToken)});
   if(!attempt){res.status(404).json({message:'Saved attempt is no longer available. Start a new attempt.'});return;}
   res.json({...presentAttempt(attempt),attemptToken:req.body.attemptToken});return;
  }
  const paper=await PastPaper.findById(req.params.id);
  if(!paper||paper.type!=='MCQ'||!paper.quizQuestions.length){res.status(404).json({message:'This practice paper is unavailable.'});return;}
  const token=randomBytes(32).toString('hex'),now=Date.now();
  const attempt=await PaperAttempt.create({paper:paper._id,user:req.optionalUserId&&mongoose.isValidObjectId(req.optionalUserId)?req.optionalUserId:undefined,tokenHash:tokenHash(token),title:paper.title,version:paper.quizVersion,
   questions:paper.quizQuestions.map(q=>({...q.toObject(),correctIndices:correctAnswers(q)})),answers:paper.quizQuestions.map(()=>[]),
   deadline:new Date(now+PAPER_DURATION_MS),cleanupAt:new Date(now+7*24*60*60*1000)});
  res.status(201).json({...presentAttempt(attempt),attemptToken:token});
 }catch{res.status(500).json({message:'Could not start or resume this paper. Please retry.'});}
});
router.put('/:id/quiz/attempt/answers',async(req,res)=>{
 try{
  const filter={paper:req.params.id,tokenHash:tokenHash(req.body.attemptToken)};
  const attempt=await PaperAttempt.findOne(filter);
  if(!attempt){res.status(404).json({message:'Attempt not found.'});return;}
  if(!validAnswers(req.body.answers,attempt.questions)){res.status(400).json({message:'Select at most one valid answer for each question.'});return;}
  const saved=await PaperAttempt.findOneAndUpdate({...filter,result:{$exists:false},deadline:{$gt:new Date()}},{$set:{answers:req.body.answers},$inc:{revision:1}},{new:true});
  if(!saved){res.status(409).json({message:'Time is up or the paper was already submitted. Show your results.'});return;}
  res.json({saved:true,serverNow:new Date(),deadline:saved.deadline});
 }catch{res.status(500).json({message:'Answers could not be saved. Check your connection and retry.'});}
});
router.post('/:id/quiz/submit',async(req,res)=>{
 try{
  const filter={paper:req.params.id,tokenHash:tokenHash(req.body.attemptToken)};
  for(let retry=0;retry<3;retry++){
   const attempt=await PaperAttempt.findOne(filter);
   if(!attempt){res.status(404).json({message:'Start a timed attempt before submitting.'});return;}
   if(attempt.result){res.json(attempt.result);return;}
   const timedOut=Date.now()>=attempt.deadline.getTime();
   if(!timedOut&&!validAnswers(req.body.answers,attempt.questions)){res.status(400).json({message:'Select at most one valid answer for each question.'});return;}
   // After the deadline only answers saved before time expired can earn marks.
   const answers=timedOut?attempt.answers:req.body.answers;
   const result={...gradePaper(attempt.questions,answers),timedOut};
   const saved=await PaperAttempt.findOneAndUpdate({...filter,revision:attempt.revision,result:{$exists:false}},{$set:{answers,result},$inc:{revision:1}},{new:true});
   if(saved){
    res.json(result);
    // Lasting per-student record (idempotent: one row per attempt). Never affects the response.
    if(saved.user)PaperResult.updateOne({attempt:saved._id},{$setOnInsert:{user:saved.user,paper:saved.paper,title:saved.title,score:result.score,total:result.total,percentage:result.percentage,timedOut:result.timedOut,submittedAt:new Date()}},{upsert:true}).catch(()=>{});
    return;
   }
  }
  res.status(409).json({message:'Answers are still saving. Please retry submission.'});
 }catch{res.status(500).json({message:'Could not mark this paper. Your attempt is saved; please retry.'});}
});
export default router;
