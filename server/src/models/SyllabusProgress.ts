import mongoose, { Schema, Document } from 'mongoose';

export interface ISyllabusProgress extends Document {
  user: mongoose.Types.ObjectId;
  topicId: string;
  subject: string;
  unitNumber: number;
  unitTitle: string;
  topicTitle: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedSubtopics: string[];
  subtopicProgress: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const SyllabusProgressSchema = new Schema<ISyllabusProgress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topicId: { type: String, required: true },
    subject: { type: String, required: true },
    unitNumber: { type: Number, default: 1 },
    unitTitle: { type: String, default: '' },
    topicTitle: { type: String, required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    completedSubtopics: [{ type: String }],
    subtopicProgress: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

SyllabusProgressSchema.index({ user: 1, topicId: 1 }, { unique: true });

export default mongoose.model<ISyllabusProgress>('SyllabusProgress', SyllabusProgressSchema);
