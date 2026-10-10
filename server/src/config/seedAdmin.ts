import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const ADMIN_EMAIL = 'admin@mindmaze.app';
export const ADMIN_PASSWORD = 'AdminMindMaze2026!';

export const seedAdminUser = async (): Promise<void> => {
  try {
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);
      admin = await User.create({
        name: 'Mind Maze Administrator',
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        stream: 'Physical Science',
        physicalScienceElective: 'ICT',
        targetExamYear: '2026',
        isActive: true,
        streakDays: 30,
        bestStreak: 30,
        xp: 5000,
      });
      console.log(`[Admin Seed] Master admin account created: ${ADMIN_EMAIL}`);
    } else {
      let updated = false;
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        updated = true;
      }
      if (!admin.isActive) {
        admin.isActive = true;
        updated = true;
      }
      if (!admin.indexNumber) {
        admin.indexNumber = 'MM-ADMIN-01';
        updated = true;
      }
      if (updated) {
        await admin.save();
        console.log(`[Admin Seed] Admin permissions verified for: ${ADMIN_EMAIL}`);
      }
    }
  } catch (error) {
    console.error('[Admin Seed] Error seeding admin account:', error);
  }
};
