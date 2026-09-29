import { Router, Response } from 'express';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Timetable from '../models/Timetable.js';
import Task from '../models/Task.js';
import Mistake from '../models/Mistake.js';
import SyllabusProgress from '../models/SyllabusProgress.js';
import SiteConfig from '../models/SiteConfig.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';
import { sendAdminBroadcastEmail, sendTestEmail } from '../services/emailService.js';

const router = Router();

// GET site-wide exam dates for 2 batches (public – used by all clients)
router.get('/site-config/exam-date', async (req, res: Response): Promise<void> => {
  try {
    const [cfg2026, cfg2027, defaultCfg] = await Promise.all([
      SiteConfig.findOne({ key: 'upcoming_exam_date_2026' }),
      SiteConfig.findOne({ key: 'upcoming_exam_date_2027' }),
      SiteConfig.findOne({ key: 'upcoming_exam_date' }),
    ]);

    const examDate2026 = cfg2026?.value || defaultCfg?.value || '2026-11-25';
    const examDate2027 = cfg2027?.value || '2027-11-25';

    res.json({
      examDate2026,
      examDate2027,
      examDate: examDate2026, // fallback
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching exam dates' });
  }
});

// PUT site-wide exam dates for 2 batches (admin only)
router.put('/site-config/exam-date', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examDate, examDate2026, examDate2027 } = req.body;
    const date2026 = examDate2026 || examDate;
    const date2027 = examDate2027;

    const updates: Promise<any>[] = [];

    if (date2026 && /^\d{4}-\d{2}-\d{2}$/.test(date2026)) {
      updates.push(
        SiteConfig.findOneAndUpdate(
          { key: 'upcoming_exam_date_2026' },
          { key: 'upcoming_exam_date_2026', value: date2026 },
          { upsert: true, new: true }
        ),
        SiteConfig.findOneAndUpdate(
          { key: 'upcoming_exam_date' },
          { key: 'upcoming_exam_date', value: date2026 },
          { upsert: true, new: true }
        )
      );
    }

    if (date2027 && /^\d{4}-\d{2}-\d{2}$/.test(date2027)) {
      updates.push(
        SiteConfig.findOneAndUpdate(
          { key: 'upcoming_exam_date_2027' },
          { key: 'upcoming_exam_date_2027', value: date2027 },
          { upsert: true, new: true }
        )
      );
    }

    if (updates.length === 0) {
      res.status(400).json({ message: 'Please provide valid exam date(s) in YYYY-MM-DD format.' });
      return;
    }

    await Promise.all(updates);
    res.json({
      message: 'Upcoming exam dates updated successfully for both batches',
      examDate2026: date2026,
      examDate2027: date2027,
      examDate: date2026,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating exam dates' });
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

router.delete('/users/:id', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await Promise.all([
      User.findByIdAndDelete(userId),
      Timetable.deleteMany({ user: userId }),
      Task.deleteMany({ user: userId }),
      Mistake.deleteMany({ user: userId }),
      SyllabusProgress.deleteMany({ user: userId }),
    ]);

    res.json({ message: `User "${user.name}" (${user.email}) deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
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
