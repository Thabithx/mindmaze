import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { connectDB } from './config/db.js';
import { seedAdminUser } from './config/seedAdmin.js';

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

connectDB().then(() => {
  seedAdminUser();
});

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

cron.schedule('* * * * *', async () => {
  try {
    const slots = await Timetable.find({
      reminderEnabled: true,
      isCompleted: false,
    }).populate('user');

    const now = new Date();

    for (const slot of slots) {
      const user = slot.user as any;
      if (!user || !user.email || user.isActive === false) continue;

      const userTz = user.timezone || 'Asia/Colombo';

      let localDay = '';
      let localDate = '';
      let localHHMM = '';

      try {
        localDay = new Intl.DateTimeFormat('en-US', { timeZone: userTz, weekday: 'long' }).format(now);
        localDate = new Intl.DateTimeFormat('en-CA', { timeZone: userTz }).format(now); // YYYY-MM-DD
        localHHMM = new Intl.DateTimeFormat('en-GB', {
          timeZone: userTz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now);
      } catch (tzErr) {
        // Fallback to Asia/Colombo
        localDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', weekday: 'long' }).format(now);
        localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(now);
        localHHMM = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Colombo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now);
      }

      // Check if slot is for today
      if (slot.dayOfWeek !== localDay) continue;

      // Check if reminder was already sent today for this slot
      if (slot.lastReminderSentDate === localDate) continue;

      // Calculate time difference in minutes
      const [curH, curM] = localHHMM.split(':').map(Number);
      const [startH, startM] = (slot.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = (slot.endTime || '23:59').split(':').map(Number);

      const curTotalMins = curH * 60 + curM;
      const startTotalMins = startH * 60 + startM;
      const endTotalMins = endH * 60 + endM;

      // Send reminder when task starts (window: from start time up to 10 mins into the block)
      const isStartWindow = curTotalMins >= startTotalMins && curTotalMins <= startTotalMins + 10 && curTotalMins <= endTotalMins;

      if (isStartWindow) {
        // Mark as sent immediately to prevent any duplicate triggers
        slot.lastReminderSentDate = localDate;
        await slot.save();

        console.log(`[Cron Reminder] Sending automated start reminder to ${user.email} for "${slot.topic}" (${slot.subject}) scheduled at ${slot.startTime} [Local: ${localHHMM} ${userTz}]`);

        try {
          await sendStudyReminderEmail(
            user.email,
            user.name || 'Scholar',
            slot.subject,
            slot.topic,
            slot.startTime,
            slot.notes
          );
          console.log(`[Cron Reminder] Successfully sent automated reminder email to ${user.email}`);
        } catch (emailErr: any) {
          console.error(`[Cron Reminder] Failed to send email to ${user.email}:`, emailErr?.message || emailErr);
        }
      }
    }
  } catch (error) {
    console.error('[Cron Error] Automated timetable reminder failed:', error);
  }
});

// Self Keep-Alive Ping (every 10 minutes to prevent Render free-tier cold sleep during study hours)
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;
if (SERVER_URL) {
  setInterval(async () => {
    try {
      await fetch(`${SERVER_URL}/api/health`);
    } catch {
      // Ignore background ping errors
    }
  }, 10 * 60 * 1000);
}

// Start Server
app.listen(PORT, () => {
  console.log(`[Mind Maze Server] Running on port ${PORT}`);
});
