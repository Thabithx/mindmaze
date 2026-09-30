import { Router, Response } from 'express';
import multer from 'multer';
import { savePdf, removePdf, downloadPdf } from '../services/pdfStorage.js';
import Course from '../models/Course.js';
import { protect, adminOnly, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max PDF size
});

const present = (course: any) => ({...course.toObject(), pdfPath: (course.pdfUrl || course.pdfPublicId) ? '/courses/' + course._id + '/download' : undefined});
router.get('/:id/download', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) { res.status(404).json({message: 'Course not found'}); return; }
    await downloadPdf(course, res);
  } catch { if (!res.headersSent) res.status(500).json({message: 'Could not download PDF.'}); }
});
router.get('/', async (req: any, res: Response): Promise<void> => {
  try {
    const { stream, subject } = req.query;
    const filter: any = {};
    if (stream) filter.stream = stream;
    if (subject) filter.subject = subject;

    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json({ courses: courses.map(present) });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

router.get('/:id', async (req: any, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    res.json({ course: present(course) });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching course details' });
  }
});

router.post('/', protect, adminOnly, (req, res, next) => { upload.single('pdfFile')(req, res, error => error ? res.status(400).json({message: error.message}) : next()); }, async (req: AuthRequest, res: Response): Promise<void> => {
  let stored: any;
  try {
    const { title, description, subject, stream, videoUrl, thumbnailUrl, quizJson } = req.body;

    if (!title || !description || !subject || !stream) {
      res.status(400).json({ message: 'Title, description, subject, and stream are required' });
      return;
    }

    if (req.file) {
      if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') { res.status(400).json({message: 'Select a valid PDF file.'}); return; }
      stored = await savePdf(req.file);
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
      ...stored,
      videoUrl: videoUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      quiz: parsedQuiz,
      createdBy: req.user!._id,
    });

    res.status(201).json({ message: 'Course created successfully', course: present(course) });
  } catch (error: any) {
    if (stored) await removePdf(stored).catch(() => {});
    console.error('Course creation error:', error);
    res.status(500).json({ message: 'Failed to create course', error: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }

    await removePdf(course);

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete course' });
  }
});

export default router;
