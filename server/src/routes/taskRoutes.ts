import { Router, Response } from 'express';
import Task from '../models/Task.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// GET all daily tasks for authenticated user
router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find({ user: req.user!._id }).lean();
    res.json({ tasks });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching daily tasks', error: error.message });
  }
});

// POST sync array of tasks
router.post('/sync', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      res.status(400).json({ message: 'tasks must be an array' });
      return;
    }

    for (const t of tasks) {
      const id = t.id || t.taskId;
      if (!id) continue;

      await Task.findOneAndUpdate(
        { user: req.user!._id, taskId: id },
        {
          user: req.user!._id,
          taskId: id,
          date: t.date || new Date().toISOString().split('T')[0],
          title: t.title || 'Untitled Task',
          subject: t.subject || '',
          blockType: t.blockType || 'study',
          topicId: t.topicId || '',
          topicTitle: t.topicTitle || '',
          subtopic: t.subtopic || '',
          targetProgress: t.targetProgress !== undefined ? t.targetProgress : 100,
          subtopicTargets: t.subtopicTargets || [],
          isCompleted: Boolean(t.isCompleted),
          completedAt: t.completedAt || '',
          timeSlot: t.timeSlot || '',
          startTime: t.startTime || '',
          endTime: t.endTime || '',
          estimatedMinutes: t.estimatedMinutes || 60,
          priority: t.priority || 'Medium',
          fromTimetableId: t.fromTimetableId || '',
        },
        { upsert: true, new: true }
      );
    }

    const updatedTasks = await Task.find({ user: req.user!._id }).lean();
    res.json({ tasks: updatedTasks });
  } catch (error: any) {
    res.status(500).json({ message: 'Error syncing daily tasks', error: error.message });
  }
});

// PUT update single task by taskId
router.put('/:taskId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const task = await Task.findOneAndUpdate(
      { user: req.user!._id, taskId },
      { $set: req.body },
      { new: true }
    );
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    res.json({ task });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// DELETE single task by taskId
router.delete('/:taskId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    await Task.deleteOne({ user: req.user!._id, taskId });
    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});

export default router;
