import React, { useEffect, useState } from 'react';
import { Target, CheckCircle2, ExternalLink, Trophy } from 'lucide-react';
import { DailyTask } from '../../types';
import {
  DailyTarget,
  computeDayProgress,
  fetchDailyTarget,
  getStoredDailyTarget,
} from '../../lib/dailyTarget';
import { getTodayDateString } from '../../lib/storage';

interface DailyTargetCardProps {
  tasks: DailyTask[];
  /** Student's personal hours goal — shown when no admin target is set. */
  personalHoursGoal?: number;
  onOpenPlanner: () => void;
}

/**
 * 🎯 Daily Target card: the admin-set global goal (hours + tasks per day)
 * with live progress, plus the daily-quiz channel CTA. Falls back to the
 * student's own Settings goal when the cloud target is unavailable.
 */
export const DailyTargetCard: React.FC<DailyTargetCardProps> = ({
  tasks,
  personalHoursGoal = 2,
  onOpenPlanner,
}) => {
  const [target, setTarget] = useState<DailyTarget>(() => getStoredDailyTarget());
  const todayStr = getTodayDateString();
  const progress = computeDayProgress(tasks, target, todayStr);

  useEffect(() => {
    let live = true;
    void fetchDailyTarget().then((t) => {
      if (live) setTarget(t);
    });
    return () => {
      live = false;
    };
  }, []);

  const hoursGoal = target.fromCloud ? target.hours : personalHoursGoal;
  const effective = target.fromCloud
    ? target
    : { ...target, hours: personalHoursGoal };
  const p = target.fromCloud ? progress : computeDayProgress(tasks, effective, todayStr);

  return (
    <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.12] via-[#161831] to-[#12142B] p-4 sm:p-5 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 shrink-0">
            <Target className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              🎯 Daily Target
              {p.targetMet && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  <CheckCircle2 className="w-3 h-3" />
                  Met!
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {target.fromCloud ? (
                <>Set by your teacher — <strong className="text-amber-200">{target.tasks} tasks</strong> + <strong className="text-amber-200">{target.hours}h</strong> every day</>
              ) : (
                <>Your personal goal — <strong className="text-amber-200">{hoursGoal}h</strong>/day (teacher target syncs here)</>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={target.quizChannelUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-bold transition min-h-[40px]"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Today&apos;s Quiz</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onOpenPlanner}
            className="px-3.5 py-2 rounded-xl bg-[#6B4EFF] hover:bg-[#7C5DFA] text-white text-xs font-bold transition cursor-pointer min-h-[40px]"
          >
            Open Planner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
            <span className="text-slate-300">Tasks — {p.doneTasks}/{target.fromCloud ? target.tasks : Math.max(target.tasks, p.totalTasks)}</span>
            <span className="text-cyan-300">{p.tasksPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6B4EFF] to-cyan-400 transition-all"
              style={{ width: `${p.tasksPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
            <span className="text-slate-300">Study time — {p.doneHours}h/{hoursGoal}h</span>
            <span className="text-amber-300">{p.hoursPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all"
              style={{ width: `${p.hoursPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
