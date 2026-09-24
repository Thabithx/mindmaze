import { Router, Response } from 'express';
import Mistake from '../models/Mistake.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mistakes = await Mistake.find({ user: req.user!._id }).sort({ createdAt: -1 });
    res.json({ mistakes });
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

    const mistake = await Mistake.create({
      user: req.user!._id,
      subject,
      topic,
      questionText,
      yourAnswer,
      correctAnswer,
      explanation,
      reviewStatus: req.body.reviewStatus || 'Needs Review',
      isMastered: Boolean(req.body.isMastered),
    });

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
    res.json({ mistake });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating mistake' });
  }
});

router.delete('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Mistake.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
    res.json({ message: 'Mistake deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting mistake' });
  }
});

export default router;
