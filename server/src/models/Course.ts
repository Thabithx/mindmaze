import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  questionText: string;
  questionType?: 'mcq' | 'text';
  imageUrl?: string;
  imagePublicId?: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface ICurriculumBlock {
  type: 'video' | 'live_class' | 'document' | 'description' | 'quiz' | 'paper';
  title?: string;
  description?: string;
  // Video block
  url?: string;
  // Live Class block
  liveLink?: string;
  scheduledTime?: string;
  meetingPlatform?: string;
  isCompleted?: boolean;
  recordingUrl?: string;
  recordingPdfUrl?: string;
  recordingPdfFileName?: string;
  recordingPdfPublicId?: string;
  // Document block
  pdfProvider?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  pdfFileName?: string;
  size?: number;
  // Quiz block
  quizQuestions?: IQuizQuestion[];
  passPercentage?: number;
  // Paper / Assignment block
  paperUrl?: string;
  paperFileName?: string;
  paperPublicId?: string;
  paperProvider?: string;
  resultSheetUrl?: string;
  resultSheetFileName?: string;
  resultSheetPublicId?: string;
  resultSheetProvider?: string;
  totalMarks?: number;
  deadline?: string;
  // Order
  order: number;
}

export interface ICourse extends Document {
  title: string;
  description: string;
  subject: string;
  stream: string;
  topic: string;
  topicOrder: number;
  lessonOrder: number;
  estimatedMinutes: number;
  medium: string;
  syllabus: string;
  status: string;
  revision: number;
  courseType?: 'free' | 'one_time' | 'monthly';
  isMonthlyProgram?: boolean;
  parentCourseId?: mongoose.Types.ObjectId;
  targetMonth?: string;
  enforceSequentialProgression?: boolean;
  validityPeriod?: '1_month' | '3_months' | '6_months' | '1_year' | 'lifetime';
  validityMonths?: number;
  price: number;
  isFree: boolean;
  billingType?: 'one_time' | 'monthly';
  monthlyFee?: number;
  bankDetails?: string;
  videos: {title: string; url: string; description?: string}[];
  resources: any[];
  curriculumBlocks?: ICurriculumBlock[];
  relatedPaperIds: string[];
  pdfProvider?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  pdfFileName?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  thumbnailPublicId?: string;
  quiz?: IQuizQuestion[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema({
  questionText: { type: String, required: true },
  questionType: { type: String, enum: ['mcq', 'text'], default: 'mcq' },
  imageUrl: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  options: [{ type: String }],
  correctOptionIndex: { type: Number, default: 0 },
  explanation: { type: String, default: '' },
}, { _id: true });

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    subject: { type: String, required: true },
    stream: { type: String, required: true },
    topic: { type: String, default: 'General', trim: true },
    topicOrder: { type: Number, default: 1, min: 0 },
    lessonOrder: { type: Number, default: 1, min: 0 },
    estimatedMinutes: { type: Number, default: 15, min: 1 },
    medium: { type: String, default: 'English' },
    syllabus: { type: String, default: 'current' },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    revision: { type: Number, default: 0 },
    courseType: { type: String, enum: ['free', 'one_time', 'monthly'], default: 'one_time' },
    isMonthlyProgram: { type: Boolean, default: false },
    parentCourseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    targetMonth: { type: String, default: '', trim: true },
    enforceSequentialProgression: { type: Boolean, default: true },
    validityPeriod: { type: String, enum: ['1_month', '3_months', '6_months', '1_year', 'lifetime'], default: 'lifetime' },
    validityMonths: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: true },
    billingType: { type: String, enum: ['one_time', 'monthly'], default: 'one_time' },
    monthlyFee: { type: Number, default: 0, min: 0 },
    bankDetails: { type: String, default: '' },
    videos: [{ title: String, url: String, description: { type: String, default: '' } }],
    resources: [{ pdfProvider: String, pdfUrl: String, pdfPublicId: String, pdfFileName: String, size: Number }],
    curriculumBlocks: [
      {
        type: { type: String, enum: ['video', 'live_class', 'document', 'description', 'quiz', 'paper'], required: true },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        url: { type: String, default: '' },
        liveLink: { type: String, default: '' },
        scheduledTime: { type: String, default: '' },
        meetingPlatform: { type: String, default: 'Zoom / Google Meet' },
        isCompleted: { type: Boolean, default: false },
        recordingUrl: { type: String, default: '' },
        recordingPdfUrl: { type: String, default: '' },
        recordingPdfFileName: { type: String, default: '' },
        recordingPdfPublicId: { type: String, default: '' },
        pdfProvider: { type: String, default: 'cloudinary' },
        pdfUrl: { type: String, default: '' },
        pdfPublicId: { type: String, default: '' },
        pdfFileName: { type: String, default: '' },
        size: { type: Number, default: 0 },
        quizQuestions: [QuizQuestionSchema],
        passPercentage: { type: Number, default: 50 },
        // Paper / Assignment block
        paperUrl: { type: String, default: '' },
        paperFileName: { type: String, default: '' },
        paperPublicId: { type: String, default: '' },
        paperProvider: { type: String, default: 'cloudinary' },
        resultSheetUrl: { type: String, default: '' },
        resultSheetFileName: { type: String, default: '' },
        resultSheetPublicId: { type: String, default: '' },
        resultSheetProvider: { type: String, default: 'cloudinary' },
        totalMarks: { type: Number, default: 100 },
        deadline: { type: String, default: '' },
        order: { type: Number, default: 0 },
      },
    ],
    relatedPaperIds: [{type: String}],
    pdfProvider: { type: String, enum: ['local', 'raw', 'image'] },
    pdfUrl: { type: String, default: '' },
    pdfPublicId: { type: String, default: '' },
    pdfFileName: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    thumbnailPublicId: { type: String, default: '' },
    quiz: [QuizQuestionSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CourseSchema.index({subject:1,topicOrder:1,lessonOrder:1,_id:1});
CourseSchema.index({status:1,subject:1,topicOrder:1,lessonOrder:1,_id:1});
CourseSchema.index({parentCourseId: 1});
export default mongoose.model<ICourse>('Course', CourseSchema);
