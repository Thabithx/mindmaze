import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface ICourse extends Document {
  title: string;
  description: string;
  subject: string;
  stream: string;
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

export default mongoose.model<ICourse>('Course', CourseSchema);
