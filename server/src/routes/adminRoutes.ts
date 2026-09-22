import { Router, Response } from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Timetable from '../models/Timetable.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';
import { sendAdminBroadcastEmail } from '../services/emailService.js';

const router = Router();

// @route   GET /api/admin/users
// @desc    Get all registered users & study stats
router.get('/users', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching users list' });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Change user role (student <-> admin)
router.put('/users/:id/role', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    if (!['student', 'admin'].includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.role = role;
    await user.save();
    res.json({ message: `User role updated to ${role}`, user });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Toggle user active status (Active / Blocked)
router.put('/users/:id/status', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.isActive = isActive;
    await user.save();
    res.json({ message: `User status set to ${isActive ? 'Active' : 'Blocked'}`, user });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating user active status' });
  }
});

// @route   POST /api/admin/broadcast-email
// @desc    Send broadcast email to all or selected users
router.post('/broadcast-email', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, message, targetRole } = req.body;
    if (!subject || !message) {
      res.status(400).json({ message: 'Subject and message are required' });
      return;
    }

    const query = targetRole ? { role: targetRole, isActive: true } : { isActive: true };
    const users = await User.find(query).select('email');
    const recipientEmails = users.map((u) => u.email);

    if (recipientEmails.length === 0) {
      res.status(400).json({ message: 'No active recipients found' });
      return;
    }

    await sendAdminBroadcastEmail(recipientEmails, subject, message);

    res.json({ message: `Broadcast email dispatched to ${recipientEmails.length} students` });
  } catch (error: any) {
    const msg = error?.message || 'Failed to send broadcast email';
    console.error('[Admin] broadcast-email error:', msg);
    res.status(500).json({ message: msg });
  }
});

// @route   GET /api/admin/stats
// @desc    Get system-wide overview statistics
router.get('/stats', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCourses = await Course.countDocuments();
    const totalTimetableSlots = await Timetable.countDocuments();

    res.json({
      stats: {
        totalUsers,
        totalStudents,
        totalCourses,
        totalTimetableSlots,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error loading admin stats' });
  }
});

// @route   GET /api/admin/export-csv
// @desc    Export student progress report in CSV format
router.get('/export-csv', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    
    let csvContent = 'ID,Name,Email,Role,Stream,Elective,ExamDate,ZScoreTarget,StreakDays,BestStreak,Status\n';
    
    users.forEach((u) => {
      const line = `"${u._id}","${u.name}","${u.email}","${u.role}","${u.stream}","${u.physicalScienceElective}","${u.targetExamDate}","${u.targetZScore}",${u.streakDays},${u.bestStreak},"${u.isActive ? 'Active' : 'Blocked'}"\n`;
      csvContent += line;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mind_maze_students_report.csv"');
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating CSV report' });
  }
});

export default router;
