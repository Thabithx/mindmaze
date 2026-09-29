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

    const entries = users.map((u: any) => {
      const uId = u._id.toString();
      const streak = Math.max(1, u.streakDays || 1);
      
      const realSubtopicsCount = progressMap.get(uId) || 0;
      const computedSyllabusPercent = Math.min(100, Math.round((realSubtopicsCount / 110) * 100));

      const totalMinutes = u.totalStudyMinutes || 0;
      const computedHours = totalMinutes / 60;

      return {
        userId: uId,
        username: u.name || 'A/L Scholar',
        stream: u.stream || 'Physical Science',
        completedHours: computedHours,
        totalStudyMinutes: totalMinutes,
        completedTasks: realSubtopicsCount,
        currentStreak: streak,
        syllabusCompletedPercent: computedSyllabusPercent,
      };
    });

    // Sort strictly by Syllabus % > Total Study Minutes > Streak
    entries.sort((a, b) => {
      if (b.syllabusCompletedPercent !== a.syllabusCompletedPercent) {
        return b.syllabusCompletedPercent - a.syllabusCompletedPercent;
      }
      if ((b.totalStudyMinutes || 0) !== (a.totalStudyMinutes || 0)) {
        return (b.totalStudyMinutes || 0) - (a.totalStudyMinutes || 0);
      }
      return b.currentStreak - a.currentStreak;
    });

    res.json({ entries: entries.slice(0, limit), period, needsSetup: false });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
});

function formatSubtopicProgressToObj(rawProgress: any): Record<string, number> {
  const result: Record<string, number> = {};
  if (Array.isArray(rawProgress)) {
    rawProgress.forEach((item: any) => {
      if (item && typeof item.subtopic === 'string') {
        result[item.subtopic] = Number(item.progress) || 0;
      }
    });
  } else if (rawProgress && typeof rawProgress === 'object') {
    if (rawProgress instanceof Map) {
      rawProgress.forEach((val: any, key: string) => {
        result[key] = Number(val) || 0;
      });
    } else {
      Object.entries(rawProgress).forEach(([k, v]) => {
        result[k] = Number(v) || 0;
      });
    }
  }
  return result;
}

function subtopicObjToArray(obj: any): Array<{ subtopic: string; progress: number }> {
  const arr: Array<{ subtopic: string; progress: number }> = [];
  if (Array.isArray(obj)) {
    obj.forEach((item: any) => {
      if (item && typeof item.subtopic === 'string') {
        arr.push({ subtopic: item.subtopic, progress: Number(item.progress) || 0 });
      }
    });
  } else if (obj && typeof obj === 'object') {
    if (obj instanceof Map) {
      obj.forEach((val: any, key: string) => {
        arr.push({ subtopic: key, progress: Number(val) || 0 });
      });
    } else {
      Object.entries(obj).forEach(([k, v]) => {
        arr.push({ subtopic: k, progress: Number(v) || 0 });
      });
    }
  }
  return arr;
}

router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const progressList = await SyllabusProgress.find({ user: req.user!._id }).lean();
    const formatted = progressList.map((doc: any) => ({
      ...doc,
      subtopicProgress: formatSubtopicProgressToObj(doc.subtopicProgress),
    }));
    res.json({ progress: formatted });
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
        subtopicProgress: [],
        completedSubtopics: [],
        status: 'in_progress',
      });
    }

    if (!Array.isArray(item.subtopicProgress)) {
      item.subtopicProgress = subtopicObjToArray(item.subtopicProgress);
    }

    const numericProg = Math.min(100, Math.max(0, Number(progress)));
    const existingIndex = item.subtopicProgress.findIndex((sp) => sp.subtopic === subtopic);

    if (existingIndex >= 0) {
      item.subtopicProgress[existingIndex].progress = numericProg;
    } else {
      item.subtopicProgress.push({ subtopic, progress: numericProg });
    }

    // Update completedSubtopics list
    if (numericProg === 100 && !item.completedSubtopics.includes(subtopic)) {
      item.completedSubtopics.push(subtopic);
    } else if (numericProg < 100 && item.completedSubtopics.includes(subtopic)) {
      item.completedSubtopics = item.completedSubtopics.filter((s) => s !== subtopic);
    }

    // Check overall topic status
    const values = item.subtopicProgress.map((sp) => sp.progress);
    if (values.length > 0 && values.every((v) => v === 100)) {
      item.status = 'completed';
    } else if (values.some((v) => v > 0)) {
      item.status = 'in_progress';
    } else {
      item.status = 'not_started';
    }

    await item.save();

    const formattedItem = {
      ...item.toObject(),
      subtopicProgress: formatSubtopicProgressToObj(item.subtopicProgress),
    };

    res.json({ item: formattedItem });
  } catch (error: any) {
    console.error('[update-subtopic] Error:', error?.message, error?.stack?.slice(0, 300));
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
        subtopicProgress: [],
        completedSubtopics: [],
        status: 'not_started',
      });
    }

    if (status) item.status = status;
    if (Array.isArray(completedSubtopics)) item.completedSubtopics = completedSubtopics;
    if (subtopicProgress !== undefined) {
      item.subtopicProgress = subtopicObjToArray(subtopicProgress);
    }

    await item.save();

    const formattedItem = {
      ...item.toObject(),
      subtopicProgress: formatSubtopicProgressToObj(item.subtopicProgress),
    };

    res.json({ item: formattedItem });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating topic progress', error: error.message });
  }
});

router.post('/completed-picker', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { topics } = req.body;
    if (!Array.isArray(topics)) {
      res.status(400).json({ message: 'topics must be an array' });
      return;
    }

    const errors: string[] = [];

    for (const t of topics) {
      const targetTopicId = t.topicId || t.id;
      if (!targetTopicId) continue;

      const hasProgress =
        (Array.isArray(t.completedSubtopics) && t.completedSubtopics.length > 0) ||
        (t.status && t.status !== 'not_started') ||
        (t.subtopicProgress && Object.keys(t.subtopicProgress).length > 0);
      if (!hasProgress) continue;

      try {
        let item = await SyllabusProgress.findOne({ user: req.user!._id, topicId: targetTopicId });
        if (!item) {
          item = new SyllabusProgress({
            user: req.user!._id,
            topicId: targetTopicId,
            subject: t.subject || 'General',
            unitNumber: t.unitNumber || 1,
            unitTitle: t.unitTitle || '',
            topicTitle: t.topicTitle || targetTopicId,
            status: t.status || (t.completedSubtopics?.length ? 'in_progress' : 'not_started'),
            subtopicProgress: [],
            completedSubtopics: t.completedSubtopics || [],
          });
        } else {
          if (t.status) item.status = t.status;
          if (Array.isArray(t.completedSubtopics)) item.completedSubtopics = t.completedSubtopics;
        }

        if (t.subtopicProgress && typeof t.subtopicProgress === 'object') {
          item.subtopicProgress = subtopicObjToArray(t.subtopicProgress);
        } else if (Array.isArray(t.completedSubtopics)) {
          const arr: Array<{ subtopic: string; progress: number }> = [];
          t.completedSubtopics.forEach((sub: string) => {
            arr.push({ subtopic: sub, progress: 100 });
          });
          item.subtopicProgress = arr;
        }

        await item.save();
      } catch (docErr: any) {
        console.error(`[completed-picker] Error saving topic ${targetTopicId}:`, docErr?.message);
        errors.push(`${targetTopicId}: ${docErr?.message}`);
      }
    }

    if (errors.length > 0) {
      res.json({ message: 'Syllabus progress saved with some errors', errors });
    } else {
      res.json({ message: 'Syllabus progress saved successfully' });
    }
  } catch (error: any) {
    console.error('Error saving syllabus progress:', error);
    res.status(500).json({ message: 'Error saving syllabus progress', error: error.message });
  }
});

export default router;
