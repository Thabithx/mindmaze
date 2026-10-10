export interface LessonVideo {
  title: string;
  url?: string;
  description?: string;
  embedUrl?: string;
  isYouTube?: boolean;
  isProtected?: boolean;
}

export interface CurriculumQuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface CurriculumBlock {
  _id?: string;
  type: 'video' | 'live_class' | 'document' | 'description' | 'quiz';
  title?: string;
  description?: string;
  // Video block
  url?: string;
  embedUrl?: string;
  isYouTube?: boolean;
  isProtected?: boolean;
  // Live Class block
  liveLink?: string;
  scheduledTime?: string;
  meetingPlatform?: string;
  isCompleted?: boolean;
  recordingUrl?: string;
  recordingEmbedUrl?: string;
  // Document block
  pdfUrl?: string;
  pdfFileName?: string;
  size?: number;
  path?: string;
  pendingFile?: File;
  // Quiz block
  quizQuestions?: CurriculumQuizQuestion[];
  // Ordering
  order: number;
}

export interface Lesson {
  _id: string;
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
  price?: number;
  isFree?: boolean;
  bankDetails?: string;
  videoCount: number;
  resourceCount: number;
  quizCount: number;
  videos?: LessonVideo[];
  resources?: { id: string; title: string; size?: number; path: string }[];
  curriculumBlocks?: CurriculumBlock[];
  quiz?: { questionText: string; options: string[]; correctOptionIndex?: number; explanation?: string }[];
  relatedPaperIds?: string[];
  relatedPapers?: { _id: string; title: string; pdfPath: string }[];
}

export interface CourseEnrollmentRecord {
  _id: string;
  user: any;
  course: any;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  isFree: boolean;
  slipUrl?: string;
  slipPublicId?: string;
  slipFileName?: string;
  bankReference?: string;
  notes?: string;
  adminNotes?: string;
  reviewedBy?: any;
  reviewedAt?: string;
  enrolledAt: string;
  createdAt: string;
  learningProgress?: {
    completed: boolean;
    quizScore: number | null;
    quizTotal: number;
    lastOpenedAt: string;
  } | null;
}

export interface Progress {
  course: string;
  completed: boolean;
  completedBlocks?: string[];
  lastOpenedAt: string;
  quizScore: number | null;
  quizTotal: number;
  needsRevision: boolean;
}

export const subjects = ['Physics', 'Chemistry', 'Biology', 'Combined Maths', 'ICT'];
export const control = 'learning-control w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400';
export const button = 'learning-button rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer';
export const panel = 'learning-panel rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 space-y-4';

/**
 * Extracts a valid 11-character YouTube video ID from various link formats.
 * Supports youtu.be, youtube.com/watch?v=, embed/, shorts/, live/, and query strings.
 */
export function extractYouTubeId(link: string): string | null {
  if (!link || typeof link !== 'string') return null;
  const trimmed = link.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    let id = '';
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split(/[?#&/]/)[0];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(u.hostname)) {
      id = u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#&]+)/)?.[1] || '';
    }
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return match ? match[1] : null;
  }
}

/**
 * Generates a protected, hardened embed URL for YouTube.
 * Uses youtube-nocookie.com, modestbranding, rel=0 to prevent external recommendations.
 */
export function youtubeEmbed(link: string): string | null {
  const id = extractYouTubeId(link);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&controls=1`;
}

/**
 * Gets the medium quality thumbnail image URL for YouTube preview.
 */
export function getYouTubeThumbnail(link: string): string | null {
  const id = extractYouTubeId(link);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

export function safeLink(link: string): boolean {
  try {
    return ['https:', 'http:'].includes(new URL(link).protocol);
  } catch {
    return false;
  }
}
