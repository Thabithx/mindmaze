import { Router, Response } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import Course from '../models/Course.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadToCloudinary = (fileBuffer: Buffer, fileName: string, folder: string = 'courses'): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        public_id: `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// @route   GET /api/courses
router.get('/', async (req: any, res: Response): Promise<void> => {
  try {
    const { stream, subject } = req.query;
    const filter: any = {};
    if (stream) filter.stream = stream;
    if (subject) filter.subject = subject;

    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json({ courses });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course
router.get('/:id', async (req: any, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    res.json({ course });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching course details' });
  }
});

// @route   POST /api/courses
router.post('/', protect, adminOnly, upload.single('pdfFile'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, subject, stream, videoUrl, thumbnailUrl, quizJson } = req.body;

    if (!title || !description || !subject || !stream) {
      res.status(400).json({ message: 'Title, description, subject, and stream are required' });
      return;
    }

    let pdfUrl = '';
    let pdfPublicId = '';
    let pdfFileName = '';

    if (req.file) {
      pdfFileName = req.file.originalname;
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'mind_maze_courses');
      pdfUrl = cloudinaryResult.secure_url;
      pdfPublicId = cloudinaryResult.public_id;
    }

    let parsedQuiz = [];
    if (quizJson) {
      try {
        parsedQuiz = typeof quizJson === 'string' ? JSON.parse(quizJson) : quizJson;
      } catch (err) {
        console.warn('Could not parse quizJson:', err);
      }
    }

    const course = await Course.create({
      title,
      description,
      subject,
      stream,
      pdfUrl,
      pdfPublicId,
      pdfFileName,
      videoUrl: videoUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      quiz: parsedQuiz,
      createdBy: req.user!._id,
    });

    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error: any) {
    console.error('Course creation error:', error);
    res.status(500).json({ message: 'Failed to create course', error: error.message });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course (Admin only)
router.delete('/:id', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    // Delete PDF from Cloudinary if exists
    if (course.pdfPublicId) {
      try {
        await cloudinary.uploader.destroy(course.pdfPublicId, { resource_type: 'raw' });
      } catch (e) {
        console.warn('Failed to delete Cloudinary PDF:', e);
      }
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

export default router;
