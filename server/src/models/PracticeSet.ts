import mongoose, { Schema } from 'mongoose';

export const PRACTICE_CATEGORIES = ['daily', 'weekly'] as const;
export type PracticeCategory = (typeof PRACTICE_CATEGORIES)[number];

// One published unit of practice: a Daily Spark (1 question) or a Weekly Century (up to 100 MCQs),
// always belonging to one subject and one publish date (YYYY-MM-DD, Sri Lanka calendar day).
const ReviewImageSchema = new Schema({ imageId: { type: String, required: true }, alt: { type: String, default: '' } }, { _id: false });

const QuestionSchema = new Schema(
  {
    text: { type: String, required: true },
    imageId: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
    options: { type: [String], required: true },
    correctIndices: { type: [Number], required: true },
    explanation: { type: String, default: '' },
    reviewImages: { type: [ReviewImageSchema], default: [] },
  },
  { _id: false }
);

const PracticeSetSchema = new Schema(
  {
    category: { type: String, enum: PRACTICE_CATEGORIES, required: true },
    subject: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    topic: { type: String, default: '', trim: true, maxlength: 120 },
    publishDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    isPublished: { type: Boolean, default: false },
    questions: { type: [QuestionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PracticeSetSchema.index({ category: 1, subject: 1, isPublished: 1, publishDate: -1 });

export default mongoose.model('PracticeSet', PracticeSetSchema);
