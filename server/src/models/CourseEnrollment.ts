import mongoose, { Schema, Document } from 'mongoose';

export type EnrollmentStatus = 'pending' | 'approved' | 'rejected';

export interface ICourseEnrollment extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  status: EnrollmentStatus;
  amount: number;
  isFree: boolean;
  slipUrl: string;
  slipPublicId: string;
  slipFileName: string;
  bankReference: string;
  notes: string;
  adminNotes: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CourseEnrollmentSchema = new Schema<ICourseEnrollment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    amount: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: false },
    slipUrl: { type: String, default: '' },
    slipPublicId: { type: String, default: '' },
    slipFileName: { type: String, default: '' },
    bankReference: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    adminNotes: { type: String, default: '', trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CourseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
CourseEnrollmentSchema.index({ status: 1, createdAt: -1 });
CourseEnrollmentSchema.index({ course: 1, status: 1 });

export default mongoose.model<ICourseEnrollment>('CourseEnrollment', CourseEnrollmentSchema);
