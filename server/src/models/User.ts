import mongoose, { Schema, Document } from 'mongoose';

export type StreamType = 'Physical Science' | 'Biological Science' | 'Maths' | 'Bio';
export type UserRole = 'student' | 'admin';

export interface IPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  stream: StreamType;
  physicalScienceElective: 'Chemistry' | 'ICT';
  targetExamYear: string;
  targetExamDate: string;
  targetZScore: string;
  mobileNumber: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  phone?: string;
  motivationNote: string;
  dailyHoursGoal: number;
  weeklyHoursGoal: number;
  xp: number;
  streakDays: number;
  bestStreak: number;
  lastCompletedDate?: string;
  completedDates: string[];
  badges: string[];
  pushSubscriptions: IPushSubscription[];
  timezone?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema({
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    stream: {
      type: String,
      enum: ['Physical Science', 'Biological Science', 'Maths', 'Bio'],
      default: 'Physical Science',
    },
    physicalScienceElective: { type: String, enum: ['Chemistry', 'ICT'], default: 'Chemistry' },
    targetExamYear: { type: String, default: '2026' },
    targetExamDate: { type: String, default: '' },
    targetZScore: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    phone: { type: String, default: '' },
    motivationNote: { type: String, default: '' },
    dailyHoursGoal: { type: Number, default: 4 },
    weeklyHoursGoal: { type: Number, default: 28 },
    xp: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: '' },
    completedDates: [{ type: String }],
    badges: [{ type: String }],
    pushSubscriptions: [PushSubscriptionSchema],
    timezone: { type: String, default: 'Asia/Colombo' },
    resetPasswordToken: { type: String, default: '' },
    resetPasswordExpires: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
