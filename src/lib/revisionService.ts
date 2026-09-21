/**
 * Revision habit tracking — additive positive reinforcement only.
 * Counts completed Revision blocks/tasks separately from first-time topic
 * completions. Never penalizes; only rewards revising.
 */
import { BlockType } from '../types';

const REVISION_STATS_KEY = 'mindmaze_revision_stats_v2';

export interface RevisionStats {
  /** Total revision sessions completed (study + timetable + daily). */
  revisionCount: number;
  /** Dates (YYYY-MM-DD) on which at least one revision was completed. */
  revisionDates: string[];
  lastRevisionDate?: string;
}

export function getRevisionStats(): RevisionStats {
  try {
    const raw = localStorage.getItem(REVISION_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RevisionStats>;
      return {
        revisionCount: typeof parsed.revisionCount === 'number' ? parsed.revisionCount : 0,
        revisionDates: Array.isArray(parsed.revisionDates) ? parsed.revisionDates : [],
        lastRevisionDate: parsed.lastRevisionDate,
      };
    }
  } catch {
    // ignore — fresh stats below
  }
  return { revisionCount: 0, revisionDates: [] };
}

export function saveRevisionStats(stats: RevisionStats): RevisionStats {
  try {
    localStorage.setItem(REVISION_STATS_KEY, JSON.stringify(stats));
  } catch {
    // storage full / private mode — keep in-memory behaviour
  }
  return stats;
}

/** Increment after a Revision block/task is marked done. Returns new stats. */
export function recordRevisionCompletion(todayStr: string): RevisionStats {
  const current = getRevisionStats();
  const dates = new Set(current.revisionDates);
  dates.add(todayStr);
  const next: RevisionStats = {
    revisionCount: current.revisionCount + 1,
    revisionDates: Array.from(dates).sort(),
    lastRevisionDate: todayStr,
  };
  return saveRevisionStats(next);
}

/** Decrement when a Revision block is un-marked (never goes below 0). */
export function undoRevisionCompletion(): RevisionStats {
  const current = getRevisionStats();
  const next: RevisionStats = {
    ...current,
    revisionCount: Math.max(0, current.revisionCount - 1),
  };
  return saveRevisionStats(next);
}

/** Normalize any stored block type; defaults to 'study'. */
export function normalizeBlockType(v: unknown): BlockType {
  return v === 'revision' ? 'revision' : 'study';
}

/** True when the topic may be used for a Revision block (status completed). */
export function isTopicRevisable(status: unknown): boolean {
  return status === 'completed';
}
