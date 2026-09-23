import crypto from 'crypto';
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { StreamType } from '../models/User.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mind_maze_jwt_secret_key_2026_al_app';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { name, email, password, stream, physicalScienceElective } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ message: 'Full name must be at least 2 characters long' });
      return;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ message: 'Please provide a valid email address' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const count = await User.countDocuments();
    const role = count === 0 ? 'admin' : 'student';

    const validStreams = ['Physical Science', 'Biological Science', 'Maths', 'Bio'];
    const selectedStream = validStreams.includes(stream) ? stream : 'Physical Science';

    const userPhone = (req.body.whatsappNumber || req.body.mobileNumber || req.body.phoneNumber || req.body.phone || '').trim();

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      stream: selectedStream,
      physicalScienceElective: physicalScienceElective === 'ICT' ? 'ICT' : 'Chemistry',
      targetExamYear: '2026',
      mobileNumber: userPhone,
      whatsappNumber: userPhone,
      phoneNumber: userPhone,
      phone: userPhone,
      timezone: req.body.timezone || 'Asia/Colombo',
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        stream: user.stream,
        physicalScienceElective: user.physicalScienceElective,
        targetExamYear: user.targetExamYear,
        targetExamDate: user.targetExamDate,
        targetZScore: user.targetZScore,
        mobileNumber: user.mobileNumber || userPhone,
        whatsappNumber: user.whatsappNumber || userPhone,
        phoneNumber: user.phoneNumber || userPhone,
        phone: user.phone || userPhone,
        dailyHoursGoal: user.dailyHoursGoal,
        weeklyHoursGoal: user.weeklyHoursGoal,
        streakDays: user.streakDays,
        bestStreak: user.bestStreak,
        badges: user.badges,
      },
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

function updateStreakOnActivity(user: any): boolean {
  try {
    const userTz = user.timezone || 'Asia/Colombo';
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: userTz }).format(now);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', { timeZone: userTz }).format(yesterday);

    const lastActive = user.lastCompletedDate;

    if (lastActive === todayStr) {
      if (!user.streakDays || user.streakDays < 1) {
        user.streakDays = 1;
        return true;
      }
      return false;
    }

    if (lastActive === yesterdayStr) {
      user.streakDays = (user.streakDays || 0) + 1;
    } else {
      user.streakDays = 1;
    }

    user.lastCompletedDate = todayStr;
    if (!user.completedDates) user.completedDates = [];
    if (!user.completedDates.includes(todayStr)) {
      user.completedDates.push(todayStr);
    }

    if (user.streakDays > (user.bestStreak || 0)) {
      user.bestStreak = user.streakDays;
    }

    return true;
  } catch (e) {
    console.warn('Streak update error:', e);
    return false;
  }
}

router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Your account has been deactivated' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const streakUpdated = updateStreakOnActivity(user);
    if (streakUpdated) {
      await user.save();
    }

    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        stream: user.stream,
        physicalScienceElective: user.physicalScienceElective,
        targetExamYear: user.targetExamYear,
        targetExamDate: user.targetExamDate,
        targetZScore: user.targetZScore,
        mobileNumber: user.mobileNumber,
        dailyHoursGoal: user.dailyHoursGoal,
        weeklyHoursGoal: user.weeklyHoursGoal,
        streakDays: user.streakDays,
        bestStreak: user.bestStreak,
        badges: user.badges,
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/profile', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const streakUpdated = updateStreakOnActivity(user);
    if (streakUpdated) {
      await (user as any).save();
    }
    res.json({ user });
  } catch (e) {
    res.json({ user: req.user });
  }
});

router.put('/profile', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const {
      name,
      email,
      currentPassword,
      newPassword,
      stream,
      physicalScienceElective,
      targetExamYear,
      targetExamDate,
      targetZScore,
      mobileNumber,
      motivationNote,
      dailyHoursGoal,
      weeklyHoursGoal,
    } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({ message: 'Name must be at least 2 characters long' });
        return;
      }
      user.name = name.trim();
    }

    if (email !== undefined && email.trim().toLowerCase() !== user.email) {
      const cleanEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail)) {
        res.status(400).json({ message: 'Please provide a valid email address' });
        return;
      }
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existing) {
        res.status(400).json({ message: 'This email is already in use by another account' });
        return;
      }
      user.email = cleanEmail;
    }

    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        res.status(400).json({ message: 'New password must be at least 6 characters long' });
        return;
      }
      if (user.passwordHash && currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          res.status(400).json({ message: 'Current password does not match' });
          return;
        }
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    if (stream !== undefined) {
      const validStreams = ['Physical Science', 'Biological Science', 'Maths', 'Bio'];
      if (validStreams.includes(stream)) user.stream = stream;
    }

    if (physicalScienceElective !== undefined) {
      user.physicalScienceElective = physicalScienceElective === 'ICT' ? 'ICT' : 'Chemistry';
    }

    if (targetExamYear !== undefined) user.targetExamYear = String(targetExamYear).trim();
    if (targetExamDate !== undefined) user.targetExamDate = String(targetExamDate).trim();
    if (targetZScore !== undefined) user.targetZScore = String(targetZScore).trim();
    
    const incomingPhone = req.body.mobileNumber || req.body.whatsappNumber || req.body.phoneNumber || req.body.phone;
    if (incomingPhone !== undefined) {
      const cleanPhone = String(incomingPhone).trim();
      user.mobileNumber = cleanPhone;
      user.whatsappNumber = cleanPhone;
      user.phoneNumber = cleanPhone;
      user.phone = cleanPhone;
    }
    if (motivationNote !== undefined) user.motivationNote = String(motivationNote).trim();
    if (req.body.timezone !== undefined) user.timezone = String(req.body.timezone).trim();

    if (dailyHoursGoal !== undefined) {
      const val = Number(dailyHoursGoal);
      if (!isNaN(val) && val >= 1 && val <= 24) {
        user.dailyHoursGoal = val;
      }
    }

    if (weeklyHoursGoal !== undefined) {
      const val = Number(weeklyHoursGoal);
      if (!isNaN(val) && val >= 1 && val <= 168) {
        user.weeklyHoursGoal = val;
      }
    }

    if (req.body.streakDays !== undefined) {
      const val = Number(req.body.streakDays);
      if (!isNaN(val) && val >= 1) {
        user.streakDays = val;
        if (val > (user.bestStreak || 0)) {
          user.bestStreak = val;
        }
      }
    }
    if (req.body.bestStreak !== undefined) {
      const val = Number(req.body.bestStreak);
      if (!isNaN(val) && val >= 1) user.bestStreak = val;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        stream: user.stream,
        physicalScienceElective: user.physicalScienceElective,
        targetExamYear: user.targetExamYear,
        targetExamDate: user.targetExamDate,
        targetZScore: user.targetZScore,
        mobileNumber: user.mobileNumber,
        motivationNote: user.motivationNote,
        dailyHoursGoal: user.dailyHoursGoal,
        weeklyHoursGoal: user.weeklyHoursGoal,
        streakDays: user.streakDays,
        bestStreak: user.bestStreak,
        badges: user.badges,
      },
    });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

router.post('/push-subscription', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ message: 'Invalid push subscription payload' });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (user) {
      const exists = user.pushSubscriptions.some((sub) => sub.endpoint === subscription.endpoint);
      if (!exists) {
        user.pushSubscriptions.push(subscription);
        await user.save();
      }
    }
    res.json({ message: 'Push notification subscription saved' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving push subscription' });
  }
});

router.post('/forgot-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({ message: 'Please provide a valid email address' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Return 200 for security reasons or informative message
      res.json({ message: `If an account with ${cleanEmail} exists, a password reset link has been sent.` });
      return;
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Determine client host URL
    const clientUrl = req.headers.origin || req.headers.referer || process.env.CLIENT_URL || 'http://localhost:3000';
    const cleanClientUrl = clientUrl.replace(/\/$/, '');
    const resetUrl = `${cleanClientUrl}/?resetToken=${token}&email=${encodeURIComponent(cleanEmail)}`;

    // Dispatch email
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({ message: `Password reset link sent to ${user.email}. Please check your email inbox!` });
  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Error processing password reset request', error: error.message });
  }
});

router.post('/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Reset token is required' });
      return;
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired password reset link. Please request a new one.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful! You can now sign in with your new password.' });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

export default router;
