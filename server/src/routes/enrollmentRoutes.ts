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
import { savePdf } from '../services/pdfStorage.js';

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

  const rawExt = path.extname(file.originalname).toLowerCase();
  const ext = rawExt || (isPdf ? '.pdf' : '.jpg');
  const baseName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const rawPublicId = `slip_${randomUUID()}_${baseName}${ext}`;

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

export function computeExpiresAt(validityMonths?: number, fromDate: Date = new Date()): Date | null {
  if (!validityMonths || validityMonths <= 0) return null;
  const expires = new Date(fromDate);
  expires.setDate(expires.getDate() + (validityMonths * 30));
  return expires;
}

export function formatEnrollmentRecord(e: any) {
  if (!e) return e;
  const isExpired = Boolean(e.expiresAt && new Date(e.expiresAt).getTime() < Date.now());
  if (typeof e.toObject === 'function') {
    return { ...e.toObject(), isExpired };
  }
  return { ...e, isExpired };
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
        const validity = course.validityMonths ?? (course.validityPeriod === '1_month' ? 1 : course.validityPeriod === '3_months' ? 3 : course.validityPeriod === '6_months' ? 6 : course.validityPeriod === '1_year' ? 12 : 0);
        const expiresAt = computeExpiresAt(validity);

        const enrollment = await CourseEnrollment.findOneAndUpdate(
          { user: userId, course: courseId },
          {
            $set: {
              status: 'approved',
              amount: 0,
              amountPaid: 0,
              paymentType: 'free',
              isFree: true,
              enrolledAt: new Date(),
              expiresAt,
              targetMonth: course.targetMonth || '',
              validityPeriod: course.validityPeriod || 'lifetime',
              adminNotes: 'Auto-enrolled in free course',
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({
          success: true,
          status: 'approved',
          message: 'Enrolled successfully! You have active access to this course.',
          enrollment: formatEnrollmentRecord(enrollment),
        });
        return;
      }

      // If it's a PAID course -> requires slip upload
      const file = req.file;
      if (!file) {
        // If already approved, check if expired
        if (existing && existing.status === 'approved') {
          const isExpired = Boolean(existing.expiresAt && new Date(existing.expiresAt).getTime() < Date.now());
          if (!isExpired) {
            res.json({
              success: true,
              status: 'approved',
              message: 'You already have active enrollment in this course.',
              enrollment: formatEnrollmentRecord(existing),
            });
            return;
          }
          // If expired, allow student to re-apply / renew with a new slip!
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

      const rawPaymentType = typeof req.body.paymentType === 'string' ? req.body.paymentType.toLowerCase().trim() : 'full';
      const paymentType = rawPaymentType === 'partial' ? 'partial' : 'full';
      const coursePrice = course.price || 0;
      let amountPaid = coursePrice;
      if (paymentType === 'partial') {
        const parsed = Number(req.body.amountPaid);
        amountPaid = !isNaN(parsed) && parsed > 0 ? parsed : coursePrice;
      }

      const enrollment = await CourseEnrollment.findOneAndUpdate(
        { user: userId, course: courseId },
        {
          $set: {
            status: 'pending',
            amount: coursePrice,
            amountPaid,
            paymentType,
            isFree: false,
            slipUrl,
            slipPublicId,
            slipFileName: file.originalname,
            bankReference,
            notes,
            targetMonth: course.targetMonth || '',
            validityPeriod: course.validityPeriod || 'lifetime',
            enrolledAt: new Date(),
            adminNotes: '', // clears old rejection reason so student starts fresh
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({
        success: true,
        status: 'pending',
        message: 'Bank payment slip submitted! The administrator will review and activate your course access.',
        enrollment: formatEnrollmentRecord(enrollment),
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
      .populate('course', 'title subject stream topic price isFree courseType targetMonth validityPeriod validityMonths bankDetails status estimatedMinutes')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ enrollments: enrollments.map(formatEnrollmentRecord) });
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
    res.json({ enrollment: enrollment ? formatEnrollmentRecord(enrollment) : null });
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

    // Only show enrollments for courses created by this admin
    const adminCourseIds = await Course.find({ createdBy: req.user!._id }).distinct('_id');

    if (typeof courseId === 'string' && mongoose.isValidObjectId(courseId)) {
      const isMine = adminCourseIds.some((id: any) => String(id) === String(courseId));
      filter.course = isMine ? courseId : { $in: [] };
    } else {
      filter.course = { $in: adminCourseIds };
    }

    // Fetch enrollments
    const enrollments = await CourseEnrollment.find(filter)
      .populate('user', 'name email indexNumber mobileNumber whatsappNumber phoneNumber phone role stream')
      .populate('course', 'title subject stream topic price isFree status thumbnailUrl courseType monthlyFee billingType targetMonth parentCourseId isMonthlyProgram')
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
              _id: progress._id,
              completed: Boolean(progress.completed),
              completedBlocks: progress.completedBlocks || [],
              quizScore: progress.quizScore,
              quizTotal: progress.quizTotal,
              lastOpenedAt: progress.lastOpenedAt,
              quizSubmissions: progress.quizSubmissions || [],
              paperSubmissions: progress.paperSubmissions || [],
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

    // Fetch courses created by this admin for the Course Cards Overview
    const myCourses = await Course.find(
      { createdBy: req.user!._id },
      'title subject stream topic price isFree status thumbnailUrl courseType monthlyFee billingType targetMonth parentCourseId isMonthlyProgram createdAt'
    ).sort({ createdAt: -1 }).lean();

    // Calculate aggregated statistics scoped to this admin's courses
    const allEnrollmentsForStats = await CourseEnrollment.find({ course: { $in: adminCourseIds } }).lean();
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
      courses: myCourses,
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
    const { status, adminNotes, paymentType, amountPaid } = req.body;

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

    if (paymentType === 'full' || paymentType === 'partial' || paymentType === 'free') {
      update.paymentType = paymentType;
    }

    if (typeof amountPaid === 'number' && !isNaN(amountPaid) && amountPaid >= 0) {
      update.amountPaid = amountPaid;
    }

    const currentEnr = await CourseEnrollment.findById(id).populate('course');
    if (!currentEnr) {
      res.status(404).json({ message: 'Enrollment record not found.' });
      return;
    }
    const courseObj: any = currentEnr.course;
    if (courseObj && courseObj.createdBy && String(courseObj.createdBy) !== String(req.user!._id)) {
      res.status(403).json({ message: 'You can only manage enrollments for courses created by you.' });
      return;
    }

    if (status === 'approved') {
      const validity = courseObj?.validityMonths ?? (courseObj?.validityPeriod === '1_month' ? 1 : courseObj?.validityPeriod === '3_months' ? 3 : courseObj?.validityPeriod === '6_months' ? 6 : courseObj?.validityPeriod === '1_year' ? 12 : 0);
      update.expiresAt = computeExpiresAt(validity);
      update.enrolledAt = new Date();
      if (courseObj?.targetMonth) {
        update.targetMonth = courseObj.targetMonth;
      }
      if (courseObj?.validityPeriod) {
        update.validityPeriod = courseObj.validityPeriod;
      }
    }

    const updated = await CourseEnrollment.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('user', 'name email indexNumber mobileNumber')
      .populate('course', 'title price courseType targetMonth validityPeriod validityMonths')
      .populate('reviewedBy', 'name email');

    if (!updated) {
      res.status(404).json({ message: 'Enrollment record not found.' });
      return;
    }

    res.json({
      success: true,
      message: `Enrollment marked as ${status}.`,
      enrollment: formatEnrollmentRecord(updated),
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

    const enrollment = await CourseEnrollment.findById(id).populate('course');
    if (!enrollment) {
      res.status(404).json({ message: 'Enrollment not found.' });
      return;
    }

    const courseObj: any = enrollment.course;
    if (courseObj && courseObj.createdBy && String(courseObj.createdBy) !== String(req.user!._id)) {
      res.status(403).json({ message: 'You can only delete enrollments for courses created by you.' });
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

// 7. Admin: Review / Grade a student's quiz submission (Text answers & passing status)
router.put(
  '/admin/progress/:progressId/submissions/:submissionId/review',
  protect,
  contentManagerOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { progressId, submissionId } = req.params;
      const { answersReview, adminFeedback, overrideStatus } = req.body;

      if (!mongoose.isValidObjectId(progressId) || !mongoose.isValidObjectId(submissionId)) {
        res.status(400).json({ message: 'Invalid progress or submission ID.' });
        return;
      }

      const progress = await CourseProgress.findById(progressId).populate('course', 'createdBy');
      if (!progress) {
        res.status(404).json({ message: 'Progress record not found.' });
        return;
      }

      if ((progress.course as any)?.createdBy && String((progress.course as any).createdBy) !== String(req.user!._id)) {
        res.status(403).json({ message: 'Forbidden. You do not have permission to review this submission.' });
        return;
      }

      const submission: any = (progress.quizSubmissions as any)?.id(submissionId);
      if (!submission) {
        res.status(404).json({ message: 'Quiz submission not found.' });
        return;
      }

      // Apply teacher grading to each question answer if provided
      if (Array.isArray(answersReview)) {
        answersReview.forEach((rev: { index: number; isCorrect: boolean }) => {
          if (submission.answers && submission.answers[rev.index]) {
            submission.answers[rev.index].isCorrect = Boolean(rev.isCorrect);
            submission.answers[rev.index].adminGraded = true;
          }
        });
      }

      // Calculate total score based on all correct answers
      const newScore = submission.answers.filter((a: any) => a.isCorrect).length;
      submission.score = newScore;
      submission.percentage =
        submission.totalQuestions > 0 ? Math.round((newScore / submission.totalQuestions) * 100) : 0;
      submission.reviewedBy = req.user!._id;
      submission.reviewedAt = new Date();
      if (typeof adminFeedback === 'string') submission.adminFeedback = adminFeedback.trim();

      if (overrideStatus === 'passed' || overrideStatus === 'failed') {
        submission.status = overrideStatus;
      } else {
        submission.status = submission.percentage >= submission.passPercentage ? 'passed' : 'failed';
      }

      // Update completedBlocks if passed/failed
      const completedBlocks = new Set<string>(progress.completedBlocks || []);
      const effectiveKey = submission.blockKey;
      if (submission.status === 'passed' && effectiveKey) {
        completedBlocks.add(effectiveKey);
      } else if (submission.status === 'failed' && effectiveKey) {
        completedBlocks.delete(effectiveKey);
      }
      progress.completedBlocks = Array.from(completedBlocks);
      progress.quizScore = newScore;
      progress.needsRevision = submission.status === 'failed';

      await progress.save();

      res.json({
        success: true,
        message: `Quiz submission marked as ${submission.status}.`,
        submission,
        progress,
      });
    } catch (err: any) {
      console.error('[Quiz Review Error]:', err);
      res.status(500).json({ message: err?.message || 'Could not update quiz review.' });
    }
  }
);

// 7b. Admin: Review & Grade a student's paper submission (Marks, Grade, Feedback & Result Sheet)
router.put(
  '/admin/progress/:progressId/papers/:submissionId/review',
  protect,
  contentManagerOnly,
  upload.single('resultSheetFile'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { progressId, submissionId } = req.params;
      const { marks, maxMarks, grade, adminFeedback, status } = req.body;

      if (!mongoose.isValidObjectId(progressId) || !mongoose.isValidObjectId(submissionId)) {
        res.status(400).json({ message: 'Invalid progress or submission ID.' });
        return;
      }

      const progress = await CourseProgress.findById(progressId).populate('course', 'createdBy');
      if (!progress) {
        res.status(404).json({ message: 'Progress record not found.' });
        return;
      }

      if ((progress.course as any)?.createdBy && String((progress.course as any).createdBy) !== String(req.user!._id)) {
        res.status(403).json({ message: 'Forbidden. You do not have permission to review this submission.' });
        return;
      }

      const submission: any = (progress.paperSubmissions as any)?.id(submissionId);
      if (!submission) {
        res.status(404).json({ message: 'Paper submission not found.' });
        return;
      }

      if (marks !== undefined && marks !== '') {
        submission.marks = Number(marks);
      }
      if (maxMarks !== undefined && maxMarks !== '') {
        submission.maxMarks = Number(maxMarks) || 100;
      }
      if (typeof grade === 'string') submission.grade = grade.trim();
      if (typeof adminFeedback === 'string') submission.adminFeedback = adminFeedback.trim();
      submission.status = (status === 'pending_review' || status === 'pending') ? 'pending_review' : 'reviewed';
      submission.reviewedBy = req.user!._id;
      submission.reviewedAt = new Date();

      // If admin attached a Result Sheet file specifically for this paper
      if (req.file) {
        try {
          const rsSaved = await savePdf(req.file);
          submission.resultSheetUrl = rsSaved.pdfUrl;
          submission.resultSheetFileName = rsSaved.pdfFileName || 'Result Sheet.pdf';
          submission.resultSheetPublicId = rsSaved.pdfPublicId;
          submission.resultSheetProvider = rsSaved.pdfProvider || 'cloudinary';
        } catch (uploadErr: any) {
          console.error('[Result Sheet Upload Error]:', uploadErr);
        }
      }

      // Mark completed in completedBlocks only when reviewed
      const completedBlocks = new Set<string>(progress.completedBlocks || []);
      if (submission.status === 'reviewed' && submission.blockKey) {
        completedBlocks.add(submission.blockKey);
      } else if (submission.status === 'pending_review' && submission.blockKey) {
        completedBlocks.delete(submission.blockKey);
      }
      progress.completedBlocks = Array.from(completedBlocks);

      await progress.save();

      res.json({
        success: true,
        message: 'Paper submission reviewed and graded successfully.',
        submission,
        progress,
      });
    } catch (err: any) {
      console.error('[Paper Review Error]:', err);
      res.status(500).json({ message: err?.message || 'Could not update paper review.' });
    }
  }
);

// 7c. Admin: Download or view a student's submitted paper file
router.get(
  '/admin/submissions/:submissionId/download',
  protect,
  contentManagerOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { submissionId } = req.params;
      if (!mongoose.isValidObjectId(submissionId)) {
        res.status(400).json({ message: 'Invalid submission ID.' });
        return;
      }

      const progress = await CourseProgress.findOne({ 'paperSubmissions._id': submissionId })
        .populate('user', 'name indexNumber')
        .populate('course', 'createdBy');
      if (!progress) {
        res.status(404).json({ message: 'Submission record not found.' });
        return;
      }

      if ((progress.course as any)?.createdBy && String((progress.course as any).createdBy) !== String(req.user!._id)) {
        res.status(403).json({ message: 'Forbidden. You do not have permission to download this submission.' });
        return;
      }

      const submission: any = (progress.paperSubmissions as any)?.id(submissionId);
      if (!submission || !submission.submissionUrl) {
        res.status(404).json({ message: 'Student submission file not found.' });
        return;
      }

      res.redirect(submission.submissionUrl);
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to access submission.' });
    }
  }
);

// 8. Admin: Get comprehensive learning progress & enrolled courses for a specific student
router.get('/admin/student/:userId/progress', protect, contentManagerOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      res.status(400).json({ message: 'Invalid student ID.' });
      return;
    }

    const student = await User.findById(userId, 'name email indexNumber mobileNumber whatsappNumber phoneNumber phone role stream createdAt').lean();
    if (!student) {
      res.status(404).json({ message: 'Student user not found.' });
      return;
    }

    // Fetch only courses created by this admin
    const adminCourseIds = await Course.find({ createdBy: req.user!._id }).distinct('_id');

    // Fetch course enrollments for this student scoped to this admin's courses
    const enrollments = await CourseEnrollment.find({ user: userId, course: { $in: adminCourseIds } })
      .populate('course', 'title subject stream topic price isFree status curriculumBlocks videoCount estimatedMinutes')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch course progress records for this student scoped to this admin's courses
    const progressRecords = await CourseProgress.find({ user: userId, course: { $in: adminCourseIds } }).lean();
    const progressMap = new Map<string, any>();
    for (const p of progressRecords) {
      progressMap.set(String(p.course), p);
    }

    const allQuizPercentages: number[] = [];

    const detailedCourses = enrollments.map((enr: any) => {
      const course = enr.course || {};
      const courseIdStr = String(course._id || enr.course);
      const prog = progressMap.get(courseIdStr);

      const completedBlockSet = new Set<string>((prog?.completedBlocks || []).map((b: any) => String(b)));
      const blocks: any[] = Array.isArray(course.curriculumBlocks) ? course.curriculumBlocks : [];

      // Calculate video metrics
      const videoBlocks = blocks.filter((b) => b.type === 'video');
      const watchedVideos: any[] = [];
      const remainingVideos: any[] = [];

      videoBlocks.forEach((vb, idx) => {
        const blockId = String(vb._id || `block_${idx}`);
        const isCompleted = completedBlockSet.has(blockId) || completedBlockSet.has(vb.url || '') || completedBlockSet.has(String(idx));
        const videoSummary = {
          _id: vb._id,
          title: vb.title || `Video ${idx + 1}`,
          url: vb.url,
          isCompleted,
        };
        if (isCompleted) watchedVideos.push(videoSummary);
        else remainingVideos.push(videoSummary);
      });

      // Calculate document / guide metrics
      const docBlocks = blocks.filter((b) => b.type === 'document' || b.type === 'description');
      const docsProgress = docBlocks.map((db, idx) => {
        const blockId = String(db._id || `doc_${idx}`);
        const isCompleted = completedBlockSet.has(blockId) || completedBlockSet.has(db.pdfUrl || '') || completedBlockSet.has(String(idx));
        return {
          _id: db._id,
          type: db.type,
          title: db.title || db.pdfFileName || `Document ${idx + 1}`,
          isCompleted,
        };
      });

      // Quiz submissions
      const quizSubmissions = prog?.quizSubmissions || [];
      quizSubmissions.forEach((qs: any) => {
        if (typeof qs.percentage === 'number') {
          allQuizPercentages.push(qs.percentage);
        }
      });

      const totalSteps = blocks.length || ((course.videoCount || 0) + (course.description ? 1 : 0) + (course.quizCount > 0 ? 1 : 0));
      const completedStepsCount = completedBlockSet.size;
      const progressPercent = totalSteps > 0 ? Math.min(100, Math.round((completedStepsCount / totalSteps) * 100)) : (prog?.completed ? 100 : 0);

      return {
        enrollmentId: enr._id,
        courseId: courseIdStr,
        title: course.title || 'Untitled Course',
        subject: course.subject || 'General',
        stream: course.stream || '',
        topic: course.topic || '',
        price: course.price || 0,
        isFree: enr.isFree,
        paymentType: enr.paymentType || (enr.isFree ? 'free' : 'full'),
        amountPaid: enr.amountPaid != null ? enr.amountPaid : enr.amount,
        status: enr.status,
        enrolledAt: enr.enrolledAt || enr.createdAt,
        slipUrl: enr.slipUrl,
        slipFileName: enr.slipFileName,
        bankReference: enr.bankReference,
        notes: enr.notes,
        adminNotes: enr.adminNotes,
        // Detailed Progress Metrics:
        progressPercent,
        isCourseCompleted: Boolean(prog?.completed),
        lastOpenedAt: prog?.lastOpenedAt || null,
        totalSteps,
        completedStepsCount,
        videos: {
          total: videoBlocks.length,
          watchedCount: watchedVideos.length,
          remainingCount: remainingVideos.length,
          watched: watchedVideos,
          remaining: remainingVideos,
        },
        documents: docsProgress,
        quizSubmissions,
        paperSubmissions: prog?.paperSubmissions || [],
      };
    });

    const averageQuizScore = allQuizPercentages.length > 0
      ? Math.round(allQuizPercentages.reduce((a, b) => a + b, 0) / allQuizPercentages.length)
      : null;

    res.json({
      student,
      courses: detailedCourses,
      summary: {
        totalEnrolled: enrollments.length,
        approvedCourses: enrollments.filter((e) => e.status === 'approved').length,
        pendingCourses: enrollments.filter((e) => e.status === 'pending').length,
        completedCourses: detailedCourses.filter((c) => c.isCourseCompleted).length,
        averageQuizScore,
      },
    });
  } catch (err: any) {
    console.error('[Admin Student Progress Error]:', err);
    res.status(500).json({ message: err?.message || 'Could not fetch student progress.' });
  }
});

// Helper to deliver bank deposit slip buffer with detected MIME type and attributed filename
async function handleDeliverSlip(enrollment: any, req: AuthRequest, res: Response) {
  if (!enrollment || !enrollment.slipUrl) {
    res.status(404).json({ message: 'No bank deposit slip found for this enrollment.' });
    return;
  }

  let remote: globalThis.Response;
  try {
    remote = await fetch(enrollment.slipUrl, { signal: AbortSignal.timeout(30000) });
  } catch {
    res.status(504).json({ message: 'The cloud storage provider did not respond. Please try again shortly.' });
    return;
  }

  if (!remote.ok) {
    res.status(502).json({ message: 'Could not retrieve bank slip from cloud storage.' });
    return;
  }

  const arrayBuffer = await remote.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Detect MIME type and extension using magic bytes
  let mimeType = 'application/octet-stream';
  let ext = '.bin';

  if (buffer.length >= 5 && buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
    mimeType = 'application/pdf';
    ext = '.pdf';
  } else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    mimeType = 'image/jpeg';
    ext = '.jpg';
  } else if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    mimeType = 'image/png';
    ext = '.png';
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === 'RIFF' &&
    buffer.subarray(8, 12).toString() === 'WEBP'
  ) {
    mimeType = 'image/webp';
    ext = '.webp';
  } else if (enrollment.slipFileName) {
    const parsed = path.extname(enrollment.slipFileName).toLowerCase();
    if (parsed === '.pdf') {
      mimeType = 'application/pdf';
      ext = '.pdf';
    } else if (parsed === '.jpg' || parsed === '.jpeg') {
      mimeType = 'image/jpeg';
      ext = '.jpg';
    } else if (parsed === '.png') {
      mimeType = 'image/png';
      ext = '.png';
    }
  }

  const user: any = enrollment.user || {};
  const studentIndex = user.indexNumber || 'NO_INDEX';
  const studentName = (user.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `${studentIndex}_${studentName}_BankDepositSlip${ext}`;

  const isDownload = req.query.download === '1' || req.query.download === 'true';

  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `${isDownload ? 'attachment' : 'inline'}; filename="${safeFilename}"`
  );
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

// 12. View / Download Bank Deposit Slip for Admin (content manager or admin)
router.get(
  '/admin/:id/slip',
  protect,
  contentManagerOnly,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid enrollment ID.' });
        return;
      }

      const enrollment = await CourseEnrollment.findById(id)
        .populate('user', 'name indexNumber email')
        .populate('course', 'createdBy');
      if (!enrollment) {
        res.status(404).json({ message: 'Enrollment not found.' });
        return;
      }
      if ((enrollment.course as any)?.createdBy && String((enrollment.course as any).createdBy) !== String(req.user!._id)) {
        res.status(403).json({ message: 'Forbidden. You do not own this course.' });
        return;
      }
      await handleDeliverSlip(enrollment, req, res);
    } catch (err: any) {
      console.error('[Admin Slip Delivery Error]:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to deliver bank deposit slip.' });
      }
    }
  }
);

// 13. View / Download Bank Deposit Slip for Student (or Admin)
router.get(
  '/:id/slip',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid enrollment ID.' });
        return;
      }

      const enrollment = await CourseEnrollment.findById(id).populate('user', 'name indexNumber email');
      if (!enrollment) {
        res.status(404).json({ message: 'Enrollment not found.' });
        return;
      }

      const isManager = ['admin', 'content_manager'].includes(req.user!.role);
      const isOwner = String(enrollment.user?._id || enrollment.user) === String(req.user!._id);
      if (!isManager && !isOwner) {
        res.status(403).json({ message: 'Access denied.' });
        return;
      }

      await handleDeliverSlip(enrollment, req, res);
    } catch (err: any) {
      console.error('[Slip Delivery Error]:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to deliver bank deposit slip.' });
      }
    }
  }
);

export default router;
