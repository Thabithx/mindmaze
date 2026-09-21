import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Medal, Flame, RefreshCw, Crown } from 'lucide-react';
import {
  LeaderboardEntry,
  LeaderboardPeriod,
  fetchLeaderboard,
} from '../../lib/leaderboard';

interface LeaderboardProps {
  /** Signed-in student's id — highlights their own row. */
  currentUserId?: string | null;
  /** Compact preview for the dashboard (top 5 + link to the full board). */
  compact?: boolean;
  /** Compact mode only: jumps to the full board (Progress page). */
  onViewAll?: () => void;
}

/**
 * 🏆 Weekly / Monthly leaderboard: friendly competition ranked by completed
 * study HOURS (then tasks, then streak). Usernames only — no PII.
 * Visible to every signed-in student (not just admins).
 */
export const Leaderboard: React.FC<LeaderboardProps> = ({
  currentUserId = null,
  compact = false,
  onViewAll,
}) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const load = useCallback(async (p: LeaderboardPeriod) => {
    setLoading(true);
    try {
      const res = await fetchLeaderboard(p, compact ? 5 : 50);
      setEntries(res.entries);
      setNeedsSetup(res.needsSetup);
    } finally {
      setLoading(false);
    }
  }, [compact]);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myRank = currentUserId ? entries.findIndex((e) => e.userId === currentUserId) : -1;

  const medal = (i: number) =>
    i === 0 ? (
      <Crown className="w-4 h-4 text-amber-300" />
    ) : i === 1 ? (
      <Medal className="w-4 h-4 text-slate-300" />
    ) : (
      <Medal className="w-4 h-4 text-amber-600" />
    );

  return (
    <div className="rounded-3xl border border-white/10 bg-[#161831]/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Leaderboard — study hours</span>
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-1">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[40px] ${
                  period === p ? 'bg-[#6B4EFF] text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load(period)}
            disabled={loading}
            title="Refresh leaderboard"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        {period === 'weekly' ? 'This week (Mon–Sun, Sri Lanka time)' : 'This calendar month (Sri Lanka time)'} — ranked by
        completed study hours, then tasks, then streak. Friendly competition alongside your daily target! 💪
        {myRank >= 0 && (
          <span className="text-cyan-300 font-bold"> You&apos;re #{myRank + 1}!</span>
        )}
      </p>

      {needsSetup ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs leading-relaxed">
          Leaderboard isn&apos;t set up in Supabase yet. Run{' '}
          <code className="px-1 py-0.5 rounded bg-black/40 border border-white/15">supabase/migration_add_daily_target_and_leaderboard.sql</code>{' '}
          in the Supabase SQL Editor, then press refresh.
        </div>
      ) : !loading && entries.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
          <p className="text-xs font-bold text-slate-300">No completed study time {period === 'weekly' ? 'this week' : 'this month'} yet.</p>
          <p className="text-[11px] text-slate-500 mt-1">Complete a planner block to take the lead! 🔥</p>
        </div>
      ) : compact ? (
        <>
          <div className="space-y-2">
            {entries.slice(0, 5).map((e, i) => (
              <div
                key={e.userId}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                  e.userId === currentUserId
                    ? 'border-cyan-400/60 bg-cyan-500/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <span className="text-sm font-black text-slate-400 w-5 text-center">{i + 1}</span>
                <div className="flex justify-center w-5">{medal(i)}</div>
                <span className="text-xs font-bold text-white truncate flex-1">
                  @{e.username}
                  {e.userId === currentUserId && (
                    <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">you</span>
                  )}
                </span>
                <span className="text-xs font-black text-amber-300">{e.completedHours}h</span>
              </div>
            ))}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-cyan-300 transition cursor-pointer min-h-[44px]"
            >
              View full leaderboard →
            </button>
          )}
        </>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {top3.map((e, i) => (
                <div
                  key={e.userId}
                  className={`rounded-2xl border p-3 text-center ${
                    e.userId === currentUserId
                      ? 'border-cyan-400/60 bg-cyan-500/10'
                      : i === 0
                        ? 'border-amber-400/50 bg-amber-500/10'
                        : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex justify-center">{medal(i)}</div>
                  <div className="text-xs font-black text-white truncate mt-1">@{e.username}</div>
                  <div className="text-sm font-black text-amber-300 mt-0.5">{e.completedHours}h</div>
                  <div className="text-[10px] text-slate-400">
                    {e.completedTasks} tasks • 🔥{e.currentStreak}d
                  </div>
                </div>
              ))}
            </div>
          )}
          {rest.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                    <th className="py-2 pr-3 font-bold">#</th>
                    <th className="py-2 pr-3 font-bold">Student</th>
                    <th className="py-2 pr-3 font-bold">Hours</th>
                    <th className="py-2 pr-3 font-bold">Tasks</th>
                    <th className="py-2 font-bold">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((e, i) => (
                    <tr
                      key={e.userId}
                      className={`border-b border-white/5 ${e.userId === currentUserId ? 'bg-cyan-500/10' : ''}`}
                    >
                      <td className="py-2 pr-3 font-black text-slate-400">{i + 4}</td>
                      <td className="py-2 pr-3 font-bold text-white">
                        @{e.username}
                        {e.userId === currentUserId && (
                          <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">you</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-black text-amber-300">{e.completedHours}h</td>
                      <td className="py-2 pr-3 text-slate-300">{e.completedTasks}</td>
                      <td className="py-2 text-slate-300 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-400" />
                        {e.currentStreak}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
