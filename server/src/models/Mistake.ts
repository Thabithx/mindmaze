import mongoose, { Schema, Document } from 'mongoose';

export interface IMistake extends Document {
  questionKey?: string;
  user: mongoose.Types.ObjectId;
  subject: string;
  topic: string;
  questionText: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  reviewStatus: 'Needs Review' | 'Reviewed' | 'Mastered';
  isMastered: boolean;
  dateAdded: Date;
}

const MistakeSchema = new Schema<IMistake>(
  {
    questionKey: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    questionText: { type: String, required: true },
    yourAnswer: { type: String, default: '' },
    correctAnswer: { type: String, default: '' },
    explanation: { type: String, default: '' },
    reviewStatus: {
      type: String,
      enum: ['Needs Review', 'Reviewed', 'Mastered'],
      default: 'Needs Review',
    },
    isMastered: { type: Boolean, default: false },
    dateAdded: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

MistakeSchema.index({ user: 1, questionKey: 1 }, { unique: true, partialFilterExpression: { questionKey: { $type: 'string' } } });

export default mongoose.model<IMistake>('Mistake', MistakeSchema);
