/**
 * Mind Maze - Motivational & Contextual Notification Message Templates
 * Sri Lankan GCE A/L Study Planner
 */

export interface StudyReminderContext {
  subject: string;
  topicTitle: string;
  subtopic?: string;
  timeContext?: string; // e.g. "Starting in 15 mins", "Starting right now", "16:00 - 17:30"
  currentStreak: number;
  totalTodayTasks: number;
  completedTodayTasks: number;
  remainingTodayTasks: number;
  currentHour?: number; // 0 - 23
}

export interface NudgeContext {
  nextTopic: string;
  subject: string;
  subtopic?: string;
  remainingCount: number;
  currentStreak: number;
  targetZScore?: string;
}

export interface CompletionContext {
  currentStreak: number;
  totalCompletedCount: number;
  streamName?: string;
}

export interface NotificationMessage {
  title: string;
  body: string;
  type: 'one_left' | 'late_unstarted' | 'streak_keeper' | 'completion' | 'nudge' | 'topic_reminder';
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ---------------------------------------------------------------------------
// 1. Completion Celebration Messages (when all of today's topics are done)
// ---------------------------------------------------------------------------
const COMPLETION_MESSAGES = [
  (ctx: CompletionContext) => ({
    title: 'All done for today! 🎉',
    body: `Streak extended to ${ctx.currentStreak} ${ctx.currentStreak === 1 ? 'day' : 'days'}! You cleared every single planned topic today.`,
  }),
  (ctx: CompletionContext) => ({
    title: 'Mission accomplished! 🏆',
    body: `${ctx.currentStreak}-day streak secured! That's true A/L discipline in action. Rest up and recharge!`,
  }),
  (ctx: CompletionContext) => ({
    title: 'Goal reached! 🌟',
    body: `All ${ctx.totalCompletedCount} study sessions crushed today! Streak is now ${ctx.currentStreak} ${ctx.currentStreak === 1 ? 'day' : 'days'}.`,
  }),
  (ctx: CompletionContext) => ({
    title: 'Outstanding work today! 🎯',
    body: `Streak alive at ${ctx.currentStreak} ${ctx.currentStreak === 1 ? 'day' : 'days'}! Another solid step closer to your dream university entrance.`,
  }),
  (ctx: CompletionContext) => ({
    title: 'Daily plan completed! 🚀',
    body: `100% of today's targets done. ${ctx.currentStreak}-day streak protected! Fantastic effort.`,
  }),
];

// ---------------------------------------------------------------------------
// 2. Exactly 1 Topic Left Today
// ---------------------------------------------------------------------------
const ONE_LEFT_MESSAGES = [
  (ctx: StudyReminderContext) => ({
    title: 'Just one more topic to go today! 💪',
    body: `Finish strong with ${ctx.topicTitle} (${ctx.subject}). You're one step away from clearing today's plan!`,
  }),
  (ctx: StudyReminderContext) => ({
    title: 'Final stretch for today! 🏁',
    body: `Only '${ctx.topicTitle}' remaining! Knock it out ${ctx.timeContext || 'now'} and complete your day.`,
  }),
  (ctx: StudyReminderContext) => ({
    title: 'Almost there! ⚡ 1 topic left',
    body: `Wrap up today's goals with ${ctx.topicTitle} (${ctx.subject}). Keep your streak soaring!`,
  }),
  (ctx: StudyReminderContext) => ({
    title: 'The home run! 🎯',
    body: `Just ${ctx.topicTitle} left on today's schedule. Give it your full focus!`,
  }),
];

// ---------------------------------------------------------------------------
// 3. Late & Unstarted (0 completed topics and evening/night)
// ---------------------------------------------------------------------------
const LATE_UNSTARTED_MESSAGES = [
  (ctx: StudyReminderContext) => ({
    title: "Quick win time? ⏳",
    body: `You haven't started today's plan yet — a focused 20-minute session on ${ctx.topicTitle} will get you moving!`,
  }),
  (ctx: StudyReminderContext) => ({
    title: "Evening check-in: Let's make today count 🌙",
    body: `Still time to protect your momentum! Dive into ${ctx.topicTitle} (${ctx.subject}) tonight.`,
  }),
  (ctx: StudyReminderContext) => ({
    title: "Start small tonight 💡",
    body: `Break the ice with ${ctx.topicTitle}. A short revision session keeps your habit strong!`,
  }),
  (ctx: StudyReminderContext) => ({
    title: "Don't let today slip away! ⚡",
    body: `${ctx.subject}: ${ctx.topicTitle} is waiting. 15 minutes of deep focus is all it takes to start!`,
  }),
];

// ---------------------------------------------------------------------------
// 4. Streak of 3+ Days (Active Streak Protection)
// ---------------------------------------------------------------------------
const STREAK_KEEPER_MESSAGES = [
  (ctx: StudyReminderContext) => ({
    title: `Keep the streak alive! 🔥 Day ${ctx.currentStreak}`,
    body: `${ctx.topicTitle} (${ctx.subject}) is next ${ctx.timeContext || 'now'}. Protect your ${ctx.currentStreak}-day momentum!`,
  }),
  (ctx: StudyReminderContext) => ({
    title: `Streak protector on duty! 🛡️`,
    body: `Day ${ctx.currentStreak} is at stake! Time for ${ctx.topicTitle} in ${ctx.subject}.`,
  }),
  (ctx: StudyReminderContext) => ({
    title: `You're on fire! 🔥 ${ctx.currentStreak} days strong`,
    body: `Don't break the chain! Next up: ${ctx.topicTitle} (${ctx.subject}) ${ctx.timeContext || 'today'}.`,
  }),
  (ctx: StudyReminderContext) => ({
    title: `Consistency wins A/L 🚀 Day ${ctx.currentStreak}`,
    body: `Tackle ${ctx.topicTitle} now and lock in day ${ctx.currentStreak} of non-stop progress!`,
  }),
];

// ---------------------------------------------------------------------------
// 5. General Friendly Study Reminder (Specific Subject & Topic)
// ---------------------------------------------------------------------------
const TOPIC_REMINDER_MESSAGES = [
  (ctx: StudyReminderContext) => ({
    title: `Study Time: ${ctx.subject} 📚`,
    body: `${ctx.timeContext ? `${ctx.timeContext}: ` : ''}${ctx.topicTitle}${ctx.subtopic ? ` (${ctx.subtopic})` : ''}. Time for daily revision!`,
  }),
  (ctx: StudyReminderContext) => ({
    title: `Up Next: ${ctx.topicTitle} 🎯`,
    body: `${ctx.subject} session ${ctx.timeContext ? `(${ctx.timeContext})` : 'scheduled'}. Grab your notes and focus!`,
  }),
  (ctx: StudyReminderContext) => ({
    title: `Focused Revision: ${ctx.subject} ✨`,
    body: `Mastering ${ctx.topicTitle} step by step. ${ctx.timeContext ? `[${ctx.timeContext}]` : ''}`,
  }),
  (ctx: StudyReminderContext) => ({
    title: `Scheduled Block: ${ctx.topicTitle} 📖`,
    body: `${ctx.subject} — build solid conceptual understanding in this session!`,
  }),
];

// ---------------------------------------------------------------------------
// 6. Periodic Gentle Nudge Messages (when student hasn't opened app in a few hours)
// ---------------------------------------------------------------------------
const NUDGE_MESSAGES = [
  (ctx: NudgeContext) => ({
    title: 'Friendly Study Nudge ⏰',
    body: `You have ${ctx.remainingCount} study ${ctx.remainingCount === 1 ? 'task' : 'tasks'} waiting today. Next up: ${ctx.nextTopic} (${ctx.subject}).`,
  }),
  (ctx: NudgeContext) => ({
    title: 'Stay on track for A/L success! 🎯',
    body: `${ctx.remainingCount} ${ctx.remainingCount === 1 ? 'session' : 'sessions'} remaining today. A quick session on ${ctx.nextTopic} keeps you ahead!`,
  }),
  (ctx: NudgeContext) => ({
    title: 'Your goals are waiting 📖',
    body: `Ready to tackle ${ctx.nextTopic}? Small, consistent daily sessions lead to top island ranks.`,
  }),
  (ctx: NudgeContext) => ({
    title: 'Gentle check-in from Mind Maze 💡',
    body: `Take a deep breath and dive into ${ctx.nextTopic} (${ctx.subject}). Every problem solved brings you closer!`,
  }),
];

/**
 * Generates an intelligent, progress-aware study reminder message
 */
export function generateSmartStudyReminder(ctx: StudyReminderContext): NotificationMessage {
  const currentHour = ctx.currentHour !== undefined ? ctx.currentHour : new Date().getHours();

  // Rule 1: Exactly 1 topic left today
  if (ctx.remainingTodayTasks === 1 && ctx.totalTodayTasks > 1) {
    const chosen = pickRandom(ONE_LEFT_MESSAGES);
    return {
      ...chosen(ctx),
      type: 'one_left',
    };
  }

  // Rule 2: 0 topics completed today and it is getting late (>= 17:00 / 5 PM)
  if (ctx.completedTodayTasks === 0 && currentHour >= 17) {
    const chosen = pickRandom(LATE_UNSTARTED_MESSAGES);
    return {
      ...chosen(ctx),
      type: 'late_unstarted',
    };
  }

  // Rule 3: On an active streak of 3+ days
  if (ctx.currentStreak >= 3) {
    const chosen = pickRandom(STREAK_KEEPER_MESSAGES);
    return {
      ...chosen(ctx),
      type: 'streak_keeper',
    };
  }

  // Rule 4: Default friendly reminder naming the specific topic & subject
  const chosen = pickRandom(TOPIC_REMINDER_MESSAGES);
  return {
    ...chosen(ctx),
    type: 'topic_reminder',
  };
}

/**
 * Generates a congratulatory completion notification when all of today's topics are done
 */
export function generateCompletionCelebration(ctx: CompletionContext): NotificationMessage {
  const chosen = pickRandom(COMPLETION_MESSAGES);
  return {
    ...chosen(ctx),
    type: 'completion',
  };
}

/**
 * Generates a periodic gentle nudge message for uncompleted tasks
 */
export function generatePeriodicNudge(ctx: NudgeContext): NotificationMessage {
  const chosen = pickRandom(NUDGE_MESSAGES);
  return {
    ...chosen(ctx),
    type: 'nudge',
  };
}

export interface CountdownContext {
  daysLeft: number;
  motivationNote?: string | null;
}

// ---------------------------------------------------------------------------
// Daily A/L countdown (sent once each morning; varies day to day)
// ---------------------------------------------------------------------------
const COUNTDOWN_MESSAGES = [
  (days: number) => `${days} days until your A/Ls — keep going! 📚`,
  (days: number) => `${days} days left. Every topic counts. 💪`,
  (days: number) => `A/Ls in ${days} days — one focused session at a time. 🎯`,
  (days: number) => `${days} days to go. Future you is watching. 👀`,
  (days: number) => `${days} days remaining — protect the streak today! 🔥`,
  (days: number) => `Only ${days} days until your A/Ls. Make today matter! ⭐`,
];

/**
 * Generates the daily morning countdown notification. Returns null when
 * there is nothing to send (no date or exam already passed — caller skips).
 */
export function generateDailyCountdown(
  ctx: CountdownContext
): (NotificationMessage & { kind: 'countdown' | 'exam-day' }) | null {
  if (ctx.daysLeft < 0) return null;
  if (ctx.daysLeft === 0) {
    const base = 'Your A/Ls start today — good luck! 🍀 Give it everything!';
    return {
      title: 'A/L day is here! 🎯',
      body: appendNote(base, ctx.motivationNote),
      type: 'topic_reminder',
      kind: 'exam-day',
    };
  }
  const variants = COUNTDOWN_MESSAGES.map((fn) => fn(ctx.daysLeft));
  const picked = pickRandom(variants);
  return {
    title: `⏳ ${ctx.daysLeft} day${ctx.daysLeft === 1 ? '' : 's'} to A/Ls`,
    body: appendNote(picked, ctx.motivationNote),
    type: 'topic_reminder',
    kind: 'countdown',
  };
}

function appendNote(base: string, note?: string | null): string {
  const clean = (note ?? '').trim().slice(0, 140);
  return clean ? `${base} Remember: “${clean}”` : base;
}
