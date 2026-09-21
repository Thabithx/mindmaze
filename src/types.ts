/**
 * Mind Maze - GCE A/L Study Planner Types
 */

export type StreamType =
  | 'Physical Science'
  | 'Biological Science'
  | 'Maths'
  | 'Bio';

export type ScreenId = 'dashboard' | 'planner' | 'timetable' | 'daily' | 'topics' | 'progress' | 'admin' | 'settings';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type TopicStatus = 'not_started' | 'in_progress' | 'completed';

export type ReminderOffset = 0 | 10 | 15 | 30 | 60; // minutes before, 0 = at time

/** Study vs Revision block. Revision is ONLY for already-completed topics. */
export type BlockType = 'study' | 'revision';

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate?: string;
  completedDates: string[];
  isCompletedToday: boolean;
}

export interface SubtopicTarget {
  subtopic: string;
  targetProgress: number; // Planned completion % (0 - 100) for this block
}

export interface TimetableEntry {
  id: string;
  dayOfWeek: DayOfWeek;
  subject: string;
  topic: string;
  /** 'study' (default) or 'revision' (only for already-completed topics). */
  blockType?: BlockType;
  topicId?: string;         // Link to SyllabusTopic.id
  subtopic?: string;        // Specific subtopic name (legacy: first of subtopicTargets)
  targetProgress?: number;  // Planned completion percentage (0 - 100) for this block (legacy: first target)
  subtopicTargets?: SubtopicTarget[]; // Per-subtopic plan: each selected subtopic + its 0-100 slider value
  isCompleted?: boolean;    // Whether this study session is finished
  startTime: string; // "HH:MM" 24-hr format, e.g. "06:00"
  endTime: string;   // "HH:MM" 24-hr format, e.g. "08:00"
  color: string;     // Tailwind color key or hex, e.g. "blue", "cyan", "purple", "emerald", "amber", "rose"
  reminderEnabled: boolean;
  reminderOffsetMinutes: ReminderOffset;
  notes?: string;
  fromTaskId?: string; // Optional link to originating daily task
}

export interface DailyTask {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  subject: string;
  /** 'study' (default) or 'revision' (only for already-completed topics). */
  blockType?: BlockType;
  topicId?: string;         // Link to SyllabusTopic.id
  topicTitle?: string;      // Cached title of the syllabus topic
  subtopic?: string;        // Specific subtopic name (legacy: first of subtopicTargets)
  targetProgress?: number;  // Planned completion percentage (0 - 100) for this block (legacy: first target)
  subtopicTargets?: SubtopicTarget[]; // Per-subtopic plan: each selected subtopic + its 0-100 slider value
  isCompleted: boolean;
  completedAt?: string;
  timeSlot?: string;
  startTime?: string;
  endTime?: string;
  estimatedMinutes?: number;
  priority: 'High' | 'Medium' | 'Low';
  fromTimetableId?: string; // Link to originating timetable entry
}

export interface SyllabusTopic {
  id: string;
  subject: string;
  unitNumber: number;
  unitTitle: string;
  topicTitle: string;
  subtopics?: string[];
  completedSubtopics?: string[]; // Array of completed subtopics (100% finished)
  subtopicProgress?: Record<string, number>; // Progress percentage (0 - 100) for each subtopic
  status: TopicStatus;
  notes?: string;
  isCustom?: boolean;
}

export interface SubjectMeta {
  id: string;
  name: string;
  stream: StreamType | 'Both';
  icon: string;
  color: string; // e.g. 'cyan', 'indigo', 'purple', 'emerald', 'amber', 'rose'
  badgeBg: string;
  borderColor: string;
  textColor: string;
  totalTopicsCount?: number;
}

export interface UserSettings {
  stream: StreamType;
  physicalScienceElective: 'Chemistry' | 'ICT';
  studentName: string;
  targetExamYear: string; // e.g. "2027"
  targetExamDate: string; // Expected A/L date "YYYY-MM-DD", '' when unset
  targetZScore?: string;
  motivationNote: string; // Personal note echoed in reminders, '' when unset
  /** Optional contact number (stored info only — never auth/OTP). '' = unset. */
  mobileNumber?: string;
  reminderSoundEnabled: boolean;
  notificationsGranted: boolean;
  hasSeenNotificationPrompt: boolean;
  dailyHoursGoal: number;
  weeklyHoursGoal: number;
}

// ================= LEGACY COMPATIBILITY TYPES =================
export type SyllabusType = 'New' | 'Old' | 'current' | 'old' | 'new' | string;
export type MediumType = 'Sinhala' | 'English' | 'Tamil' | string;
export type PaperType = 'MCQ' | 'Structured' | 'Essay' | string;

export interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  provider?: any;
  isAuthenticated?: boolean;
  stream: StreamType;
  syllabus?: SyllabusType;
  medium?: MediumType;
  targetYear?: string;
  targetZScore?: string;
  targetGrade?: string;
  examDate?: string;
  selectedSubjects?: string[];
  xp: number;
  streakDays: number;
  streakFreezes?: number;
  dailyCompletedMCQs: number;
  dailyGoalMCQs?: number;
  [key: string]: any;
}

export interface PastPaper {
  id: string;
  year: number;
  subject: string;
  paperType?: PaperType;
  medium: MediumType;
  syllabus: SyllabusType;
  title: string;
  questionsCount?: number;
  durationMinutes?: number;
  pdfUrl?: string;
  markingSchemeUrl?: string;
  [key: string]: any;
}

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  [key: string]: any;
}

export interface TargetCard {
  id: string;
  title: string;
  targetValue?: string;
  currentValue?: string;
  deadline?: string;
  timeframe?: string;
  [key: string]: any;
}

export interface TopicMastery {
  subject: string;
  topic: string;
  masteryPercentage?: any;
  mcqsAttempted?: number;
  correctPercentage?: number;
  attempted?: number;
  correct?: number;
  predictedLikelihood?: any;
  repeatYears?: any;
  [key: string]: any;
}

export interface MistakeItem {
  id: string;
  subject?: string;
  topic?: string;
  questionText?: string;
  yourAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  reviewStatus?: 'Needs Review' | 'Reviewed' | 'Mastered' | string;
  dateAdded?: string;
  question?: any;
  [key: string]: any;
}

export interface DailyCoverTopic {
  id: string;
  subject: string;
  topic: string;
  isCompleted?: boolean;
  [key: string]: any;
}

export interface StudyPlan {
  id: string;
  stream: StreamType;
  title: string;
  description: string;
  durationWeeks?: number;
  [key: string]: any;
}

export interface TimetableSlot {
  id: string;
  day?: DayOfWeek;
  dayOfWeek?: DayOfWeek;
  subject: string;
  topic: string;
  timeSlot: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  notes?: string;
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number;
  activityType?: string;
  [key: string]: any;
}

export interface Question {
  id: string;
  subject: string;
  topic: string;
  year?: number;
  questionNumber?: number;
  questionText: string;
  options: any;
  correctOptionIndex?: number;
  explanation: any;
  diagramSvg?: string;
  [key: string]: any;
}

export interface TryExample {
  id: string;
  title: string;
  description?: string;
  [key: string]: any;
}

