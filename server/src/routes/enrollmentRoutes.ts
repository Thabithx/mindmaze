import { Router, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import CourseEnrollment from '../models/CourseEnrollment.js';
import Course from '../models/Course.js';
import CourseProgress from '../models/CourseProgress.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { protect, contentManagerOnly, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for bank slip images or PDFs
});

// Helper to upload slip buffer to Cloudinary
async function uploadSlipToCloudinary(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf') ||
    (file.buffer && file.buffer.length >= 5 && file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-')));

  const rawPublicId = `slip_${randomUUID()}_${path.parse(file.originalname).name}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'mind_maze_slips',
        resource_type: isPdf ? 'raw' : 'image',
        public_id: rawPublicId,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary slip upload returned empty result'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(file.buffer);
  });
}

// -------------------------------------------------------------
// STUDENT ENROLLMENT ROUTES
// -------------------------------------------------------------

// 1. Enroll in course (Free or Paid with Bank Slip)
router.post(
  '/enroll/:courseId',
  protect,
  upload.single('slipFile'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { courseId } = req.params;
      if (!mongoose.isValidObjectId(courseId)) {
        res.status(400).json({ message: 'Invalid course ID.' });
        return;
      }

      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: 'Course not found.' });
        return;
      }

      const isFreeCourse = course.isFree || (course.price || 0) <= 0;
      const userId = req.user!._id;

      // Check existing enrollment
      const existing = await CourseEnrollment.findOne({ user: userId, course: courseId });

      // If it's a FREE course -> instant auto-approved enrollment
      if (isFreeCourse) {
        const enrollment = await CourseEnrollment.findOneAndUpdate(
          { user: userId, course: courseId },
          {
            $set: {
              status: 'approved',
              amount: 0,
              isFree: true,
              enrolledAt: new Date(),
              adminNotes: 'Auto-enrolled in free course',
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({
          success: true,
          status: 'approved',
          message: 'Enrolled successfully! You have full access to this course.',
          enrollment,
        });
        return;
      }

      // If it's a PAID course -> requires slip upload
      const file = req.file;
      if (!file) {
        // If already approved, don't require slip
        if (existing && existing.status === 'approved') {
          res.json({
            success: true,
            status: 'approved',
            message: 'You are already enrolled in this course.',
            enrollment: existing,
          });
          return;
        }

        res.status(400).json({
          message: 'Please upload your bank deposit receipt/slip (Image or PDF) to enroll in this course.',
        });
        return;
      }

      // Upload slip to Cloudinary
      const { url: slipUrl, publicId: slipPublicId } = await uploadSlipToCloudinary(file);

      const bankReference = typeof req.body.bankReference === 'string' ? req.body.bankReference.trim() : '';
      const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';

      const enrollment = await CourseEnrollment.findOneAndUpdate(
        { user: userId, course: courseId },
        {
          $set: {
            status: 'pending',
            amount: course.price || 0,
            isFree: false,
            slipUrl,
            slipPublicId,
            slipFileName: file.originalname,
            bankReference,
            notes,
            enrolledAt: new Date(),
            adminNotes: '',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({
        success: true,
        status: 'pending',
        message: 'Bank payment slip submitted! The administrator will review and activate your course access.',
        enrollment,
      });
    } catch (err: any) {
      console.error('[Enrollment] Error during course enrollment:', err);
      res.status(500).json({
        message: err.message || 'Could not process enrollment. Please try again.',
      });
    }
  }
);

// 2. Get all enrollments for logged-in user
router.get('/my', protect, async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await CourseEnrollment.find({ user: req.user!._id })
      .populate('course', 'title subject stream topic price isFree bankDetails status estimatedMinutes')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ enrollments });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch your course enrollments.' });
  }
});

// 3. Get single enrollment status for current user on specific course
router.get('/my/:courseId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      res.status(400).json({ message: 'Invalid course.' });
      return;
    }

    const enrollment = await CourseEnrollment.findOne({ user: req.user!._id, course: courseId }).lean();
    res.json({ enrollment: enrollment || null });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to check enrollment status.' });
  }
});

// -------------------------------------------------------------
// ADMIN ENROLLMENT & PAYMENT MANAGEMENT ROUTES
// -------------------------------------------------------------

// 4. Admin: View all enrollments with student & course details + learning progress
router.get('/admin/all', protect, contentManagerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { status, courseId, q } = req.query;
    const filter: any = {};

    if (typeof status === 'string' && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    if (typeof courseId === 'string' && mongoose.isValidObjectId(courseId)) {
      filter.course = courseId;
    }

    // Fetch enrollments
    const enrollments = await CourseEnrollment.find(filter)
      .populate('user', 'name email indexNumber mobileNumber whatsappNumber phoneNumber phone role stream')
      .populate('course', 'title subject stream topic price isFree status')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Attach student study progress for each enrollment
    const userIds = enrollments.map((e: any) => e.user?._id).filter(Boolean);
    const courseIds = enrollments.map((e: any) => e.course?._id).filter(Boolean);

    const progressRecords = await CourseProgress.find({
      user: { $in: userIds },
      course: { $in: courseIds },
    }).lean();

    const progressMap = new Map<string, any>();
    for (const p of progressRecords) {
      progressMap.set(`${String(p.user)}_${String(p.course)}`, p);
    }

    const enrichedEnrollments = enrollments.map((e: any) => {
      const progKey = `${String(e.user?._id)}_${String(e.course?._id)}`;
      const progress = progressMap.get(progKey) || null;
      return {
        ...e,
        learningProgress: progress
          ? {
              completed: Boolean(progress.completed),
              quizScore: progress.quizScore,
              quizTotal: progress.quizTotal,
              lastOpenedAt: progress.lastOpenedAt,
            }
          : null,
      };
    });

    // Filter by student search query if provided
    let finalEnrollments = enrichedEnrollments;
    if (typeof q === 'string' && q.trim()) {
      const search = q.trim().toLowerCase();
      finalEnrollments = enrichedEnrollments.filter((e: any) => {
        const u = e.user || {};
        const c = e.course || {};
        return (
          (u.name && u.name.toLowerCase().includes(search)) ||
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.indexNumber && u.indexNumber.toLowerCase().includes(search)) ||
          (c.title && c.title.toLowerCase().includes(search)) ||
          (c.topic && c.topic.toLowerCase().includes(search)) ||
          (e.bankReference && e.bankReference.toLowerCase().includes(search))
        );
      });
    }

    // Calculate aggregated statistics
    const allEnrollmentsForStats = await CourseEnrollment.find().lean();
    const stats = {
      total: allEnrollmentsForStats.length,
      pending: allEnrollmentsForStats.filter((e) => e.status === 'pending').length,
      approved: allEnrollmentsForStats.filter((e) => e.status === 'approved').length,
      rejected: allEnrollmentsForStats.filter((e) => e.status === 'rejected').length,
      totalRevenue: allEnrollmentsForStats
        .filter((e) => e.status === 'approved' && !e.isFree)
        .reduce((sum, e) => sum + (e.amount || 0), 0),
    };

    res.json({
      enrollments: finalEnrollments,
      stats,
    });
  } catch (err: any) {
    console.error('[Enrollment] Error fetching admin enrollments:', err);
    res.status(500).json({ message: 'Failed to retrieve enrollments.' });
  }
});

// 5. Admin: Update enrollment status (Approve / Reject)
router.put('/admin/:id/status', protect, contentManagerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid enrollment ID.' });
      return;
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status. Must be pending, approved, or rejected.' });
      return;
    }

    const update: any = {
      status,
      reviewedBy: req.user!._id,
      reviewedAt: new Date(),
    };

    if (typeof adminNotes === 'string') {
      update.adminNotes = adminNotes.trim();
    }

    const updated = await CourseEnrollment.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('user', 'name email indexNumber mobileNumber')
      .populate('course', 'title price')
      .populate('reviewedBy', 'name email');

    if (!updated) {
      res.status(404).json({ message: 'Enrollment record not found.' });
      return;
    }

    res.json({
      success: true,
      message: `Enrollment marked as ${status}.`,
      enrollment: updated,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update enrollment status.' });
  }
});

// 6. Admin: Delete enrollment
router.delete('/admin/:id', protect, contentManagerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid enrollment ID.' });
      return;
    }

    const enrollment = await CourseEnrollment.findById(id);
    if (!enrollment) {
      res.status(404).json({ message: 'Enrollment not found.' });
      return;
    }

    // Clean up slip from Cloudinary if exists
    if (enrollment.slipPublicId) {
      try {
        await cloudinary.uploader.destroy(enrollment.slipPublicId, {
          resource_type: enrollment.slipUrl.includes('/raw/') ? 'raw' : 'image',
        });
      } catch (e) {
        console.warn('Could not destroy Cloudinary slip:', e);
      }
    }

    await CourseEnrollment.findByIdAndDelete(id);
    res.json({ success: true, message: 'Enrollment record removed.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete enrollment.' });
  }
});

export default router;
