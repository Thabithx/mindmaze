import {Pagination} from '../common/Pagination';
import {usePagination} from '../../hooks/usePagination';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Trophy, Medal, Flame, RefreshCw, Crown } from 'lucide-react';
import { ScreenId, StreamType, SyllabusTopic, TimetableEntry, DailyTask, StreakData } from '../../types';
import {
  LeaderboardEntry,
  LeaderboardPeriod,
  fetchLeaderboard,
  getCachedLeaderboard,
  sortLeaderboardEntries,
} from '../../lib/leaderboard';

interface LeaderboardProps {
  currentUserId?: string | null;
  currentUserProfile?: any;
  onNavigate?: (screen: ScreenId) => void;
  compact?: boolean;
  onViewAll?: () => void;
  syllabusTopics?: SyllabusTopic[];
  timetable?: TimetableEntry[];
  dailyTasks?: DailyTask[];
  streakDays?: number;
  streakData?: StreakData;
  stream?: StreamType | string;
  physicalScienceElective?: 'Chemistry' | 'ICT' | string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  currentUserId = null,
  currentUserProfile,
  compact = false,
  onViewAll,
}) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [rawEntries, setRawEntries] = useState<LeaderboardEntry[]>(() =>
    getCachedLeaderboard('weekly', 50)
  );
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);

  const myUserId = String(currentUserId || currentUserProfile?.id || currentUserProfile?._id || '');
  const isMe = useCallback((e: LeaderboardEntry) => !!myUserId && String(e.userId) === myUserId, [myUserId]);
  // Use the same server-calculated scores for every student and device.
  const entries = useMemo(() => {
    const sorted = sortLeaderboardEntries(rawEntries);
    return compact ? sorted.slice(0,5) : sorted;
  },[rawEntries,compact]);

  const load = useCallback(async (p: LeaderboardPeriod) => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const res = await fetchLeaderboard(p, 50);
      if (version !== requestVersion.current) return;
      if (res.entries) {
        setRawEntries(res.entries);
      }

    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
    const handleStudyTimeUpdated = () => {
      void load(period);
    };
    window.addEventListener('mindmaze_study_time_updated', handleStudyTimeUpdated);
    return () => {
      requestVersion.current++;
      window.removeEventListener('mindmaze_study_time_updated', handleStudyTimeUpdated);
    };
  }, [period, load]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const ranksPage=usePagination(rest,period);
  const myRank = entries.findIndex(isMe);

  const medal = (i: number) =>
    i === 0 ? (
      <Crown className="w-4 h-4 text-amber-300" />
    ) : i === 1 ? (
      <Medal className="w-4 h-4 text-slate-300" />
    ) : (
      <Medal className="w-4 h-4 text-amber-600" />
    );

  const formatStudyTime = (e: LeaderboardEntry) => {
    const totalMins =
      e.totalStudyMinutes !== undefined
        ? Math.round(e.totalStudyMinutes)
        : Math.round((e.completedHours || 0) * 60);
    if (totalMins < 60) return `${totalMins}m`;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 border border-white/15">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Study Leaderboard</span>
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
        Score: 10 points per study hour in the last {period === 'weekly' ? 7 : 30} days, 20 per current streak day, and 5 per completed syllabus subtopic. Study-time points are rounded down. Streak and syllabus points reflect current progress.
        {myRank >= 0 && (
          <span className="text-cyan-300 font-bold"> You&apos;re #{myRank + 1}!</span>
        )}
      </p>

      {!loading && entries.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center">
          <p className="text-xs font-bold text-slate-300">No active student rankings found.</p>
        </div>
      ) : compact ? (
        <>
          <div className="space-y-2">
            {entries.slice(0, 5).map((e, i) => (
              <div
                key={e.userId}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                  isMe(e)
                    ? 'border-cyan-400/60 bg-cyan-500/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <span className="text-sm font-black text-slate-400 w-5 text-center">{i + 1}</span>
                <div className="flex justify-center w-5">{medal(i)}</div>
                <span className="text-xs font-bold text-white truncate flex-1">
                  @{e.username}
                  {isMe(e) && (
                    <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">you</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    {formatStudyTime(e)}
                  </span>
                  <span className="text-xs font-black text-cyan-300">{e.score.toLocaleString()} pts</span>
                </div>
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
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 pt-5" aria-label="Top three podium">
              {top3.map((e, i) => {
                const timeLabel = formatStudyTime(e);

                return (
                  <div
                    key={e.userId}
                    aria-label={`Rank ${i+1}: ${e.username}`}
                    style={{gridColumn:i===0?2:i===1?1:3,gridRow:1,minHeight:i===0?220:i===1?185:160}}
                    className={`min-w-0 flex flex-col justify-between rounded-t-2xl rounded-b-lg border p-2 sm:p-4 text-center ${
                      isMe(e)
                        ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/40'
                        : i === 0
                          ? 'border-amber-400/50 bg-amber-500/10'
                          : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex justify-center">{medal(i)}</div>
                    <div className="text-3xl sm:text-5xl font-black text-white">{i+1}<span className="text-xs ml-1">{i===0?'ST':i===1?'ND':'RD'}</span></div>
                    <div className="text-xs font-black text-white truncate mt-1 flex items-center justify-center gap-1">
                      <span className="min-w-0 truncate" title={e.username}>@{e.username}</span>
                      {isMe(e) && (
                        <span className="text-[8px] font-black px-1 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">you</span>
                      )}
                    </div>
                    <div className="text-sm font-black text-cyan-300 mt-0.5">{e.score.toLocaleString()} pts</div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {timeLabel} • {e.currentStreak}d streak
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {rest.length > 0 && (
            <div className="overflow-x-auto">
              <Pagination {...ranksPage.pagination} label="Leaderboard ranks 4 onward"/>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                    <th className="py-2 pr-3 font-bold">#</th>
                    <th className="py-2 pr-3 font-bold">Student</th>
                    <th className="py-2 pr-3 font-bold">Study Time</th>
                    <th className="py-2 pr-3 font-bold">Score</th>
                    <th className="py-2 font-bold">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {ranksPage.items.map((e, i) => {
                    const timeLabel = formatStudyTime(e);

                    return (
                      <tr
                        key={e.userId}
                        className={`border-b border-white/5 ${isMe(e) ? 'bg-cyan-500/10' : ''}`}
                      >
                        <td className="py-2 pr-3 font-black text-slate-400">{ranksPage.offset + i + 4}</td>
                        <td className="py-2 pr-3 font-bold text-white">
                          @{e.username}
                          {isMe(e) && (
                            <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">you</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 font-black text-amber-300">{timeLabel}</td>
                        <td className="py-2 pr-3 font-black text-cyan-300">{e.score.toLocaleString()} pts</td>
                        <td className="py-2 text-slate-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" />
                          {e.currentStreak}d
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
