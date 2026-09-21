import { Router, Response } from 'express';
import Timetable from '../models/Timetable.js';
import User from '../models/User.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// @route   GET /api/timetable
// @desc    Get all timetable slots for authenticated user
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slots = await Timetable.find({ user: req.user!._id }).sort({ startTime: 1 });
    res.json({ timetable: slots });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching timetable' });
  }
});

// @route   POST /api/timetable
// @desc    Create a new timetable study/revision block
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

    if (!dayOfWeek || !subject || !topic || !startTime || !endTime) {
      res.status(400).json({ message: 'Day, subject, topic, start time, and end time are required' });
      return;
    }

    const slot = await Timetable.create({
      user: req.user!._id,
      dayOfWeek,
      subject,
      topic,
      blockType: blockType || 'study',
      topicId: topicId || '',
      subtopicTargets: subtopicTargets || [],
      startTime,
      endTime,
      color: color || 'blue',
      reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
      reminderOffsetMinutes: reminderOffsetMinutes || 15,
      notes: notes || '',
    });

    res.status(201).json({ slot });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating timetable slot', error: error.message });
  }
});

// @route   PUT /api/timetable/:id
// @desc    Update a timetable slot or mark completed
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

    // If slot completed today, update user XP and streak
    if (req.body.isCompleted === true) {
      const user = await User.findById(req.user!._id);
      if (user) {
        user.xp += 50;
        const todayStr = new Date().toISOString().split('T')[0];
        if (!user.completedDates.includes(todayStr)) {
          user.completedDates.push(todayStr);
          user.streakDays += 1;
          if (user.streakDays > user.bestStreak) {
            user.bestStreak = user.streakDays;
          }
        }
        await user.save();
      }
    }

    res.json({ slot });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating timetable slot' });
  }
});

// @route   DELETE /api/timetable/:id
// @desc    Delete timetable entry
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

export default router;
