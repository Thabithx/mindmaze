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
import taskRoutes from './routes/taskRoutes.js';
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
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const str = String(timeStr).trim();

  // 12-hour format with AM/PM (e.g., "6:30 PM", "06:30 am", "6:30pm")
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = parseInt(ampmMatch[2], 10);
    const meridian = ampmMatch[3].toLowerCase();
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  // 24-hour format (e.g., "18:30", "6:30", "06:30")
  const match24 = str.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = parseInt(match24[2], 10);
    return hours * 60 + mins;
  }

  return null;
}

cron.schedule('* * * * *', async () => {
  try {
    const slots = await Timetable.find({
      reminderEnabled: true,
      isCompleted: false,
    }).populate('user');

    if (!slots || slots.length === 0) return;

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

      const curMins = parseTimeToMinutes(localHHMM);
      const startMins = parseTimeToMinutes(slot.startTime);

      if (curMins === null || startMins === null) continue;

      // Match window: When task is starting (from 1 min before start up to 10 mins after start)
      const isStartWindow = curMins >= (startMins - 1) && curMins <= (startMins + 10);

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
