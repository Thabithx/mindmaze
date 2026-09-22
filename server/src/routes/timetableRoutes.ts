import { Router, Response } from 'express';
import Timetable from '../models/Timetable.js';
import User from '../models/User.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slots = await Timetable.find({ user: req.user!._id }).sort({ startTime: 1 });
    res.json({ timetable: slots });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching timetable' });
  }
});

router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      dayOfWeek,
      subject,
      topic,
      blockType,
      topicId,
      subtopicTargets,
      startTime,
      endTime,
      color,
      reminderEnabled,
      reminderOffsetMinutes,
      notes,
    } = req.body;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!dayOfWeek || !validDays.includes(dayOfWeek)) {
      res.status(400).json({ message: 'Valid day of week is required' });
      return;
    }

    if (!subject || typeof subject !== 'string' || !topic || typeof topic !== 'string') {
      res.status(400).json({ message: 'Subject and topic titles are required' });
      return;
    }

    if (!startTime || !endTime) {
      res.status(400).json({ message: 'Start time and end time are required' });
      return;
    }

    const slot = await Timetable.create({
      user: req.user!._id,
      dayOfWeek,
      subject: subject.trim(),
      topic: topic.trim(),
      blockType: blockType === 'revision' ? 'revision' : 'study',
      topicId: topicId || '',
      subtopicTargets: Array.isArray(subtopicTargets) ? subtopicTargets : [],
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      color: color || 'blue',
      reminderEnabled: reminderEnabled !== undefined ? Boolean(reminderEnabled) : true,
      reminderOffsetMinutes: Number(reminderOffsetMinutes) || 15,
      notes: notes ? String(notes).trim() : '',
    });

    res.status(201).json({ slot });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating timetable slot', error: error.message });
  }
});

router.put('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = await Timetable.findOne({ _id: req.params.id, user: req.user!._id });
    if (!slot) {
      res.status(404).json({ message: 'Timetable entry not found' });
      return;
    }

    const fields = [
      'dayOfWeek',
      'subject',
      'topic',
      'blockType',
      'subtopicTargets',
      'startTime',
      'endTime',
      'color',
      'reminderEnabled',
      'reminderOffsetMinutes',
      'notes',
      'isCompleted',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (slot as any)[field] = req.body[field];
      }
    });

    await slot.save();

    if (req.body.isCompleted === true) {
      const user = await User.findById(req.user!._id);
      if (user) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (!user.completedDates.includes(todayStr)) {
          user.completedDates.push(todayStr);
          user.streakDays += 1;
          if (user.streakDays > user.bestStreak) {
            user.bestStreak = user.streakDays;
          }
          await user.save();
        }
      }
    }

    res.json({ slot });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating timetable slot' });
  }
});

router.delete('/:id', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = await Timetable.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
    if (!slot) {
      res.status(404).json({ message: 'Timetable entry not found' });
      return;
    }
    res.json({ message: 'Timetable entry deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting timetable slot' });
  }
});

router.post('/send-reminder', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, topic, startTime, notes } = req.body;
    const user = await User.findById(req.user!._id);
    if (!user || !user.email) {
      res.status(400).json({ message: 'User email not found' });
      return;
    }

    const { sendStudyReminderEmail } = await import('../services/emailService.js');
    await sendStudyReminderEmail(
      user.email,
      user.name || 'Scholar',
      subject || 'General Study',
      topic || 'Scheduled Study Block',
      startTime || 'Now',
      notes
    );

    res.json({ message: `Study reminder email sent to ${user.email}` });
  } catch (error: any) {
    console.error('[Timetable] Error sending reminder email:', error?.message);
    res.status(500).json({ message: error?.message || 'Failed to send reminder email' });
  }
});

export default router;
