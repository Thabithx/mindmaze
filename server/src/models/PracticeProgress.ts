import mongoose, { Schema } from 'mongoose';

// One small row per (student, practice set): counters, not one row per answer, so it stays tiny
// even for 100-question Weekly Century sets.
const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    set: { type: Schema.Types.ObjectId, ref: 'PracticeSet', required: true },
    category: { type: String, enum: ['daily', 'weekly'], required: true },
    subject: { type: String, required: true },
    answered: { type: Number, default: 0 },          // total answer submissions (retries included)
    correct: { type: Number, default: 0 },           // of those, how many were right
    questionsSeen: { type: [Number], default: [] },  // distinct question numbers answered
    questionsCorrect: { type: [Number], default: [] },// distinct question numbers answered correctly at least once
    firstAnsweredAt: { type: Date },
    lastAnsweredAt: { type: Date },
  },
  { timestamps: false }
);
schema.index({ user: 1, set: 1 }, { unique: true });
schema.index({ user: 1, lastAnsweredAt: -1 });
schema.index({ set: 1 });

export default mongoose.model('PracticeProgress', schema);
