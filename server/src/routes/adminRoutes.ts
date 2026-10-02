import {readPagination,pageInfo,userListFilter,PaginationError} from '../services/pagination.js';
import {telegramState,userPhone,normalizePhone} from '../services/telegramVerification.js';
import { getBatchConfig, validBatches } from '../services/batchConfig.js';
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
