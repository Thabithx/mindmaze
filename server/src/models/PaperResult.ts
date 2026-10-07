import mongoose, { Schema } from 'mongoose';

// One permanent row per submitted online MCQ paper by a logged-in student.
// (PaperAttempt rows expire after 7 days; this is the lasting record used for activity reports.)
const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attempt: { type: Schema.Types.ObjectId, required: true, unique: true },
    paper: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    percentage: { type: Number, required: true },
    timedOut: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
schema.index({ user: 1, submittedAt: -1 });

export default mongoose.model('PaperResult', schema);
