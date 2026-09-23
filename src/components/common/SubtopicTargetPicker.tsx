import React, { useMemo } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';
import { SubtopicTarget, SyllabusTopic } from '../../types';
import { getSubtopicProgressValue } from '../../lib/syllabusProgression';
import { getCombinedMathsGroup } from '../../data/alSyllabusData';

interface SubtopicTargetPickerProps {
  syllabusTopics: SyllabusTopic[];
  subject: string;
  topicId: string;
  onTopicChange: (topicId: string) => void;
  targets: SubtopicTarget[];
  onTargetsChange: (targets: SubtopicTarget[]) => void;
  completedOnly?: boolean;
  excludeCompleted?: boolean;
}

function shortLabel(raw: string): string {
  const idx = raw.indexOf(': ');
  return idx > 0 ? raw.substring(idx + 2).trim() : raw;
}

function groupNameOf(raw: string): string | undefined {
  const idx = raw.indexOf(': ');
  return idx > 0 ? raw.substring(0, idx).trim() : undefined;
}

export const SubtopicTargetPicker: React.FC<SubtopicTargetPickerProps> = ({
  syllabusTopics,
  subject,
  topicId,
  onTopicChange,
  targets,
  onTargetsChange,
  completedOnly = false,
  excludeCompleted = false,
}) => {
  const subjectTopics = useMemo(
    () =>
      syllabusTopics.filter(
        (t) =>
          t.subject === subject &&
          (!completedOnly || t.status === 'completed') &&
          (!excludeCompleted || t.status !== 'completed' || t.id === topicId)
      ),
    [syllabusTopics, subject, completedOnly, excludeCompleted, topicId]
  );

  const currentTopic = useMemo(
    () => subjectTopics.find((t) => t.id === topicId),
    [subjectTopics, topicId]
  );

  const targetMap = useMemo(() => {
    const m = new Map<string, number>();
    targets.forEach((t) => m.set(t.subtopic, t.targetProgress));
    return m;
  }, [targets]);

  const toggleSubtopic = (raw: string) => {
    if (targetMap.has(raw)) {
      onTargetsChange(targets.filter((t) => t.subtopic !== raw));
    } else {
      onTargetsChange([...targets, { subtopic: raw, targetProgress: 100 }]);
    }
  };

  const removeTarget = (raw: string) => {
    onTargetsChange(targets.filter((t) => t.subtopic !== raw));
  };

  const projection = useMemo(() => {
    if (!currentTopic) return null;
    const subs = currentTopic.subtopics || [];
    if (subs.length === 0) return null;
    let sum = 0;
    subs.forEach((s) => {
      const existing = getSubtopicProgressValue(currentTopic, s);
      const planned = targetMap.get(s);
      sum += planned !== undefined ? Math.max(existing, planned) : existing;
    });
    return Math.round((sum / subs.length) * 10) / 10;
  }, [currentTopic, targetMap]);

  if (subjectTopics.length === 0) {
    if (completedOnly) {
      return (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-teal-950/20 border border-teal-500/25 space-y-1.5">
          <label className="text-teal-300 font-semibold flex items-center gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Syllabus Topic (completed only)</span>
          </label>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Complete a topic first to unlock revision sessions — new topics can only be added as{' '}
            <strong className="text-white">Study</strong> blocks.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3 shadow-inner">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Link Syllabus Unit</span>
            <span className="text-[10px] text-cyan-300/80">Connects directly to your syllabus master progress</span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
          {subject}
        </span>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
          Select Syllabus Topic / Unit
        </label>
        <select
          value={topicId}
          onChange={(e) => {
            onTopicChange(e.target.value);
          }}
          className="w-full rounded-xl bg-[#161831] border border-cyan-500/35 px-3 py-2.5 text-white font-semibold focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none text-xs cursor-pointer truncate"
        >
          <option value="">-- No specific topic linked --</option>
          {subjectTopics.map((t) => {
            const mathsGroup = getCombinedMathsGroup(t);
            return (
              <option key={t.id} value={t.id} className="bg-[#161831] text-white">
                {t.unitNumber ? `Unit ${t.unitNumber}: ` : ''}
                {t.unitTitle && t.unitTitle.trim().toLowerCase() !== t.topicTitle.trim().toLowerCase()
                  ? `${t.unitTitle} – ${t.topicTitle}`
                  : t.topicTitle}
                {mathsGroup === 'Pure Mathematics' ? ' · Pure' : mathsGroup === 'Applied Mathematics' ? ' · Applied' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {!currentTopic && (
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 flex items-center gap-2">
          <span>💡 Select a syllabus topic above to break down and link specific subtopics.</span>
        </div>
      )}

      {currentTopic && (!currentTopic.subtopics || currentTopic.subtopics.length === 0) && (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          This topic has no subtopic breakdown — completing this block marks the entire unit complete.
        </p>
      )}

      {currentTopic && currentTopic.subtopics && currentTopic.subtopics.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span>Target Subtopics ({targets.length}/{currentTopic.subtopics.length})</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allTargets = (currentTopic.subtopics || []).map((st) => ({
                    subtopic: st,
                    targetProgress: 100,
                  }));
                  onTargetsChange(allTargets);
                }}
                className="text-[10px] font-bold text-cyan-300 hover:underline cursor-pointer"
              >
                Select all
              </button>
              {targets.length > 0 && (
                <button
                  type="button"
                  onClick={() => onTargetsChange([])}
                  className="text-[10px] font-bold text-rose-300 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 overscroll-contain">
            {currentTopic.subtopics.map((raw) => {
              const checked = targetMap.has(raw);
              const existing = getSubtopicProgressValue(currentTopic, raw);
              const grp = groupNameOf(raw);
              return (
                <div
                  key={raw}
                  onClick={() => toggleSubtopic(raw)}
                  className={`rounded-xl border p-2.5 transition cursor-pointer select-none ${
                    checked
                      ? 'border-cyan-400/60 bg-cyan-500/15 shadow-sm'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition ${
                          checked
                            ? 'bg-cyan-500 border-cyan-400 text-white'
                            : 'border-white/30 bg-black/20 text-transparent'
                        }`}
                      >
                        <Plus className={`w-3.5 h-3.5 ${checked ? 'rotate-45' : ''}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {grp && (
                          <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wide block truncate">
                            {grp}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-white leading-snug block">
                          {shortLabel(raw)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {existing >= 100 ? 'Already completed' : existing > 0 ? `Currently at ${existing}%` : 'Not started yet'}
                        </span>
                      </div>
                    </div>
                    {checked && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shrink-0">
                        100% Target
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {targets.length > 0 && projection !== null && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-cyan-300">{targets.length} subtopic{targets.length > 1 ? 's' : ''} in this block</strong>
              {' '}• topic will be <strong className="text-white">{projection}%</strong> after you mark this block done.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
