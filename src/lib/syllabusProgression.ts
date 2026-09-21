import { SyllabusTopic, TopicStatus } from '../types';
import { INITIAL_SYLLABUS_TOPICS } from '../data/alSyllabusData';

/**
 * Build fresh topic rows marked fully completed for the given syllabus topic
 * ids (used by the sign-up "already completed" step). Subtopics are all set
 * to 100% so progress math starts accurately instead of from zero.
 */
export function buildCompletedTopicsFromIds(topicIds: string[]): SyllabusTopic[] {
  const wanted = new Set(topicIds);
  return INITIAL_SYLLABUS_TOPICS.filter((t) => wanted.has(t.id)).map((t) => {
    const subs = [...(t.subtopics || [])];
    const progress: Record<string, number> = {};
    subs.forEach((s) => {
      progress[s] = 100;
    });
    return {
      ...t,
      subtopics: subs,
      completedSubtopics: subs,
      subtopicProgress: progress,
      status: 'completed' as TopicStatus,
    };
  });
}

/**
 * Mark the given topic ids as fully completed inside an existing topic list
 * (used when applying pending sign-up selections on first login).
 */
export function markTopicsCompleted(topics: SyllabusTopic[], topicIds: string[]): SyllabusTopic[] {
  const wanted = new Set(topicIds);
  if (wanted.size === 0) return topics;
  return topics.map((t) => {
    if (!wanted.has(t.id)) return t;
    const subs = [...(t.subtopics || [])];
    const progress: Record<string, number> = { ...(t.subtopicProgress || {}) };
    subs.forEach((s) => {
      progress[s] = 100;
    });
    return {
      ...t,
      completedSubtopics: subs,
      subtopicProgress: progress,
      status: 'completed' as TopicStatus,
    };
  });
}

export interface TopicProgressDetail {
  topicId: string;
  totalSubtopics: number;
  completedSubtopicsCount: number;
  percentage: number;
  isCompleted: boolean;
  status: TopicStatus;
}

export interface SubjectProgressionDetail {
  subjectName: string;
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  notStartedTopics: number;
  totalSubtopics: number;
  completedSubtopics: number;
  percentage: number;
}

/**
 * Returns current progress percentage (0 - 100) for a given subtopic within a topic
 */
export function getSubtopicProgressValue(topic: SyllabusTopic, subtopic: string): number {
  if (topic.status === 'completed') return 100;
  if (topic.subtopicProgress && typeof topic.subtopicProgress[subtopic] === 'number') {
    return Math.max(0, Math.min(100, Math.round(topic.subtopicProgress[subtopic])));
  }
  if (topic.completedSubtopics?.includes(subtopic)) {
    return 100;
  }
  return 0;
}

/**
 * Calculates detailed completion metrics for an individual syllabus topic
 */
export function calculateTopicProgress(topic: SyllabusTopic): TopicProgressDetail {
  const subtopics = topic.subtopics || [];
  const totalSubtopics = Math.max(subtopics.length, 1);

  if (topic.status === 'completed') {
    return {
      topicId: topic.id,
      totalSubtopics,
      completedSubtopicsCount: totalSubtopics,
      percentage: 100,
      isCompleted: true,
      status: 'completed',
    };
  }

  // Calculate fractional points from subtopics with 0 - 100% progress
  let totalSubtopicPoints = 0;
  let fullyCompletedCount = 0;

  if (subtopics.length > 0) {
    subtopics.forEach((sub) => {
      const p = getSubtopicProgressValue(topic, sub);
      totalSubtopicPoints += p / 100;
      if (p >= 100) {
        fullyCompletedCount++;
      }
    });
  } else {
    totalSubtopicPoints = topic.status === 'in_progress' ? 0.5 : 0;
  }

  const percentage = subtopics.length > 0
    ? Math.min(100, Math.round((totalSubtopicPoints / totalSubtopics) * 100))
    : (topic.status === 'in_progress' ? 50 : 0);

  const isCompleted = percentage >= 100;

  return {
    topicId: topic.id,
    totalSubtopics,
    completedSubtopicsCount: fullyCompletedCount,
    percentage,
    isCompleted,
    status: isCompleted ? 'completed' : (percentage > 0 || topic.status === 'in_progress' ? 'in_progress' : 'not_started'),
  };
}

/**
 * Calculates complete syllabus progression for an entire subject
 */
export function calculateSubjectProgression(
  subjectName: string,
  allTopics: SyllabusTopic[]
): SubjectProgressionDetail {
  const subjectTopics = allTopics.filter((t) => t.subject === subjectName);

  if (subjectTopics.length === 0) {
    return {
      subjectName,
      totalTopics: 0,
      completedTopics: 0,
      inProgressTopics: 0,
      notStartedTopics: 0,
      totalSubtopics: 0,
      completedSubtopics: 0,
      percentage: 0,
    };
  }

  let totalSubtopicsCount = 0;
  let completedSubtopicPoints = 0;
  let completedTopicsCount = 0;
  let inProgressTopicsCount = 0;
  let notStartedTopicsCount = 0;

  subjectTopics.forEach((topic) => {
    const detail = calculateTopicProgress(topic);
    totalSubtopicsCount += detail.totalSubtopics;

    // Calculate exact subtopic completion points
    const subtopics = topic.subtopics || [];
    if (topic.status === 'completed') {
      completedSubtopicPoints += detail.totalSubtopics;
    } else if (subtopics.length > 0) {
      subtopics.forEach((sub) => {
        completedSubtopicPoints += getSubtopicProgressValue(topic, sub) / 100;
      });
    } else if (detail.status === 'in_progress') {
      completedSubtopicPoints += 0.5;
    }

    if (detail.status === 'completed') {
      completedTopicsCount++;
    } else if (detail.status === 'in_progress') {
      inProgressTopicsCount++;
    } else {
      notStartedTopicsCount++;
    }
  });

  const percentage = totalSubtopicsCount > 0
    ? Math.round((completedSubtopicPoints / totalSubtopicsCount) * 100)
    : Math.round((completedTopicsCount / subjectTopics.length) * 100);

  return {
    subjectName,
    totalTopics: subjectTopics.length,
    completedTopics: completedTopicsCount,
    inProgressTopics: inProgressTopicsCount,
    notStartedTopics: notStartedTopicsCount,
    totalSubtopics: totalSubtopicsCount,
    completedSubtopics: Math.round(completedSubtopicPoints),
    percentage: Math.min(100, percentage),
  };
}

/**
 * Calculates the overall syllabus progression across all stream subjects
 */
export function calculateOverallStreamProgression(
  streamSubjects: { name: string }[],
  allTopics: SyllabusTopic[]
) {
  let totalSubtopics = 0;
  let completedSubtopics = 0;
  let totalTopics = 0;
  let completedTopics = 0;
  let inProgressTopics = 0;
  let notStartedTopics = 0;

  streamSubjects.forEach((s) => {
    const detail = calculateSubjectProgression(s.name, allTopics);
    totalSubtopics += detail.totalSubtopics;
    completedSubtopics += detail.completedSubtopics;
    totalTopics += detail.totalTopics;
    completedTopics += detail.completedTopics;
    inProgressTopics += detail.inProgressTopics;
    notStartedTopics += detail.notStartedTopics;
  });

  const totalPercentage = totalSubtopics > 0
    ? Math.round((completedSubtopics / totalSubtopics) * 100)
    : (totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0);

  return {
    totalPercentage: Math.min(100, totalPercentage),
    totalSubtopics,
    completedSubtopics,
    totalTopics,
    completedTopics,
    inProgressTopics,
    notStartedTopics,
  };
}

/**
 * Updates topic and subtopic completion when a daily planner task or timetable block is toggled.
 *
 * Each block can target MULTIPLE subtopics, each with its own planned
 * percentage (0 - 100) chosen via a slider in the block form.
 * On completion the syllabus `subtopicProgress[sub]` is raised to at least
 * the planned value (max(existing, planned)) so progress never regresses
 * when a smaller block is completed after a larger one. Topic % is then
 * derived as the mean of all subtopic percentages.
 */
export function updateSyllabusFromBlockCompletion(
  topics: SyllabusTopic[],
  opts: {
    topicId?: string;
    topicTitle?: string;
    subtopic?: string;
    targetProgress?: number; // 0 - 100 (legacy single-target)
    subtopicTargets?: { subtopic: string; targetProgress: number }[];
    subject?: string;
    isCompleted: boolean;
    /** When 'revision', syllabus % is intentionally left untouched. */
    blockType?: 'study' | 'revision';
  }
): {
  updatedTopics: SyllabusTopic[];
  changedTopic?: SyllabusTopic;
  changeMessage?: string;
} {
  const { topicId, topicTitle, subtopic, targetProgress, subtopicTargets, subject, isCompleted, blockType } = opts;

  // Revision sessions never move syllabus percentages (they must not push a
  // subject beyond 100% or alter first-time completion math). The bonus is
  // tracked separately via the revision counter.
  if (blockType === 'revision') {
    return { updatedTopics: topics };
  }

  // Normalize to a canonical list of { subtopic, targetProgress }.
  // Prefers the multi-target array, falls back to the legacy single fields.
  const normalizedTargets: { subtopic: string; targetProgress: number }[] = [];
  if (Array.isArray(subtopicTargets) && subtopicTargets.length > 0) {
    for (const t of subtopicTargets) {
      const name = (t?.subtopic || '').trim();
      if (!name || name === 'All Subtopics' || name === 'General Revision') continue;
      normalizedTargets.push({
        subtopic: name,
        targetProgress: Math.max(0, Math.min(100, Math.round(t.targetProgress ?? 100))),
      });
    }
  } else if (subtopic && subtopic.trim() && subtopic !== 'All Subtopics' && subtopic !== 'General Revision') {
    normalizedTargets.push({
      subtopic: subtopic.trim(),
      targetProgress: Math.max(0, Math.min(100, targetProgress !== undefined ? targetProgress : 100)),
    });
  }

  // Find matching topic
  let targetIndex = -1;
  if (topicId) {
    targetIndex = topics.findIndex((t) => t.id === topicId);
  }
  if (targetIndex === -1 && topicTitle && subject) {
    targetIndex = topics.findIndex(
      (t) => t.subject === subject && t.topicTitle.toLowerCase() === topicTitle.toLowerCase()
    );
  }

  // If no matching syllabus topic found, return original
  if (targetIndex === -1) {
    return { updatedTopics: topics };
  }

  const topic = topics[targetIndex];
  const allSubtopics = topic.subtopics || [];
  let currentCompleted = [...(topic.completedSubtopics || [])];
  const currentSubProgress: Record<string, number> = { ...(topic.subtopicProgress || {}) };

  // If the topic had previously been marked 'completed', initialize all subtopics as done
  if (topic.status === 'completed' && currentCompleted.length === 0 && allSubtopics.length > 0) {
    currentCompleted = [...allSubtopics];
    allSubtopics.forEach((s) => {
      currentSubProgress[s] = 100;
    });
  }

  let changeMessage = '';

  if (normalizedTargets.length > 0) {
    // Multi-subtopic (or single-subtopic) completion path.
    const appliedSummaries: string[] = [];
    const resetSummaries: string[] = [];

    for (const target of normalizedTargets) {
      const trimmedSub = target.subtopic;
      // Planned % from this block's slider (0 - 100).
      const plannedVal = target.targetProgress;
      // Existing stored progress so completion never moves progress backwards.
      const existingVal = currentSubProgress[trimmedSub] !== undefined
        ? currentSubProgress[trimmedSub]
        : (currentCompleted.includes(trimmedSub) ? 100 : 0);

      if (isCompleted) {
        const newVal = Math.max(existingVal, plannedVal);
        currentSubProgress[trimmedSub] = newVal;
        if (newVal >= 100) {
          if (!currentCompleted.includes(trimmedSub)) {
            currentCompleted.push(trimmedSub);
          }
          appliedSummaries.push(`"${trimmedSub}" → 100%`);
        } else {
          currentCompleted = currentCompleted.filter((s) => s !== trimmedSub);
          appliedSummaries.push(`"${trimmedSub}" → ${newVal}%`);
        }
      } else {
        currentSubProgress[trimmedSub] = 0;
        currentCompleted = currentCompleted.filter((s) => s !== trimmedSub);
        resetSummaries.push(`"${trimmedSub}"`);
      }
    }

    if (isCompleted) {
      if (normalizedTargets.length === 1) {
        const only = normalizedTargets[0];
        const finalVal = currentSubProgress[only.subtopic];
        changeMessage = finalVal >= 100
          ? `Marked subtopic "${only.subtopic}" 100% complete in ${topic.topicTitle}!`
          : `Logged ${finalVal}% completion for subtopic "${only.subtopic}" in ${topic.topicTitle}!`;
      } else {
        changeMessage = `Logged ${appliedSummaries.length} subtopic targets in ${topic.topicTitle} (${appliedSummaries.join(', ')})!`;
      }
    } else {
      changeMessage = normalizedTargets.length === 1
        ? `Reset progress for subtopic "${normalizedTargets[0].subtopic}" in ${topic.topicTitle}.`
        : `Reset progress for ${resetSummaries.length} subtopics in ${topic.topicTitle}.`;
    }
  } else {
    // Whole topic toggled
    if (isCompleted) {
      currentCompleted = [...allSubtopics];
      allSubtopics.forEach((s) => {
        currentSubProgress[s] = 100;
      });
      changeMessage = `Marked complete: ${topic.topicTitle}!`;
    } else {
      currentCompleted = [];
      allSubtopics.forEach((s) => {
        currentSubProgress[s] = 0;
      });
      changeMessage = `Unmarked ${topic.topicTitle}.`;
    }
  }

  // Derive new topic status mathematically
  let newStatus: TopicStatus = 'not_started';
  if (allSubtopics.length > 0) {
    const totalPoints = allSubtopics.reduce((sum, s) => {
      const p = currentSubProgress[s] !== undefined ? currentSubProgress[s] : (currentCompleted.includes(s) ? 100 : 0);
      return sum + p;
    }, 0);

    if (totalPoints >= allSubtopics.length * 100 || (isCompleted && normalizedTargets.length === 0)) {
      newStatus = 'completed';
    } else if (totalPoints > 0) {
      newStatus = 'in_progress';
    } else {
      newStatus = 'not_started';
    }
  } else {
    newStatus = isCompleted ? 'completed' : 'not_started';
  }

  const updatedTopic: SyllabusTopic = {
    ...topic,
    completedSubtopics: currentCompleted,
    subtopicProgress: currentSubProgress,
    status: newStatus,
  };

  const updatedTopics = [...topics];
  updatedTopics[targetIndex] = updatedTopic;

  return {
    updatedTopics,
    changedTopic: updatedTopic,
    changeMessage,
  };
}

/**
 * Normalizes any block's subtopic plan to a canonical target list.
 * Prefers `subtopicTargets`, falls back to legacy `subtopic` + `targetProgress`.
 */
export function getBlockSubtopicTargets(block: {
  subtopic?: string;
  targetProgress?: number;
  subtopicTargets?: { subtopic: string; targetProgress: number }[];
}): { subtopic: string; targetProgress: number }[] {
  if (Array.isArray(block.subtopicTargets) && block.subtopicTargets.length > 0) {
    return block.subtopicTargets
      .filter((t) => t?.subtopic?.trim())
      .map((t) => ({
        subtopic: t.subtopic.trim(),
        targetProgress: Math.max(0, Math.min(100, Math.round(t.targetProgress ?? 100))),
      }));
  }
  if (block.subtopic?.trim()) {
    return [{
      subtopic: block.subtopic.trim(),
      targetProgress: Math.max(0, Math.min(100, Math.round(block.targetProgress ?? 100))),
    }];
  }
  return [];
}

/**
 * Sets specific progress percentage (0 - 100) for a subtopic directly
 */
export function setSubtopicProgressInTopic(
  topics: SyllabusTopic[],
  topicId: string,
  subtopicTitle: string,
  progressPercentage: number
): SyllabusTopic[] {
  const cleanVal = Math.max(0, Math.min(100, Math.round(progressPercentage)));

  return topics.map((t) => {
    if (t.id !== topicId) return t;

    const allSubtopics = t.subtopics || [];
    let completed = [...(t.completedSubtopics || [])];
    const subProgress: Record<string, number> = { ...(t.subtopicProgress || {}) };

    subProgress[subtopicTitle] = cleanVal;

    if (cleanVal >= 100) {
      if (!completed.includes(subtopicTitle)) {
        completed.push(subtopicTitle);
      }
    } else {
      completed = completed.filter((s) => s !== subtopicTitle);
    }

    let newStatus: TopicStatus = 'not_started';
    if (allSubtopics.length > 0) {
      const totalPoints = allSubtopics.reduce((sum, s) => {
        const p = subProgress[s] !== undefined ? subProgress[s] : (completed.includes(s) ? 100 : 0);
        return sum + p;
      }, 0);

      if (totalPoints >= allSubtopics.length * 100) {
        newStatus = 'completed';
      } else if (totalPoints > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'not_started';
      }
    }

    return {
      ...t,
      completedSubtopics: completed,
      subtopicProgress: subProgress,
      status: newStatus,
    };
  });
}

/**
 * Toggles a single subtopic directly from the Topic Tracker checklist (0 <-> 100%)
 */
export function toggleSubtopicInTopic(
  topics: SyllabusTopic[],
  topicId: string,
  subtopicTitle: string
): SyllabusTopic[] {
  return topics.map((t) => {
    if (t.id !== topicId) return t;

    const currentProgress = getSubtopicProgressValue(t, subtopicTitle);
    const targetVal = currentProgress >= 100 ? 0 : 100;

    const allSubtopics = t.subtopics || [];
    let completed = [...(t.completedSubtopics || [])];
    const subProgress: Record<string, number> = { ...(t.subtopicProgress || {}) };

    subProgress[subtopicTitle] = targetVal;

    if (targetVal >= 100) {
      if (!completed.includes(subtopicTitle)) {
        completed.push(subtopicTitle);
      }
    } else {
      completed = completed.filter((s) => s !== subtopicTitle);
    }

    let newStatus: TopicStatus = 'not_started';
    if (allSubtopics.length > 0) {
      const totalPoints = allSubtopics.reduce((sum, s) => {
        const p = subProgress[s] !== undefined ? subProgress[s] : (completed.includes(s) ? 100 : 0);
        return sum + p;
      }, 0);

      if (totalPoints >= allSubtopics.length * 100) {
        newStatus = 'completed';
      } else if (totalPoints > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'not_started';
      }
    }

    return {
      ...t,
      completedSubtopics: completed,
      subtopicProgress: subProgress,
      status: newStatus,
    };
  });
}
