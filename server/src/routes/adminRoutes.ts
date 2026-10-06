import {readPagination,pageInfo,userListFilter,PaginationError} from '../services/pagination.js';
import {telegramState,userPhone,normalizePhone} from '../services/telegramVerification.js';
import { getBatchConfig, validBatches } from '../services/batchConfig.js';
import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Timetable from '../models/Timetable.js';
import Task from '../models/Task.js';
import Mistake from '../models/Mistake.js';
import SyllabusProgress from '../models/SyllabusProgress.js';
import CourseProgress from '../models/CourseProgress.js';
import { canViewUserActivity } from '../services/activityAccess.js';
import { colomboToday } from '../services/practice.js';
import SiteConfig from '../models/SiteConfig.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';
import { sendAdminBroadcastEmail, sendTestEmail } from '../services/emailService.js';

const router = Router();

router.get('/site-config/exam-date', async (_req, res: Response): Promise<void> => {
 try { const batches=await getBatchConfig();res.json({batches,examDate:batches[0].examDate,...Object.fromEntries(batches.map(b=>['examDate'+b.year,b.examDate]))}); }
 catch {res.status(500).json({message:'Unable to load batch settings.'});}
});
router.put('/site-config/exam-date',protect,adminOnly,async(req:AuthRequest,res:Response):Promise<void>=>{
 try {
  const batches=req.body.batches;
  if(!validBatches(batches)){res.status(400).json({message:'Enter two increasing batch years and valid exam dates within their respective years.'});return;}
  await SiteConfig.findOneAndUpdate({key:'active_batches'},{value:JSON.stringify(batches)},{upsert:true,new:true,runValidators:true});
  res.json({batches});
 }catch{res.status(500).json({message:'Unable to save batch settings.'});}
});

router.get('/users', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requested=readPagination(req.query), filter=userListFilter(req.query);
    const pagination=pageInfo(await User.countDocuments(filter),requested);
    const users=await User.find(filter).select('-passwordHash -resetPasswordToken -resetPasswordExpires -pushSubscriptions -studyMinutesByDate -completedDates -manualVerificationHistory').sort({createdAt:-1,_id:-1}).skip((pagination.page-1)*pagination.pageSize).limit(pagination.pageSize).lean();
    res.json({users:users.map(u=>({...u,...telegramState(u)})),pagination});
  } catch (error: any) {
    res.status(error instanceof PaginationError?400:500).json({ message: error instanceof PaginationError?error.message:'Error fetching users list' });
  }
});

/* ───────── Student activity profile: restricted to a single designated admin ───────── */
const activityViewerOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (canViewUserActivity(req.user)) { next(); return; }
  res.status(403).json({ message: 'You do not have access to student activity.' });
};

// Lets the admin panel know whether to make student names clickable. Never lists who the viewer is.
router.get('/activity-access', protect, adminOnly, (req: AuthRequest, res: Response): void => {
  res.json({ allowed: canViewUserActivity(req.user) });
});

const asPlain = (v: any): Record<string, number> => (v instanceof Map ? Object.fromEntries(v) : (v && typeof v === 'object' ? v : {}));

router.get('/users/:id/activity', protect, adminOnly, activityViewerOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ message: 'User not found.' }); return; }
    const uid = new mongoose.Types.ObjectId(req.params.id);
    const [user, mistakeRows, syllabusRows, courseRows, taskRows, timetableSlots] = await Promise.all([
      User.findById(uid).select('-passwordHash -resetPasswordToken -resetPasswordExpires -pushSubscriptions -manualVerificationHistory').lean(),
      Mistake.aggregate([{ $match: { user: uid } }, { $group: { _id: '$subject', total: { $sum: 1 }, mastered: { $sum: { $cond: ['$isMastered', 1, 0] } } } }, { $sort: { total: -1 } }]),
      SyllabusProgress.aggregate([{ $match: { user: uid } }, { $group: { _id: { subject: '$subject', status: '$status' }, n: { $sum: 1 } } }]),
      CourseProgress.aggregate([{ $match: { user: uid } }, { $group: {
        _id: null, opened: { $sum: 1 }, completed: { $sum: { $cond: ['$completed', 1, 0] } },
        needsRevision: { $sum: { $cond: ['$needsRevision', 1, 0] } },
        quizAttempts: { $sum: { $cond: [{ $gt: ['$quizTotal', 0] }, 1, 0] } },
        avgQuizPercent: { $avg: { $cond: [{ $gt: ['$quizTotal', 0] }, { $multiply: [{ $divide: ['$quizScore', '$quizTotal'] }, 100] }, null] } },
        lastOpenedAt: { $max: '$lastOpenedAt' } } }]),
      Task.aggregate([{ $match: { user: uid } }, { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: ['$isCompleted', 1, 0] } } } }]),
      Timetable.countDocuments({ user: uid }),
    ]);
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    // Study minutes: totals, recent windows and a 30-day series (Sri Lanka calendar days).
    const byDate = asPlain((user as any).studyMinutesByDate);
    const base = new Date(colomboToday() + 'T00:00:00Z').getTime();
    const daily = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(base - (29 - i) * 86400000).toISOString().slice(0, 10);
      return { date, minutes: Math.max(0, Number(byDate[date]) || 0) };
    });
    const studyDates = Object.keys(byDate).filter(d => Number(byDate[d]) > 0).sort();

    const mistakeTotal = mistakeRows.reduce((n: number, r: any) => n + r.total, 0);
    const mistakeMastered = mistakeRows.reduce((n: number, r: any) => n + r.mastered, 0);

    const subjects: Record<string, { subject: string; completed: number; inProgress: number; notStarted: number }> = {};
    for (const r of syllabusRows) {
      const e = subjects[r._id.subject] ||= { subject: r._id.subject, completed: 0, inProgress: 0, notStarted: 0 };
      if (r._id.status === 'completed') e.completed += r.n; else if (r._id.status === 'in_progress') e.inProgress += r.n; else e.notStarted += r.n;
    }
    const syllabusBySubject = Object.values(subjects).sort((a, b) => a.subject.localeCompare(b.subject));
    const c = courseRows[0] || {}, t = taskRows[0] || {};

    res.json({
      profile: {
        id: String(user._id), name: user.name, email: user.email, role: user.role, isActive: user.isActive,
        stream: user.stream, elective: user.physicalScienceElective, targetExamYear: user.targetExamYear,
        targetExamDate: user.targetExamDate, targetZScore: user.targetZScore,
        mobileNumber: user.mobileNumber, whatsappNumber: user.whatsappNumber, phone: userPhone(user),
        dailyHoursGoal: user.dailyHoursGoal, weeklyHoursGoal: user.weeklyHoursGoal,
        joinedAt: (user as any).createdAt, telegram: telegramState(user),
      },
      study: {
        totalMinutes: user.totalStudyMinutes || 0,
        last7Minutes: daily.slice(-7).reduce((n, d) => n + d.minutes, 0),
        last30Minutes: daily.reduce((n, d) => n + d.minutes, 0),
        activeDays: studyDates.length,
        lastStudyDate: studyDates[studyDates.length - 1] || null,
        daily,
      },
      progress: { xp: user.xp || 0, streakDays: user.streakDays || 0, bestStreak: user.bestStreak || 0, badges: user.badges || [], lastCompletedDate: user.lastCompletedDate || null },
      mistakes: { total: mistakeTotal, mastered: mistakeMastered, needsReview: mistakeTotal - mistakeMastered, bySubject: mistakeRows.map((r: any) => ({ subject: r._id, total: r.total, mastered: r.mastered })) },
      syllabus: {
        completed: syllabusBySubject.reduce((n, s) => n + s.completed, 0),
        inProgress: syllabusBySubject.reduce((n, s) => n + s.inProgress, 0),
        bySubject: syllabusBySubject,
      },
      courses: { opened: c.opened || 0, completed: c.completed || 0, needsRevision: c.needsRevision || 0, quizAttempts: c.quizAttempts || 0, avgQuizPercent: c.avgQuizPercent == null ? null : Math.round(c.avgQuizPercent), lastOpenedAt: c.lastOpenedAt || null },
      tasks: { total: t.total || 0, completed: t.completed || 0 },
      timetableSlots,
    });
  } catch { res.status(500).json({ message: 'Could not load student activity.' }); }
});

router.put('/users/:id/manual-verification', protect, adminOnly, async (req:AuthRequest,res:Response):Promise<void>=>{
 try {
  const {phone,method}=req.body;
  if(typeof phone!=='string'||!normalizePhone(phone)||!['call','whatsapp'].includes(method)){res.status(400).json({message:'Confirm the registered phone number and choose call or WhatsApp.'});return;}
  if(!/^[a-fA-F0-9]{24}$/.test(String(req.params.id))){res.status(400).json({message:'Invalid user ID.'});return;}
  const user=await User.findById(req.params.id);
  if(!user){res.status(404).json({message:'User not found.'});return;}
  if(!user.isActive){res.status(409).json({message:'Reactivate this account before verifying it.'});return;}
  const registeredPhone=userPhone(user);
  if(normalizePhone(phone)!==registeredPhone){res.status(409).json({message:'The registered phone number changed. Refresh the users list and confirm it again.'});return;}
  if(telegramState(user).accountVerified){res.status(409).json({message:'This account is already verified.'});return;}
  const approval={phone:registeredPhone,method,approvedAt:new Date(),approvedBy:String(req.user!._id),approvedByName:req.user!.name};
  // Reserve phones through the existing unique index for both verification methods.
  const updated=await User.findOneAndUpdate({_id:user._id,isActive:true,updatedAt:user.updatedAt},{$set:{manualVerification:approval,telegramVerifiedPhone:registeredPhone},$push:{manualVerificationHistory:approval}},{new:true,runValidators:true}).select('-passwordHash -resetPasswordToken -resetPasswordExpires');
  if(!updated){res.status(409).json({message:'Account changed. Refresh and try again.'});return;}
  res.json({message:'Account verified by admin.',user:{...updated.toObject(),...telegramState(updated)}});
 }catch(e:any){res.status(e.code===11000?409:500).json({message:e.code===11000?'This phone is already verified on another account.':'Could not verify the account. Please retry.'});}
});

router.put('/users/:id/role', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    if (!['student', 'admin', 'content_manager'].includes(role)) {
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
