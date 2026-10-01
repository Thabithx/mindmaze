import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import PastPaper from '../models/PastPaper.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();
router.param('id', (_req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) { res.status(404).json({message:'Paper not found.'}); return; }
  next();
});
router.get('/:id/quiz/edit', protect, adminOnly, async (req, res) => {
  try {
    const paper = await PastPaper.findById(req.params.id);
    if (!paper) { res.status(404).json({message:'Paper not found.'}); return; }
    res.json({questions:paper.quizQuestions || [], version:paper.quizVersion});
  } catch { res.status(500).json({message:'Could not load questions.'}); }
});
router.put('/:id/quiz', protect, adminOnly, async (req, res) => {
  try {
    const paper = await PastPaper.findById(req.params.id);
    if (!paper || paper.type !== 'MCQ') { res.status(400).json({message:'Only MCQ papers support online practice.'}); return; }
    const {questions, version} = req.body;
    if (!Array.isArray(questions) || questions.length > 100) { res.status(400).json({message:'Provide at most 100 questions.'}); return; }
    const valid = questions.every(q => q && typeof q.text === 'string' && q.text.trim() && q.text.length <= 10000 &&
      Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 5 &&
      q.options.every((o:any) => typeof o === 'string' && o.trim() && o.length <= 5000) &&
      Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length &&
      (q.explanation === undefined || typeof q.explanation === 'string' && q.explanation.length <= 10000));
    if (!valid) { res.status(400).json({message:'Every question needs text, 2–5 answers, and one correct answer.'}); return; }
    if ((version || '') !== (paper.quizVersion || '')) { res.status(409).json({message:'These questions changed in another session. Reload before editing.'}); return; }
    const filter:any = {_id:paper._id};
    if (paper.quizVersion) filter.quizVersion = version;
    else filter.$or = [{quizVersion:{$exists:false}},{quizVersion:''}];
    const updated = await PastPaper.findOneAndUpdate(filter, {$set:{quizVersion:randomUUID(),quizQuestions:questions.map(q=>({text:q.text.trim(), options:q.options.map((o:string)=>o.trim()),correctIndex:q.correctIndex,explanation:q.explanation?.trim()||''}))}}, {new:true,runValidators:true});
    if (!updated) { res.status(409).json({message:'These questions changed in another session. Reload before editing.'}); return; }
    res.json({version:updated.quizVersion,questionCount:updated.quizQuestions.length});
  } catch { res.status(500).json({message:'Could not save questions.'}); }
});
router.get('/:id/quiz', async (req, res) => {
  try {
    const paper = await PastPaper.findById(req.params.id);
    if (!paper || paper.type !== 'MCQ' || !paper.quizQuestions?.length) { res.status(404).json({message:'Online questions have not been published for this MCQ paper yet.'}); return; }
    res.json({title:paper.title,version:paper.quizVersion,questions:paper.quizQuestions.map(q=>({text:q.text,options:q.options}))});
  } catch { res.status(500).json({message:'Could not load practice questions.'}); }
});
router.post('/:id/quiz/submit', async (req, res) => {
  try {
    const paper = await PastPaper.findById(req.params.id);
    if (!paper || paper.type !== 'MCQ' || !paper.quizQuestions?.length) { res.status(404).json({message:'This practice paper is unavailable.'}); return; }
    if (req.body.version !== paper.quizVersion) { res.status(409).json({message:'The administrator updated this paper. Restart practice to use the latest questions.'}); return; }
    const answers = req.body.answers;
    if (!Array.isArray(answers) || answers.length !== paper.quizQuestions.length || !answers.every((a,i)=>Number.isInteger(a)&&a>=0&&a<paper.quizQuestions[i].options.length)) { res.status(400).json({message:'Select one answer for every question before submitting.'}); return; }
    const review = paper.quizQuestions.map((q,i)=>({questionNumber:i+1,correct:answers[i]===q.correctIndex,correctIndex:q.correctIndex,explanation:q.explanation}));
    const score = review.filter(q=>q.correct).length;
    res.json({score,total:review.length,percentage:Math.round(score/review.length*100),review});
  } catch { res.status(500).json({message:'Could not mark this paper. Please retry.'}); }
});
export default router;
