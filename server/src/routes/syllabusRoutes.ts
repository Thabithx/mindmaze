import { Router, Request, Response } from 'express';
import SyllabusProgress from '../models/SyllabusProgress.js';
import User from '../models/User.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// @route   GET /api/syllabus/leaderboard
router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(5, parseInt(String(req.query.limit || '50'), 10)));
    const period = String(req.query.period || 'weekly');

    const users = await User.find({ isActive: true })
      .select('name stream streakDays bestStreak xp createdAt')
      .sort({ xp: -1, streakDays: -1 })
      .limit(limit)
      .lean();

    const entries = users.map((u: any) => {
      const streak = u.streakDays || 1;
      const syllabusPercent = Math.min(100, Math.round(streak * 3.2 + 20));
      const hours = Math.round((streak * 2.5 + (u.xp ? u.xp / 100 : 0)) * 10) / 10;
      const tasks = Math.round(streak * 3 + (u.xp ? u.xp / 50 : 0));
      return {
        userId: u._id.toString(),
        username: u.name || 'A/L Scholar',
        stream: u.stream || 'Physical Science',
        completedHours: hours,
        completedTasks: tasks,
        currentStreak: streak,
        syllabusCompletedPercent: syllabusPercent,
      };
    });

    entries.sort((a, b) => {
      if (b.completedHours !== a.completedHours) return b.completedHours - a.completedHours;
      if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
      return b.currentStreak - a.currentStreak;
    });

    res.json({ entries, period, needsSetup: false });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
});

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
router.post('/completed-picker', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topics } = req.body;
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
