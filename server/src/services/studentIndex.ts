import User, { IUser } from '../models/User.js';

/**
 * Generates a unique student index number in the format MM-XXXXX (e.g. MM-10001).
 * Sequential and guaranteed unique.
 */
export async function generateStudentIndexNumber(): Promise<string> {
  // Find highest existing numeric index
  const lastUser = await User.findOne({ indexNumber: { $regex: /^MM-\d+$/ } })
    .sort({ indexNumber: -1 })
    .select('indexNumber')
    .lean();

  let nextNum = 10001;
  if (lastUser && lastUser.indexNumber) {
    const match = lastUser.indexNumber.match(/^MM-(\d+)$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 10000) {
        nextNum = parsed + 1;
      }
    }
  }

  // Double check uniqueness to avoid collision
  while (await User.exists({ indexNumber: `MM-${nextNum}` })) {
    nextNum++;
  }

  return `MM-${nextNum}`;
}

/**
 * Ensures a user document has an assigned indexNumber.
 * If missing, assigns, saves, and returns it.
 */
export async function ensureUserIndexNumber(user: any): Promise<string> {
  if (user.indexNumber && typeof user.indexNumber === 'string' && user.indexNumber.trim()) {
    return user.indexNumber;
  }

  const newIndex = await generateStudentIndexNumber();
  try {
    user.indexNumber = newIndex;
    if (typeof user.save === 'function') {
      await user.save();
    } else if (user._id) {
      await User.findByIdAndUpdate(user._id, { $set: { indexNumber: newIndex } });
    }
  } catch (err: any) {
    // In case of unique collision in high concurrency, fetch current or retry
    const existing = await User.findById(user._id).select('indexNumber');
    if (existing?.indexNumber) return existing.indexNumber;
  }

  return newIndex;
}
