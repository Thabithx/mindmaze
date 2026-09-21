import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { getSubjectsForStream, INITIAL_SYLLABUS_TOPICS } from '../../data/alSyllabusData';

interface CompletedTopicsPickerProps {
  stream: '' | 'Physical Science' | 'Biological Science';
  elective: 'Chemistry' | 'ICT';
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Optional sign-up step: mark topics already completed before joining, so
 * the Topic Tracker starts from real progress instead of zero. Everything
 * unchecked = "starting from scratch" (the step is skippable by design).
 */
export const CompletedTopicsPicker: React.FC<CompletedTopicsPickerProps> = ({
  stream,
  elective,
  selectedIds,
  onChange,
}) => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const subjects = useMemo(
    () => (stream ? getSubjectsForStream(stream, elective) : []),
    [stream, elective]
  );

  const topicsBySubject = useMemo(() => {
    const map = new Map<string, { id: string; label: string }[]>();
    subjects.forEach((s) => {
      const rows = INITIAL_SYLLABUS_TOPICS.filter((t) => t.subject === s.name).map((t) => ({
        id: t.id,
        label: `${t.unitNumber ? `Unit ${t.unitNumber}: ` : ''}${t.topicTitle}`,
      }));
      map.set(s.name, rows);
    });
    return map;
  }, [subjects]);

  if (!stream) {
    return (
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Select your stream above to see its topic list here.
      </p>
    );
  }

  const toggle = (id: string) => {
    onChange(selected.has(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  };

  const toggleAllForSubject = (subjectName: string) => {
    const rows = topicsBySubject.get(subjectName) || [];
    const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
    if (allChecked) {
      const ids = new Set(rows.map((r) => r.id));
      onChange(selectedIds.filter((s) => !ids.has(s)));
    } else {
      const next = new Set(selectedIds);
      rows.forEach((r) => next.add(r.id));
      onChange(Array.from(next));
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">
          Already finished? <span className="text-slate-500 font-normal">(optional — skip if starting fresh)</span>
        </label>
        {selectedIds.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            {selectedIds.length} marked done
          </span>
        )}
      </div>

      {subjects.map((s) => {
        const rows = topicsBySubject.get(s.name) || [];
        const doneCount = rows.filter((r) => selected.has(r.id)).length;
        const expanded = expandedSubject === s.name;
        return (
          <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSubject(expanded ? null : s.name)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left cursor-pointer min-h-[44px]"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-base">{s.icon}</span>
                <span className="text-xs font-bold text-white truncate">{s.name}</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {doneCount}/{rows.length} done
                </span>
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {expanded && (
              <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                {rows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleAllForSubject(s.name)}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    {rows.every((r) => selected.has(r.id)) ? 'Unmark all' : 'Mark entire subject done'}
                  </button>
                )}
                <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5 overscroll-contain">
                  {rows.map((r) => {
                    const checked = selected.has(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggle(r.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg transition cursor-pointer select-none text-xs ${
                          checked
                            ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/25'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 mt-0.5 rounded-md flex items-center justify-center shrink-0 border transition ${
                            checked ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/30 bg-black/20'
                          }`}
                        >
                          {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="leading-relaxed">{r.label}</span>
                      </div>
                    );
                  })}
                  {rows.length === 0 && (
                    <p className="text-[11px] text-slate-500">No topics listed for this subject yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
