import mongoose from 'mongoose';
import Timetable from '../models/Timetable.js';
import User from '../models/User.js';

export class InvalidTimetable extends Error {}

export async function replaceTimetable(userId: mongoose.Types.ObjectId, slots: unknown) {
  if (!Array.isArray(slots)) throw new InvalidTimetable('Slots must be an array.');
  // Validate the entire replacement before changing any saved documents.
  const prepared = slots.map((s: any, index) => {
    if (!s || typeof s !== 'object' || !s.startTime || !s.endTime) {
      throw new InvalidTimetable(`Entry ${index + 1}: start and end times are required.`);
    }
    const doc = new Timetable({
      user: userId,
      dayOfWeek: s.dayOfWeek,
      subject: typeof s.subject === 'string' ? s.subject.trim() : '',
      topic: typeof s.topic === 'string' ? s.topic.trim() : '',
      blockType: s.blockType ?? 'study',
      topicId: s.topicId || '',
      subtopicTargets: s.subtopicTargets ?? [],
      isCompleted: Boolean(s.isCompleted),
      startTime: String(s.startTime).trim(), endTime: String(s.endTime).trim(),
      color: s.color || 'blue',
      reminderEnabled: s.reminderEnabled === undefined ? true : Boolean(s.reminderEnabled),
      reminderOffsetMinutes: s.reminderOffsetMinutes ?? 15,
      lastReminderSentDate: s.lastReminderSentDate || '', notes: s.notes || '',
    });
    const error = doc.validateSync();
    if (error) throw new InvalidTimetable(`Entry ${index + 1}: ${error.message}`);
    return { clientId: String(s._id || s.id || ''), value: doc.toObject() };
  });
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      // A shared per-user write serializes even two replacements of an empty schedule.
      const owner = await User.updateOne({ _id: userId }, { $inc: { timetableRevision: 1 } }, { session });
      if (!owner.matchedCount) throw new Error('User no longer exists.');
      const existing = await Timetable.find({ user: userId }).session(session);
      const owned = new Map(existing.map(slot => [String(slot._id), slot]));
      const used = new Set<string>();
      const replacement = prepared.map(({ clientId, value }) => {
        const old = owned.get(clientId);
        if (old && used.has(clientId)) throw new InvalidTimetable('The same timetable entry was submitted twice.');
        if (old) used.add(clientId);
        return old ? { ...value, _id: old._id, createdAt: old.createdAt } : value;
      });
      await Timetable.deleteMany({ user: userId }, { session });
      if (replacement.length) await Timetable.insertMany(replacement, { session });
      return await Timetable.find({ user: userId }).sort({ startTime: 1 }).session(session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally {
    await session.endSession();
  }
}
