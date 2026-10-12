import mongoose, {Schema} from 'mongoose';

const QuizSubmissionAnswerSchema = new Schema({
  questionText: { type: String, default: '' },
  questionType: { type: String, enum: ['mcq', 'text'], default: 'mcq' },
  imageUrl: { type: String, default: '' },
  options: [{ type: String }],
  selectedIndex: { type: Number },
  textAnswer: { type: String, default: '' },
  correctOptionIndex: { type: Number },
  explanation: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  adminGraded: { type: Boolean, default: false },
}, { _id: false });

const QuizSubmissionSchema = new Schema({
  blockKey: { type: String, default: '' },
  blockTitle: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['passed', 'failed', 'pending_review'], default: 'pending_review' },
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  passPercentage: { type: Number, default: 50 },
  percentage: { type: Number, default: 0 },
  hasOpenEnded: { type: Boolean, default: false },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  adminFeedback: { type: String, default: '' },
  answers: [QuizSubmissionAnswerSchema],
}, { _id: true });

const PaperSubmissionSchema = new Schema({
  blockKey: { type: String, default: '' },
  blockTitle: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending_review', 'reviewed'], default: 'pending_review' },
  submissionUrl: { type: String, default: '' },
  submissionFileName: { type: String, default: '' },
  submissionPublicId: { type: String, default: '' },
  submissionProvider: { type: String, default: 'cloudinary' },
  studentNotes: { type: String, default: '' },
  marks: { type: Number, default: null },
  maxMarks: { type: Number, default: 100 },
  grade: { type: String, default: '' },
  adminFeedback: { type: String, default: '' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  resultSheetUrl: { type: String, default: '' },
  resultSheetFileName: { type: String, default: '' },
  resultSheetPublicId: { type: String, default: '' },
  resultSheetProvider: { type: String, default: 'cloudinary' },
}, { _id: true });

const schema = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  course: {type: Schema.Types.ObjectId, ref: 'Course', required: true},
  completed: {type: Boolean, default: false},
  completedBlocks: {type: [String], default: []},
  lastOpenedAt: {type: Date, default: Date.now},
  quizScore: {type: Number, default: null},
  quizTotal: {type: Number, default: 0},
  needsRevision: {type: Boolean, default: false},
  quizSubmissions: [QuizSubmissionSchema],
  paperSubmissions: [PaperSubmissionSchema],
}, {timestamps: true});
schema.index({user: 1, course: 1}, {unique: true});
export default mongoose.model('CourseProgress', schema);
