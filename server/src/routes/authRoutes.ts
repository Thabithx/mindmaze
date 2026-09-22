import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { StreamType } from '../models/User.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mind_maze_jwt_secret_key_2026_al_app';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
// @desc    Register a new student/user
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

    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      stream: selectedStream,
      physicalScienceElective: physicalScienceElective === 'ICT' ? 'ICT' : 'Chemistry',
      targetExamYear: '2026',
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
        mobileNumber: user.mobileNumber,
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

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
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

// @route   GET /api/auth/profile
// @desc    Get logged in user profile
router.get('/profile', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

// @route   PUT /api/auth/profile
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
    if (mobileNumber !== undefined) user.mobileNumber = String(mobileNumber).trim();
    if (motivationNote !== undefined) user.motivationNote = String(motivationNote).trim();

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

// @route   POST /api/auth/push-subscription
// @desc    Subscribe to push notifications
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

export default router;
