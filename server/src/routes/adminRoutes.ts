import { Router, Response } from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Timetable from '../models/Timetable.js';
import SiteConfig from '../models/SiteConfig.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';
import { sendAdminBroadcastEmail, sendTestEmail } from '../services/emailService.js';

const router = Router();

// GET site-wide exam date (public – used by all clients)
router.get('/site-config/exam-date', async (req, res: Response): Promise<void> => {
  try {
    const config = await SiteConfig.findOne({ key: 'upcoming_exam_date' });
    res.json({ examDate: config?.value || '' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exam date' });
  }
});

// PUT site-wide exam date (admin only)
router.put('/site-config/exam-date', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examDate } = req.body;
    if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      res.status(400).json({ message: 'Invalid exam date format. Use YYYY-MM-DD.' });
      return;
    }
    await SiteConfig.findOneAndUpdate(
      { key: 'upcoming_exam_date' },
      { key: 'upcoming_exam_date', value: examDate },
      { upsert: true, new: true }
    );
    res.json({ message: 'Upcoming exam date updated successfully', examDate });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating exam date' });
  }
});

router.get('/users', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching users list' });
  }
});

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

router.post('/broadcast-email', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, message, targetRole } = req.body;
    if (!subject || !message) {
      res.status(400).json({ message: 'Subject and message are required' });
      return;
    }

    const query: any = { isActive: { $ne: false } };
    if (targetRole) {
      query.role = targetRole;
    }
    const users = await User.find(query).select('email');
    const recipientEmails = users.map((u) => u.email).filter(Boolean);

    if (recipientEmails.length === 0) {
      if (req.user?.email) {
        recipientEmails.push(req.user.email);
      } else {
        recipientEmails.push('mowequar@gmail.com');
      }
    }

    await sendAdminBroadcastEmail(recipientEmails, subject, message);

    res.json({ message: `Broadcast email dispatched to ${recipientEmails.length} recipient(s)` });
  } catch (error: any) {
    const msg = error?.message || 'Failed to send broadcast email';
    console.error('[Admin] broadcast-email error:', msg);
    res.status(500).json({ message: msg });
  }
});

router.post('/test-email', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetEmail = req.body?.email || req.user?.email || 'mowequar@gmail.com';
    await sendTestEmail(targetEmail);
    res.json({ message: `Test email successfully delivered to ${targetEmail}` });
  } catch (error: any) {
    const msg = error?.message || 'Failed to send test email';
    console.error('[Admin] test-email error:', msg);
    res.status(500).json({ message: msg });
  }
});

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
