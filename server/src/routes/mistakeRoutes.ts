import { createHash } from 'node:crypto';
import { Router, Response } from 'express';
import Mistake from '../models/Mistake.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();
// Review photos from Practice Quiz are stored as relative API paths, never arbitrary URLs.
const REVIEW_IMAGE_PATH = /^\/practice\/sets\/[a-f\d]{24}\/images\/[a-f\d]{24}$/i;
const cleanReviewImages = (v: any) => Array.isArray(v) ? v.filter((r: any) => r && typeof r.path === 'string' && REVIEW_IMAGE_PATH.test(r.path)).slice(0, 6).map((r: any) => ({ path: r.path, alt: typeof r.alt === 'string' ? r.alt.slice(0, 1000) : '' })) : [];
const cleanOptions = (v: any) => Array.isArray(v) ? v.filter((o: any) => typeof o === 'string').slice(0, 5).map((o: string) => o.slice(0, 5000)) : [];
const keyOf = (m: any) => createHash('sha256').update(JSON.stringify([m.subject, m.topic, m.questionText, m.correctAnswer || ''].map(v => String(v).trim().replace(/\s+/g, ' ')))).digest('hex');
async function duplicateIds(user: any, item: any) {
  const records = await Mistake.find({user});
  return records.filter(m => keyOf(m) === keyOf(item)).map(m => m._id);
}

router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mistakes = await Mistake.find({ user: req.user!._id }).sort({ createdAt: -1 });
    const seen = new Set<string>();
    res.json({ mistakes: mistakes.filter(m => { const key = keyOf(m); if (seen.has(key)) return false; seen.add(key); return true; }) });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching mistakes' });
  }
});

router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawQuestionText = req.body.questionText || req.body.question?.questionText || req.body.question?.text || req.body.topic;
    const subject = req.body.subject || req.body.question?.subject || 'General';
    const topic = req.body.topic || req.body.question?.topic || 'General Topic';
    const questionText = rawQuestionText || `${subject} - ${topic}`;
    const yourAnswer = req.body.yourAnswer || req.body.userSelectedOptionId || '';
    const correctAnswer = req.body.correctAnswer || (req.body.question?.options?.find((o: any) => o.isCorrect)?.text) || '';
    const explanation = typeof req.body.explanation === 'string'
      ? req.body.explanation
      : (req.body.question?.explanation?.conceptNote || req.body.question?.explanation || '');

    const values = {
      user: req.user!._id,
      subject,
      topic,
      questionText,
      yourAnswer,
      correctAnswer,
      explanation,
      reviewStatus: req.body.reviewStatus || 'Needs Review',
      isMastered: Boolean(req.body.isMastered),
      // Only overwrite the rich review data when the client actually sends it (login sync does not).
      ...(req.body.options !== undefined ? { options: cleanOptions(req.body.options) } : {}),
      ...(req.body.reviewImages !== undefined ? { reviewImages: cleanReviewImages(req.body.reviewImages) } : {}),
      ...(typeof req.body.questionImage === 'string' ? { questionImage: REVIEW_IMAGE_PATH.test(req.body.questionImage) ? req.body.questionImage : '' } : {}),
      ...(typeof req.body.source === 'string' ? { source: req.body.source.slice(0, 200) } : {}),
    };
    await Mistake.init();
    const questionKey = keyOf(values);
    const filter = {user: req.user!._id, questionKey};
    let mistake;
    try {
      mistake = await Mistake.findOneAndUpdate(filter, {$set: values}, {upsert: true, new: true, runValidators: true});
    } catch (error: any) {
      if (error.code !== 11000) throw error;
      mistake = await Mistake.findOneAndUpdate(filter, {$set: values}, {new: true, runValidators: true});
    }
    // Fold records created before question identities were introduced into this entry.
    const legacy = await Mistake.find({user: req.user!._id, questionKey: {$exists: false}});
    const ids = legacy.filter(m => keyOf(m) === questionKey).map(m => m._id);
    if (ids.length) await Mistake.deleteMany({_id: {$in: ids}, user: req.user!._id});

    res.json({ mistake });
  } catch (error: any) {
    console.error('Error saving mistake:', error);
    res.status(500).json({ message: 'Error saving mistake' });
  }
});

router.put('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mistake = await Mistake.findOne({ _id: req.params.id, user: req.user!._id });
    if (!mistake) {
      res.status(404).json({ message: 'Mistake item not found' });
      return;
    }

    if (req.body.reviewStatus !== undefined) {
      mistake.reviewStatus = req.body.reviewStatus;
    }
    if (req.body.isMastered !== undefined) {
      mistake.isMastered = req.body.isMastered;
      if (req.body.isMastered) mistake.reviewStatus = 'Mastered';
    }

    await mistake.save();
    await Mistake.updateMany({_id: {$in: await duplicateIds(req.user!._id, mistake)}, user: req.user!._id}, {$set: {reviewStatus: mistake.reviewStatus, isMastered: mistake.isMastered}});
    res.json({ mistake });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating mistake' });
  }
});

router.delete('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await Mistake.findOne({_id: req.params.id, user: req.user!._id});
    if (item) await Mistake.deleteMany({_id: {$in: await duplicateIds(req.user!._id, item)}, user: req.user!._id});
    res.json({ message: 'Mistake deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting mistake' });
  }
});

export default router;
