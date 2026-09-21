import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtopicTarget {
  subtopic: string;
  targetProgress: number;
}

export interface ITimetable extends Document {
  user: mongoose.Types.ObjectId;
  dayOfWeek: string;
  subject: string;
  topic: string;
  blockType: 'study' | 'revision';
  topicId?: string;
  subtopicTargets: ISubtopicTarget[];
  isCompleted: boolean;
  startTime: string;
  endTime: string;
  color: string;
  reminderEnabled: boolean;
  reminderOffsetMinutes: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubtopicTargetSchema = new Schema(
  {
    subtopic: { type: String, required: true },
    targetProgress: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const TimetableSchema = new Schema<ITimetable>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    blockType: { type: String, enum: ['study', 'revision'], default: 'study' },
    topicId: { type: String, default: '' },
    subtopicTargets: [SubtopicTargetSchema],
    isCompleted: { type: Boolean, default: false },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    color: { type: String, default: 'blue' },
    reminderEnabled: { type: Boolean, default: true },
    reminderOffsetMinutes: { type: Number, default: 15 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ITimetable>('Timetable', TimetableSchema);
