import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { StreamType } from '../models/User.js';
import { protect, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mind_maze_jwt_secret_key_2026_al_app';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
// @desc    Register a new student/user
router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, stream, physicalScienceElective } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Make the first registered user admin automatically if no admin exists, else student
    const count = await User.countDocuments();
    const role = count === 0 ? 'admin' : 'student';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      stream: stream || 'Physical Science',
      physicalScienceElective: physicalScienceElective || 'Chemistry',
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
        xp: user.xp,
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
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
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
        xp: user.xp,
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
// @desc    Update profile info (Stream, Elective, Exam Date, Z-Score, Mobile, Goals)
router.put('/profile', protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const {
      name,
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

    if (name !== undefined) user.name = name;
    if (stream !== undefined) user.stream = stream;
    if (physicalScienceElective !== undefined) user.physicalScienceElective = physicalScienceElective;
    if (targetExamYear !== undefined) user.targetExamYear = targetExamYear;
    if (targetExamDate !== undefined) user.targetExamDate = targetExamDate;
    if (targetZScore !== undefined) user.targetZScore = targetZScore;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (motivationNote !== undefined) user.motivationNote = motivationNote;
    if (dailyHoursGoal !== undefined) user.dailyHoursGoal = Number(dailyHoursGoal);
    if (weeklyHoursGoal !== undefined) user.weeklyHoursGoal = Number(weeklyHoursGoal);

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
        xp: user.xp,
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
