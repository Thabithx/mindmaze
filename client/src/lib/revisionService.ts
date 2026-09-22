import { BlockType } from '../types';

const REVISION_STATS_KEY = 'mindmaze_revision_stats_v2';

export interface RevisionStats {
  revisionCount: number;
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
  }
  return { revisionCount: 0, revisionDates: [] };
}

export function saveRevisionStats(stats: RevisionStats): RevisionStats {
  try {
    localStorage.setItem(REVISION_STATS_KEY, JSON.stringify(stats));
  } catch {
  }
  return stats;
}

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

export function undoRevisionCompletion(): RevisionStats {
  const current = getRevisionStats();
  const next: RevisionStats = {
    ...current,
    revisionCount: Math.max(0, current.revisionCount - 1),
  };
  return saveRevisionStats(next);
}

export function normalizeBlockType(v: unknown): BlockType {
  return v === 'revision' ? 'revision' : 'study';
}

export function isTopicRevisable(status: unknown): boolean {
  return status === 'completed';
}
