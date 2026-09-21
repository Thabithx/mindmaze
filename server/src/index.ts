import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import syllabusRoutes from './routes/syllabusRoutes.js';
import mistakeRoutes from './routes/mistakeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import Timetable from './models/Timetable.js';
import User from './models/User.js';
import { sendStudyReminderEmail } from './services/emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Mind Maze GCE A/L API Server 🚀',
    status: 'online',
    healthCheck: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mind Maze API Server', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/mistakes', mistakeRoutes);
app.use('/api/admin', adminRoutes);

// Cron Job: Check timetables every minute for upcoming study session reminders
cron.schedule('* * * * *', async () => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Find slots matching today and start time
    const slots = await Timetable.find({
      dayOfWeek: currentDay,
      startTime: currentHHMM,
      reminderEnabled: true,
      isCompleted: false,
    }).populate('user');

    for (const slot of slots) {
      const user = slot.user as any;
      if (user && user.email && user.isActive) {
        await sendStudyReminderEmail(
          user.email,
          user.name,
          slot.subject,
          slot.topic,
          slot.startTime,
          slot.notes
        );
      }
    }
  } catch (error) {
    console.error('[Cron Error] Automated timetable reminder failed:', error);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Mind Maze Server] Running on port ${PORT}`);
});
