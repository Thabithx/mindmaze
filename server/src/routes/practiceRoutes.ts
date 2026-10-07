import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import path from 'node:path';
import PracticeSet, { PRACTICE_CATEGORIES } from '../models/PracticeSet.js';
import PaperAsset from '../models/PaperAsset.js';
import PracticeProgress from '../models/PracticeProgress.js';
import { protect, contentManagerOnly, AuthRequest } from '../middleware/authMiddleware.js';
import { saveAsset, removeAsset, assetDirectory } from '../services/paperAssets.js';
import { readPagination, pageInfo, literalSearch, queryText, PaginationError } from '../services/pagination.js';
import {
  PRACTICE_SUBJECTS, MAX_WEEKLY_QUESTIONS, colomboToday, isIsoDate,
  validPracticeQuestion, cleanQuestion, studentQuestion, reviewFor,
} from '../services/practice.js';

const router = Router();
const isCategory = (v: unknown): v is 'daily' | 'weekly' => typeof v === 'string' && (PRACTICE_CATEGORIES as readonly string[]).includes(v);

router.param('id', (_req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) { res.status(404).json({ message: 'Practice set not found.' }); return; }
  next();
});

// A set is visible to students once it is published AND its publish date has arrived.
const visibleFilter = () => ({ isPublished: true, publishDate: { $lte: colomboToday() } });

const presentSummary = (s: any) => ({
  id: String(s._id), category: s.category, subject: s.subject, title: s.title, topic: s.topic || '',
  publishDate: s.publishDate, isPublished: s.isPublished, questionCount: s.questions?.length ?? s.questionCount ?? 0,
});

const handleError = (res: any, error: any, fallback: string) => {
  if (error instanceof PaginationError) { res.status(400).json({ message: error.message }); return; }
  res.status(500).json({ message: fallback });
};

/* ───────────── Student ───────────── */

// Counts for the subject cards inside Weekly / Daily.
router.get('/overview', protect, async (_req, res) => {
  try {
    const rows = await PracticeSet.aggregate([
      { $match: visibleFilter() },
      { $group: { _id: { category: '$category', subject: '$subject' }, sets: { $sum: 1 }, latest: { $max: '$publishDate' } } },
    ]);
    const out: any = { subjects: PRACTICE_SUBJECTS, daily: {}, weekly: {} };
    for (const r of rows) out[r._id.category][r._id.subject] = { sets: r.sets, latest: r.latest };
    res.json(out);
  } catch { res.status(500).json({ message: 'Could not load practice categories.' }); }
});

router.get('/sets', protect, async (req, res) => {
  try {
    const category = queryText(req.query.category), subject = queryText(req.query.subject);
    if (!isCategory(category) || !subject) { res.status(400).json({ message: 'Choose a category and a subject.' }); return; }
    const requested = readPagination(req.query as any);
    const filter: any = { ...visibleFilter(), category, subject };
    const total = await PracticeSet.countDocuments(filter);
    const info = pageInfo(total, requested);
    const sets = await PracticeSet.aggregate([
      { $match: filter },
      { $sort: { publishDate: -1, createdAt: -1 } },
      { $skip: (info.page - 1) * info.pageSize }, { $limit: info.pageSize },
      { $project: { category: 1, subject: 1, title: 1, topic: 1, publishDate: 1, isPublished: 1, questionCount: { $size: '$questions' } } },
    ]);
    res.json({ sets: sets.map(presentSummary), pagination: info });
  } catch (e) { handleError(res, e, 'Could not load practice sets.'); }
});

router.get('/sets/:id', protect, async (req, res) => {
  try {
    const set = await PracticeSet.findOne({ _id: req.params.id, ...visibleFilter() });
    if (!set) { res.status(404).json({ message: 'This practice set is not available.' }); return; }
    res.json({ ...presentSummary(set), questions: set.questions.map(studentQuestion) });
  } catch { res.status(500).json({ message: 'Could not load this practice set.' }); }
});

// Answers are checked on the server one question at a time, so the key is only revealed after a submission.
router.post('/sets/:id/check', protect, async (req: AuthRequest, res) => {
  try {
    const { questionIndex, selectedIndex } = req.body || {};
    const set = await PracticeSet.findOne({ _id: req.params.id, ...visibleFilter() });
    if (!set) { res.status(404).json({ message: 'This practice set is not available.' }); return; }
    const q: any = Number.isInteger(questionIndex) ? set.questions[questionIndex] : undefined;
    if (!q || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= q.options.length) {
      res.status(400).json({ message: 'Choose one of the listed answers.' }); return;
    }
    const review = reviewFor(String(set._id), q, selectedIndex);
    res.json(review);
    // Count the answer for the student's activity report (counters only; never delays or breaks the answer).
    const now = new Date();
    PracticeProgress.updateOne(
      { user: req.user!._id, set: set._id },
      {
        $setOnInsert: { category: set.category, subject: set.subject, firstAnsweredAt: now },
        $set: { lastAnsweredAt: now },
        $inc: { answered: 1, correct: review.correct ? 1 : 0 },
        $addToSet: review.correct ? { questionsSeen: questionIndex, questionsCorrect: questionIndex } : { questionsSeen: questionIndex },
      },
      { upsert: true }
    ).catch(() => {});
  } catch { res.status(500).json({ message: 'Could not check your answer. Please retry.' }); }
});

// Images are loaded by <img>, which cannot send an Authorization header, so they are public like paper diagrams.
// Only assets that belong to this set are served.
router.get('/sets/:id/images/:assetId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.assetId)) { res.sendStatus(404); return; }
    const asset = await PaperAsset.findOne({ _id: req.params.assetId, paper: req.params.id, kind: 'image' });
    if (!asset || !await PracticeSet.exists({ _id: req.params.id })) { res.sendStatus(404); return; }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (asset.provider === 'local') {
      res.type(asset.mime!).sendFile(path.join(assetDirectory(), path.basename(asset.fileKey!)), e => { if (e && !res.headersSent) res.sendStatus(404); });
      return;
    }
    res.redirect(asset.remoteUrl!);
  } catch { if (!res.headersSent) res.sendStatus(500); }
});

/* ───────────── Admin / Content Manager ───────────── */

const receiver = (size: number, field: string) => {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: size, files: 1 } }).single(field);
  return (req: any, res: any, next: any) => upload(req, res, (e: any) => e ? res.status(400).json({ message: e.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload size limit.' : e.message }) : next());
};

router.get('/admin/sets', protect, contentManagerOnly, async (req, res) => {
  try {
    const requested = readPagination(req.query as any);
    const filter: any = {};
    const category = queryText(req.query.category), subject = queryText(req.query.subject), status = queryText(req.query.status);
    if (isCategory(category)) filter.category = category;
    if (subject && subject !== 'All') filter.subject = subject;
    if (status === 'published') filter.isPublished = true;
    if (status === 'draft') filter.isPublished = false;
    const search = literalSearch(req.query.q);
    if (search) filter.$or = [{ title: search }, { topic: search }, { publishDate: search }];
    const total = await PracticeSet.countDocuments(filter);
    const info = pageInfo(total, requested);
    const sets = await PracticeSet.aggregate([
      { $match: filter },
      { $sort: { publishDate: -1, createdAt: -1 } },
      { $skip: (info.page - 1) * info.pageSize }, { $limit: info.pageSize },
      { $project: { category: 1, subject: 1, title: 1, topic: 1, publishDate: 1, isPublished: 1, questionCount: { $size: '$questions' } } },
    ]);
    const today = colomboToday();
    res.json({ sets: sets.map(s => ({ ...presentSummary(s), scheduled: s.isPublished && s.publishDate > today })), pagination: info, subjects: PRACTICE_SUBJECTS });
  } catch (e) { handleError(res, e, 'Could not load practice sets.'); }
});

router.get('/admin/sets/:id', protect, contentManagerOnly, async (req, res) => {
  try {
    const set = await PracticeSet.findById(req.params.id);
    if (!set) { res.status(404).json({ message: 'Practice set not found.' }); return; }
    res.json({ set: { ...presentSummary(set), updatedAt: (set as any).updatedAt, questions: set.questions } });
  } catch { res.status(500).json({ message: 'Could not load this practice set.' }); }
});

function readSetBody(body: any): { error?: string; value?: any } {
  const { category, subject, title, topic, publishDate, questions } = body || {};
  if (!isCategory(category)) return { error: 'Choose Daily Spark or Weekly Century.' };
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 80) return { error: 'Choose a subject.' };
  if (typeof title !== 'string' || !title.trim() || title.length > 160) return { error: 'Give the set a title (maximum 160 characters).' };
  if (topic !== undefined && (typeof topic !== 'string' || topic.length > 120)) return { error: 'Topic is too long.' };
  if (!isIsoDate(publishDate)) return { error: 'Choose a valid publish date.' };
  if (!Array.isArray(questions)) return { error: 'Questions must be a list.' };
  const max = category === 'daily' ? 1 : MAX_WEEKLY_QUESTIONS;
  if (questions.length > max) return { error: category === 'daily' ? 'A Daily Spark holds exactly one question.' : `A Weekly Century holds at most ${MAX_WEEKLY_QUESTIONS} questions.` };
  if (!questions.every(validPracticeQuestion)) return { error: 'Every question needs text, 2–5 answers and at least one accepted answer; resolve all review notes.' };
  return { value: { category, subject: subject.trim(), title: title.trim(), topic: (topic || '').trim(), publishDate, questions: questions.map((q: any) => ({ ...q })) } };
}

async function dailyConflict(v: any, ignoreId?: string) {
  if (v.category !== 'daily') return false;
  const filter: any = { category: 'daily', subject: v.subject, publishDate: v.publishDate };
  if (ignoreId) filter._id = { $ne: ignoreId };
  return !!await PracticeSet.exists(filter);
}

router.post('/admin/sets', protect, contentManagerOnly, async (req: AuthRequest, res) => {
  try {
    const { error, value } = readSetBody(req.body);
    if (error) { res.status(400).json({ message: error }); return; }
    if (await dailyConflict(value)) { res.status(409).json({ message: `A Daily Spark for ${value.subject} on ${value.publishDate} already exists. Edit it or choose another date.` }); return; }
    // Images can only be attached after the set exists, so a new set is always created as a draft first.
    const set = await PracticeSet.create({ ...value, questions: value.questions.map(cleanQuestion), isPublished: false, createdBy: req.user!._id });
    res.status(201).json({ set: { ...presentSummary(set), questions: set.questions } });
  } catch { res.status(500).json({ message: 'Could not save the practice set.' }); }
});

router.put('/admin/sets/:id', protect, contentManagerOnly, async (req, res) => {
  try {
    const set = await PracticeSet.findById(req.params.id);
    if (!set) { res.status(404).json({ message: 'Practice set not found.' }); return; }
    const { error, value } = readSetBody(req.body);
    if (error) { res.status(400).json({ message: error }); return; }
    if (await dailyConflict(value, String(set._id))) { res.status(409).json({ message: `A Daily Spark for ${value.subject} on ${value.publishDate} already exists.` }); return; }
    const questions = value.questions.map(cleanQuestion);
    // Publishing needs at least one question.
    const publish = req.body.isPublished === undefined ? set.isPublished : Boolean(req.body.isPublished);
    if (publish && !questions.length) { res.status(400).json({ message: 'Add at least one question before publishing.' }); return; }
    // Review/diagram images must belong to this set.
    const ids = [...new Set(questions.flatMap((q: any) => [q.imageId, ...q.reviewImages.map((r: any) => r.imageId)]).filter(Boolean))];
    if (ids.length && await PaperAsset.countDocuments({ _id: { $in: ids }, paper: set._id, kind: 'image' }) !== ids.length) {
      res.status(400).json({ message: 'Use images uploaded to this set.' }); return;
    }
    Object.assign(set, { category: value.category, subject: value.subject, title: value.title, topic: value.topic, publishDate: value.publishDate, questions, isPublished: publish });
    await set.save();
    res.json({ set: { ...presentSummary(set), questions: set.questions } });
  } catch { res.status(500).json({ message: 'Could not save the practice set.' }); }
});

// The "Publish" control: only flips visibility, so it can never lose edits.
router.patch('/admin/sets/:id/publish', protect, contentManagerOnly, async (req, res) => {
  try {
    const set = await PracticeSet.findById(req.params.id);
    if (!set) { res.status(404).json({ message: 'Practice set not found.' }); return; }
    const publish = Boolean(req.body?.isPublished);
    if (publish && !set.questions.length) { res.status(400).json({ message: 'Add at least one question before publishing.' }); return; }
    set.isPublished = publish;
    await set.save();
    res.json({ set: { ...presentSummary(set), scheduled: set.isPublished && set.publishDate > colomboToday() } });
  } catch { res.status(500).json({ message: 'Could not change the publish status.' }); }
});

router.delete('/admin/sets/:id', protect, contentManagerOnly, async (req, res) => {
  try {
    const set = await PracticeSet.findByIdAndDelete(req.params.id);
    if (!set) { res.status(404).json({ message: 'Practice set not found.' }); return; }
    await PracticeProgress.deleteMany({ set: set._id }).catch(() => {});
    const assets = await PaperAsset.find({ paper: set._id, kind: 'image' });
    for (const a of assets) await removeAsset(a).catch(() => {});
    res.json({ message: 'Practice set deleted.' });
  } catch { res.status(500).json({ message: 'Could not delete the practice set.' }); }
});

router.post('/admin/sets/:id/images', protect, contentManagerOnly, receiver(5 * 1024 * 1024, 'imageFile'), async (req, res) => {
  try {
    if (!await PracticeSet.exists({ _id: req.params.id })) { res.status(404).json({ message: 'Save the set as a draft before adding images.' }); return; }
    const b = req.file?.buffer; let mime = '', ext = '';
    if (b && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) { mime = 'image/png'; ext = '.png'; }
    else if (b && b[0] === 255 && b[1] === 216 && b[2] === 255) { mime = 'image/jpeg'; ext = '.jpg'; }
    else if (b && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') { mime = 'image/webp'; ext = '.webp'; }
    if (!mime || !req.file) { res.status(400).json({ message: 'Choose a PNG, JPG or WebP image, maximum 5 MiB. SVG is not supported.' }); return; }
    const asset = await saveAsset(req.params.id, 'image', req.file, mime, ext);
    res.status(201).json({ imageId: String(asset._id), imagePath: `/practice/sets/${req.params.id}/images/${asset._id}` });
  } catch { res.status(500).json({ message: 'Could not upload the image.' }); }
});

export default router;
