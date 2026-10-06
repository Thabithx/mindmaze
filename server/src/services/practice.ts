import { validQuestion, correctAnswers } from './paperQuiz.js';

export const PRACTICE_SUBJECTS = ['Combined Maths', 'Physics', 'Chemistry', 'Biology', 'ICT'];
export const MAX_WEEKLY_QUESTIONS = 100;

// Calendar day in Sri Lanka, so a question published for "today" appears at local midnight.
export const colomboToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());

export const isIsoDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const IMAGE_ID = /^[a-f\d]{24}$/i;

export function validPracticeQuestion(q: any): boolean {
  if (!validQuestion(q)) return false;
  if (q.imageId && (typeof q.imageId !== 'string' || !IMAGE_ID.test(q.imageId))) return false;
  if (q.imageAlt !== undefined && (typeof q.imageAlt !== 'string' || q.imageAlt.length > 1000)) return false;
  if (q.reviewImages !== undefined) {
    if (!Array.isArray(q.reviewImages) || q.reviewImages.length > 6) return false;
    if (!q.reviewImages.every((r: any) => r && typeof r.imageId === 'string' && IMAGE_ID.test(r.imageId) && (r.alt === undefined || (typeof r.alt === 'string' && r.alt.length <= 1000)))) return false;
  }
  return true;
}

export const cleanQuestion = (q: any) => ({
  text: q.text.trim(),
  imageId: q.imageId || '',
  imageAlt: q.imageAlt?.trim() || '',
  options: q.options.map((o: string) => o.trim()),
  correctIndices: correctAnswers(q),
  explanation: q.explanation?.trim() || '',
  reviewImages: (q.reviewImages || []).map((r: any) => ({ imageId: r.imageId, alt: r.alt?.trim() || '' })),
});

// What a student may see before answering: never the accepted answers or the review.
export const studentQuestion = (q: any) => ({ text: q.text, imageId: q.imageId || '', imageAlt: q.imageAlt || '', options: q.options });

export const imagePath = (setId: string, imageId: string) => `/practice/sets/${setId}/images/${imageId}`;

// What a student sees after submitting one answer.
export const reviewFor = (setId: string, q: any, selected: number) => {
  const accepted = correctAnswers(q);
  return {
    correct: accepted.includes(selected),
    selectedIndex: selected,
    correctIndices: accepted,
    correctAnswers: accepted.map((i: number) => q.options[i]),
    explanation: q.explanation || '',
    reviewImages: (q.reviewImages || []).map((r: any) => ({ path: imagePath(setId, r.imageId), alt: r.alt || '' })),
  };
};
