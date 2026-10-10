import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface ICurriculumBlock {
  type: 'video' | 'live_class' | 'document' | 'description' | 'quiz';
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
  // Document block
  pdfProvider?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  pdfFileName?: string;
  size?: number;
  // Quiz block
  quizQuestions?: IQuizQuestion[];
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
  price: number;
  isFree: boolean;
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
  quiz?: IQuizQuestion[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true, default: 0 },
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
    price: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: true },
    bankDetails: { type: String, default: '' },
    videos: [{ title: String, url: String, description: { type: String, default: '' } }],
    resources: [{ pdfProvider: String, pdfUrl: String, pdfPublicId: String, pdfFileName: String, size: Number }],
    curriculumBlocks: [
      {
        type: { type: String, enum: ['video', 'live_class', 'document', 'description', 'quiz'], required: true },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        url: { type: String, default: '' },
        liveLink: { type: String, default: '' },
        scheduledTime: { type: String, default: '' },
        meetingPlatform: { type: String, default: 'Zoom / Google Meet' },
        isCompleted: { type: Boolean, default: false },
        recordingUrl: { type: String, default: '' },
        pdfProvider: { type: String, default: 'cloudinary' },
        pdfUrl: { type: String, default: '' },
        pdfPublicId: { type: String, default: '' },
        pdfFileName: { type: String, default: '' },
        size: { type: Number, default: 0 },
        quizQuestions: [QuizQuestionSchema],
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
    quiz: [QuizQuestionSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CourseSchema.index({subject:1,topicOrder:1,lessonOrder:1,_id:1});
CourseSchema.index({status:1,subject:1,topicOrder:1,lessonOrder:1,_id:1});
export default mongoose.model<ICourse>('Course', CourseSchema);
