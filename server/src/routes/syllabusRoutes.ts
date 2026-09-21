import { Router, Response } from 'express';
import SyllabusProgress from '../models/SyllabusProgress.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// @route   GET /api/syllabus
// @desc    Get user's syllabus progress
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const progressList = await SyllabusProgress.find({ user: req.user!._id });
    res.json({ progress: progressList });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching syllabus progress' });
  }
});

// @route   POST /api/syllabus/update-subtopic
// @desc    Update progress slider (0-100%) for a subtopic
router.post('/update-subtopic', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topicId, subject, unitNumber, unitTitle, topicTitle, subtopic, progress } = req.body;

    if (!topicId || !subtopic || progress === undefined) {
      res.status(400).json({ message: 'topicId, subtopic, and progress are required' });
      return;
    }

    let item = await SyllabusProgress.findOne({ user: req.user!._id, topicId });
    if (!item) {
      item = new SyllabusProgress({
        user: req.user!._id,
        topicId,
        subject: subject || 'General',
        unitNumber: unitNumber || 1,
        unitTitle: unitTitle || '',
        topicTitle: topicTitle || topicId,
        subtopicProgress: new Map(),
        completedSubtopics: [],
        status: 'in_progress',
      });
    }

    // Set map value
    item.subtopicProgress.set(subtopic, Math.min(100, Math.max(0, Number(progress))));

    // Update completedSubtopics list
    if (progress === 100 && !item.completedSubtopics.includes(subtopic)) {
      item.completedSubtopics.push(subtopic);
    } else if (progress < 100 && item.completedSubtopics.includes(subtopic)) {
      item.completedSubtopics = item.completedSubtopics.filter((s) => s !== subtopic);
    }

    // Check overall topic status
    const values = Array.from(item.subtopicProgress.values());
    if (values.length > 0 && values.every((v) => v === 100)) {
      item.status = 'completed';
    } else if (values.some((v) => v > 0)) {
      item.status = 'in_progress';
    } else {
      item.status = 'not_started';
    }

    await item.save();

    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating subtopic progress', error: error.message });
  }
});

// @route   POST /api/syllabus/completed-picker
// @desc    Bulk mark topics completed during onboarding picker
router.post('/completed-picker', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topics } = req.body; // Array of { topicId, subject, unitNumber, topicTitle, subtopics }
    if (!Array.isArray(topics)) {
      res.status(400).json({ message: 'topics must be an array' });
      return;
    }

    for (const t of topics) {
      let item = await SyllabusProgress.findOne({ user: req.user!._id, topicId: t.topicId });
      if (!item) {
        item = new SyllabusProgress({
          user: req.user!._id,
          topicId: t.topicId,
          subject: t.subject,
          unitNumber: t.unitNumber || 1,
          topicTitle: t.topicTitle,
          status: 'completed',
          subtopicProgress: new Map(),
          completedSubtopics: t.subtopics || [],
        });
      } else {
        item.status = 'completed';
        item.completedSubtopics = t.subtopics || item.completedSubtopics;
      }

      if (t.subtopics && Array.isArray(t.subtopics)) {
        t.subtopics.forEach((sub: string) => {
          item!.subtopicProgress.set(sub, 100);
        });
      }

      await item.save();
    }

    res.json({ message: 'Completed topics saved successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error saving completed topics' });
  }
});

export default router;
