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
  /** When true, only topics with status 'completed' are offered (Revision mode). */
  completedOnly?: boolean;
  /**
   * When true, completed topics are hidden (Study mode — first-time learning
   * only). The currently selected topic stays visible so editing an older
   * block never orphans its link.
   */
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
      // Default slider value: finish it fully, unless already partially done
      // (then default to the remaining gap, at least 50).
      const existing = currentTopic ? getSubtopicProgressValue(currentTopic, raw) : 0;
      const def = existing >= 100 ? 100 : Math.max(50, 100);
      onTargetsChange([...targets, { subtopic: raw, targetProgress: def }]);
    }
  };

  const setTargetValue = (raw: string, val: number) => {
    const clean = Math.max(0, Math.min(100, Math.round(val)));
    onTargetsChange(
      targets.map((t) => (t.subtopic === raw ? { ...t, targetProgress: clean } : t))
    );
  };

  const removeTarget = (raw: string) => {
    onTargetsChange(targets.filter((t) => t.subtopic !== raw));
  };

  // Projected topic % after this block completes (mean of subtopic progress,
  // using max(existing, planned) for targeted subtopics).
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
            🔁 Complete a topic first to unlock revision sessions — new topics can only be added as{' '}
            <strong className="text-white">Study</strong> blocks.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-cyan-300 font-semibold flex items-center gap-1.5 text-xs">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Syllabus Topic + Subtopic Targets</span>
        </label>
        <span className="text-[10px] text-cyan-400">drives progress %</span>
      </div>

      <select
        value={topicId}
        onChange={(e) => {
          onTopicChange(e.target.value);
        }}
        className="w-full rounded-xl bg-[#161831] border border-cyan-500/30 px-3 py-2 text-white font-medium focus:border-cyan-400 focus:outline-none text-xs"
      >
        <option value="">-- No specific topic linked --</option>
        {subjectTopics.map((t) => {
          const mathsGroup = getCombinedMathsGroup(t);
          return (
            <option key={t.id} value={t.id}>
              {t.unitNumber ? `Unit ${t.unitNumber}: ` : ''}
              {t.unitTitle && t.unitTitle.trim().toLowerCase() !== t.topicTitle.trim().toLowerCase()
                ? `${t.unitTitle} – ${t.topicTitle}`
                : t.topicTitle}
              {mathsGroup === 'Pure Mathematics' ? ' · Pure' : mathsGroup === 'Applied Mathematics' ? ' · Applied' : ''}
            </option>
          );
        })}
      </select>

      {!currentTopic && (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Pick a syllabus topic above to select subtopics and set how much of each
          you&apos;ll finish in this block (0 – 100%).
        </p>
      )}

      {currentTopic && (!currentTopic.subtopics || currentTopic.subtopics.length === 0) && (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          This topic has no breakdown — completing the block marks the whole topic complete.
        </p>
      )}

      {currentTopic && currentTopic.subtopics && currentTopic.subtopics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">
              Tap to select subtopics, then drag each slider (0 – 100%)
            </span>
            {targets.length > 0 && (
              <button
                type="button"
                onClick={() => onTargetsChange([])}
                className="text-[11px] font-bold text-slate-400 hover:text-rose-300 transition cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 overscroll-contain">
            {currentTopic.subtopics.map((raw) => {
              const checked = targetMap.has(raw);
              const sliderVal = targetMap.get(raw) ?? 100;
              const existing = getSubtopicProgressValue(currentTopic, raw);
              const grp = groupNameOf(raw);
              return (
                <div
                  key={raw}
                  className={`rounded-xl border p-2.5 transition ${
                    checked
                      ? 'border-cyan-400/50 bg-cyan-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSubtopic(raw)}
                      aria-pressed={checked}
                      title={checked ? 'Remove subtopic from this block' : 'Add subtopic to this block'}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition cursor-pointer ${
                        checked
                          ? 'bg-cyan-500 border-cyan-400 text-white'
                          : 'border-white/30 bg-black/20 text-transparent hover:border-cyan-400'
                      }`}
                    >
                      <Plus className={`w-3.5 h-3.5 ${checked ? 'rotate-45' : ''}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      {grp && (
                        <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wide block truncate">
                          {grp}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-white leading-snug block">
                        {shortLabel(raw)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Already at {existing}%{checked && sliderVal < 100 ? ` • this block targets ${sliderVal}%` : checked ? ' • this block finishes it' : ''}
                      </span>
                      {checked && (
                        <div className="mt-2 flex items-center gap-2.5">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={sliderVal}
                            onChange={(e) => setTargetValue(raw, Number(e.target.value))}
                            aria-label={`How much of ${shortLabel(raw)} will this block finish (0 to 100 percent)`}
                            className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-cyan-400"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={5}
                              value={sliderVal}
                              onChange={(e) => setTargetValue(raw, Number(e.target.value))}
                              aria-label={`${shortLabel(raw)} target percent`}
                              className="w-14 rounded-lg bg-black/40 border border-cyan-500/30 px-1.5 py-1 text-center text-xs font-bold text-cyan-200 focus:border-cyan-400 focus:outline-none"
                            />
                            <span className="text-[11px] font-bold text-cyan-300">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTarget(raw)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Remove subtopic"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {checked && (
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shrink-0">
                        {sliderVal}%
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
