import mongoose, { Schema, Document } from 'mongoose';

export type StreamType = 'Physical Science' | 'Biological Science' | 'Maths' | 'Bio';
export type UserRole = 'student' | 'admin' | 'content_manager';

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
  indexNumber?: string;
  passwordHash: string;
  telegramVerificationRequired: boolean;
  telegramVerifiedAt?: Date;
  telegramVerifiedPhone?: string;
  telegramUserId?: string;
  manualVerification?: { phone: string; approvedAt: Date; approvedBy: string; approvedByName: string; method: 'call' | 'whatsapp' };
  manualVerificationHistory: { phone: string; approvedAt: Date; approvedBy: string; approvedByName: string; method: 'call' | 'whatsapp' }[];
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
  timetableRevision: number;
  totalStudyMinutes: number;
  studyMinutesByDate: Map<string, number>;
  lastSeenAt?: Date;
  sessionCount?: number;
  totalActiveMinutes?: number;
  activeMinutesByDate?: Map<string, number>;
  xp: number;
  streakDays: number;
  bestStreak: number;
  lastCompletedDate?: string;
  completedDates: string[];
  badges: string[];
  pushSubscriptions: IPushSubscription[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  timezone?: string;
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
    indexNumber: { type: String, unique: true, sparse: true, trim: true },
    telegramVerificationRequired:{type:Boolean,default:false},
    telegramVerifiedAt:{type:Date,default:undefined},
    telegramVerifiedPhone:{type:String,unique:true,sparse:true,default:undefined},
    telegramUserId:{type:String,unique:true,sparse:true,default:undefined},
    manualVerification: { type: new Schema({phone:String,approvedAt:Date,approvedBy:String,approvedByName:String,method:{type:String,enum:['call','whatsapp']}},{_id:false}), default:undefined },
    manualVerificationHistory: { type: [new Schema({phone:String,approvedAt:Date,approvedBy:String,approvedByName:String,method:{type:String,enum:['call','whatsapp']}},{_id:false})], default:[] },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin', 'content_manager'], default: 'student' },
    stream: {
      type: String,
      enum: ['Physical Science', 'Biological Science', 'Maths', 'Bio'],
      default: 'Physical Science',
    },
    physicalScienceElective: { type: String, enum: ['Chemistry', 'ICT'], default: 'Chemistry' },
    targetExamYear: { type: String, default: '2027' },
    targetExamDate: { type: String, default: '' },
    targetZScore: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    phone: { type: String, default: '' },
    motivationNote: { type: String, default: '' },
    dailyHoursGoal: { type: Number, default: 4 },
    weeklyHoursGoal: { type: Number, default: 28 },
    studyMinutesByDate: { type: Map, of: Number, default: {} },
    timetableRevision: { type: Number, default: 0 },
    totalStudyMinutes: { type: Number, default: 0 },
    // Time in the system (measured server-side from activity pings; separate from the study timer)
    lastSeenAt: { type: Date },
    sessionCount: { type: Number, default: 0 },
    totalActiveMinutes: { type: Number, default: 0 },
    activeMinutesByDate: { type: Map, of: Number, default: {} },
    xp: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: '' },
    completedDates: [{ type: String }],
    badges: [{ type: String }],
    pushSubscriptions: [PushSubscriptionSchema],
    resetPasswordToken: { type: String, default: undefined },
    resetPasswordExpires: { type: Date, default: undefined },
    timezone: { type: String, default: 'Asia/Colombo' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({createdAt:-1,_id:-1});
UserSchema.index({stream:1,createdAt:-1,_id:-1});

export default mongoose.model<IUser>('User', UserSchema);
