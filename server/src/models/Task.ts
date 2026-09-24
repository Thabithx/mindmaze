import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  user: mongoose.Types.ObjectId;
  taskId: string;
  date: string;
  title: string;
  subject: string;
  blockType?: string;
  topicId?: string;
  topicTitle?: string;
  subtopic?: string;
  targetProgress?: number;
  subtopicTargets?: { subtopic: string; targetProgress: number }[];
  isCompleted: boolean;
  completedAt?: string;
  timeSlot?: string;
  startTime?: string;
  endTime?: string;
  estimatedMinutes?: number;
  priority: 'High' | 'Medium' | 'Low';
  fromTimetableId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: String, required: true },
    date: { type: String, required: true },
    title: { type: String, required: true },
    subject: { type: String, default: '' },
    blockType: { type: String, default: 'study' },
    topicId: { type: String, default: '' },
    topicTitle: { type: String, default: '' },
    subtopic: { type: String, default: '' },
    targetProgress: { type: Number, default: 100 },
    subtopicTargets: [
      {
        subtopic: { type: String },
        targetProgress: { type: Number, default: 100 },
      },
    ],
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: String },
    timeSlot: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    estimatedMinutes: { type: Number, default: 60 },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    fromTimetableId: { type: String },
  },
  { timestamps: true }
);

TaskSchema.index({ user: 1, taskId: 1 }, { unique: true });

export default mongoose.model<ITask>('Task', TaskSchema);
