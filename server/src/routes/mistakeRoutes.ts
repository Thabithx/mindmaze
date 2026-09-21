import { Router, Response } from 'express';
import Mistake from '../models/Mistake.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// @route   GET /api/mistakes
// @desc    Get user's logged mistakes
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mistakes = await Mistake.find({ user: req.user!._id }).sort({ createdAt: -1 });
    res.json({ mistakes });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching mistakes' });
  }
});

// @route   POST /api/mistakes
// @desc    Save a new mistake from practice quiz
router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, topic, questionText, yourAnswer, correctAnswer, explanation } = req.body;

    if (!questionText) {
      res.status(400).json({ message: 'Question text is required' });
      return;
    }

    const mistake = await Mistake.create({
      user: req.user!._id,
      subject: subject || 'General',
      topic: topic || 'General',
      questionText,
      yourAnswer: yourAnswer || '',
      correctAnswer: correctAnswer || '',
      explanation: explanation || '',
      reviewStatus: 'Needs Review',
      isMastered: false,
    });

    res.status(201).json({ mistake });
  } catch (error: any) {
    res.status(500).json({ message: 'Error saving mistake' });
  }
});

// @route   PUT /api/mistakes/:id
// @desc    Update review status or master status
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

// @route   DELETE /api/mistakes/:id
// @desc    Delete mistake item
router.delete('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Mistake.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
    res.json({ message: 'Mistake deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting mistake' });
  }
});

export default router;
