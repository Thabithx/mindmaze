import { Router, Request, Response } from 'express';
import SyllabusProgress from '../models/SyllabusProgress.js';
import User from '../models/User.js';
import Timetable from '../models/Timetable.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(5, parseInt(String(req.query.limit || '50'), 10)));
    const period = String(req.query.period || 'weekly');

    const users = await User.find({ isActive: true })
      .select('name stream streakDays bestStreak xp completedDates totalStudyMinutes createdAt')
      .sort({ streakDays: -1, xp: -1 })
      .limit(limit)
      .lean();

    const userIds = users.map((u: any) => u._id);

    // Fetch user syllabus progress counts
    const progressDocs = await SyllabusProgress.find({ user: { $in: userIds } }).lean();
    const progressMap = new Map<string, number>();
    progressDocs.forEach((doc: any) => {
      const uId = doc.user.toString();
      const count = doc.completedSubtopics ? doc.completedSubtopics.length : 0;
      progressMap.set(uId, (progressMap.get(uId) || 0) + count);
    });

    // Fetch user timetable study hours
    const timetableDocs = await Timetable.find({ user: { $in: userIds } }).lean();
    const hoursMap = new Map<string, number>();
    timetableDocs.forEach((slot: any) => {
      const uId = slot.user.toString();
      let durationHours = 1;
      if (slot.startTime && slot.endTime) {
        const [sh, sm] = slot.startTime.split(':').map(Number);
        const [eh, em] = slot.endTime.split(':').map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
          const diffMins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
          if (diffMins > 0) durationHours = diffMins / 60;
        }
      }
      hoursMap.set(uId, (hoursMap.get(uId) || 0) + durationHours);
    });

    const entries = users.map((u: any) => {
      const uId = u._id.toString();
      const streak = Math.max(1, u.streakDays || 1);
      
      const realSubtopicsCount = progressMap.get(uId) || 0;
      const computedSyllabusPercent = realSubtopicsCount > 0
        ? Math.min(100, Math.round((realSubtopicsCount / 90) * 100))
        : Math.min(100, Math.round(streak * 3.5 + 15));

      const timerHours = (u.totalStudyMinutes || 0) / 60;
      const ttHours = hoursMap.get(uId) || 0;
      const combinedHours = timerHours + ttHours;
      const computedHours = combinedHours > 0
        ? Math.round(combinedHours * 10) / 10
        : Math.round((streak * 2.5 + (u.xp ? u.xp / 100 : 0)) * 10) / 10;

      const completedTasks = Math.round(streak * 3 + (realSubtopicsCount || 0));

      return {
        userId: uId,
        username: u.name || 'A/L Scholar',
        stream: u.stream || 'Physical Science',
        completedHours: computedHours,
        completedTasks: completedTasks,
        currentStreak: streak,
        syllabusCompletedPercent: computedSyllabusPercent,
      };
    });

    // Sort by Syllabus % > Completed Hours > Streak
    entries.sort((a, b) => {
      if (b.syllabusCompletedPercent !== a.syllabusCompletedPercent) return b.syllabusCompletedPercent - a.syllabusCompletedPercent;
      if (b.completedHours !== a.completedHours) return b.completedHours - a.completedHours;
      return b.currentStreak - a.currentStreak;
    });

    res.json({ entries, period, needsSetup: false });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
});

router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const progressList = await SyllabusProgress.find({ user: req.user!._id });
    res.json({ progress: progressList });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching syllabus progress' });
  }
});

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

// Bulk update entire topic progress (status + all subtopics at once)
router.put('/update-topic', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topicId, subject, unitNumber, unitTitle, topicTitle, status, completedSubtopics, subtopicProgress } = req.body;

    if (!topicId) {
      res.status(400).json({ message: 'topicId is required' });
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
        status: 'not_started',
      });
    }

    if (status) item.status = status;
    if (Array.isArray(completedSubtopics)) item.completedSubtopics = completedSubtopics;
    if (subtopicProgress && typeof subtopicProgress === 'object') {
      const newMap = new Map<string, number>();
      Object.entries(subtopicProgress).forEach(([k, v]) => newMap.set(k, Number(v)));
      item.subtopicProgress = newMap;
    }

    await item.save();
    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating topic progress', error: error.message });
  }
});



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
