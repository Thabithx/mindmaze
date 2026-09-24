import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Trophy, Medal, Flame, RefreshCw, Crown } from 'lucide-react';
import { ScreenId, StreamType, SyllabusTopic, TimetableEntry, DailyTask, StreakData } from '../../types';
import {
  LeaderboardEntry,
  LeaderboardPeriod,
  fetchLeaderboard,
  getCachedLeaderboard,
  sortLeaderboardEntries,
} from '../../lib/leaderboard';
import { getSubjectsForStream } from '../../data/alSyllabusData';
import { calculateOverallStreamProgression } from '../../lib/syllabusProgression';

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
  onNavigate,
  compact = false,
  onViewAll,
  syllabusTopics = [],
  timetable = [],
  dailyTasks = [],
  streakDays = 1,
  streakData,
  stream = 'Physical Science',
  physicalScienceElective = 'Chemistry',
}) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [rawEntries, setRawEntries] = useState<LeaderboardEntry[]>(() =>
    getCachedLeaderboard('weekly', 50)
  );
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Calculate live user stats
  const effectiveStream = currentUserProfile?.stream || stream || 'Physical Science';
  const effectiveElective = physicalScienceElective || 'Chemistry';
  const streamSubjects = getSubjectsForStream(effectiveStream, effectiveElective);
  const progression = calculateOverallStreamProgression(streamSubjects, syllabusTopics);
  const liveSyllabusPercent = progression.totalPercentage;

  // Calculate real live study hours strictly from completed timer minutes
  const dbTimerMinutes = currentUserProfile?.totalStudyMinutes || currentUserProfile?.user?.totalStudyMinutes || userProfile?.totalStudyMinutes || 0;
  const liveHours = Math.round((dbTimerMinutes / 60) * 10) / 10;
  const completedTaskCount = progression.completedTopics || 0;
  const liveStreak = streakDays || streakData?.currentStreak || currentUserProfile?.streakDays || 1;

  const storedStudentName = (() => {
    try {
      const storedSettings = localStorage.getItem('mindmaze_user_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed?.studentName) return parsed.studentName;
      }
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.name) return parsed.name;
        if (parsed?.username) return parsed.username;
      }
    } catch {}
    return null;
  })();

  const myUsername = currentUserProfile?.name || currentUserProfile?.username || storedStudentName || 'A/L Scholar';
  const myUserId = currentUserId || currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.email || 'current-user';

  // Merge current user's live entry into leaderboard entries
  const entries = useMemo(() => {
    const list = [...rawEntries];
    const userIndex = list.findIndex(
      (e) => (myUserId && e.userId === myUserId) || e.username.toLowerCase() === myUsername.toLowerCase()
    );

    const myEntry: LeaderboardEntry = {
      userId: myUserId,
      username: myUsername,
      stream: effectiveStream,
      completedHours: liveHours,
      completedTasks: completedTaskCount,
      currentStreak: liveStreak,
      syllabusCompletedPercent: liveSyllabusPercent,
    };

    if (userIndex >= 0) {
      list[userIndex] = { ...list[userIndex], ...myEntry };
    } else {
      list.push(myEntry);
    }

    const sorted = sortLeaderboardEntries(list);
    return compact ? sorted.slice(0, 5) : sorted;
  }, [rawEntries, myUserId, myUsername, effectiveStream, liveHours, completedTaskCount, progression.completedTopics, liveStreak, liveSyllabusPercent, compact]);

  const load = useCallback(async (p: LeaderboardPeriod) => {
    setLoading(true);
    try {
      const res = await fetchLeaderboard(p, 50);
      if (res.entries && res.entries.length > 0) {
        setRawEntries(res.entries);
      }
      setNeedsSetup(res.needsSetup);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myRank = entries.findIndex(
    (e) => (myUserId && e.userId === myUserId) || e.username.toLowerCase() === myUsername.toLowerCase()
  );

  const isMe = (e: LeaderboardEntry) =>
    (myUserId && e.userId === myUserId) || e.username.toLowerCase() === myUsername.toLowerCase();

  const medal = (i: number) =>
    i === 0 ? (
      <Crown className="w-4 h-4 text-amber-300" />
    ) : i === 1 ? (
      <Medal className="w-4 h-4 text-slate-300" />
    ) : (
      <Medal className="w-4 h-4 text-amber-600" />
    );

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 border border-white/15">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Syllabus Master Leaderboard</span>
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
        Ranked by total A/L syllabus completed %, study hours, and streak consistency!
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
                <span className="text-xs font-black text-cyan-300">{e.syllabusCompletedPercent || 0}% Syllabus</span>
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
                    isMe(e)
                      ? 'border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/40'
                      : i === 0
                        ? 'border-amber-400/50 bg-amber-500/10'
                        : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex justify-center">{medal(i)}</div>
                  <div className="text-xs font-black text-white truncate mt-1 flex items-center justify-center gap-1">
                    <span>@{e.username}</span>
                    {isMe(e) && (
                      <span className="text-[8px] font-black px-1 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">you</span>
                    )}
                  </div>
                  <div className="text-sm font-black text-cyan-300 mt-0.5">{e.syllabusCompletedPercent || 0}% Done</div>
                  <div className="text-[10px] text-slate-400">
                    {e.completedHours}h study • {e.currentStreak}d streak
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
                    <th className="py-2 pr-3 font-bold">Syllabus %</th>
                    <th className="py-2 font-bold">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((e, i) => (
                    <tr
                      key={e.userId}
                      className={`border-b border-white/5 ${isMe(e) ? 'bg-cyan-500/10' : ''}`}
                    >
                      <td className="py-2 pr-3 font-black text-slate-400">{i + 4}</td>
                      <td className="py-2 pr-3 font-bold text-white">
                        @{e.username}
                        {isMe(e) && (
                          <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">you</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 font-black text-amber-300">{e.completedHours}h</td>
                      <td className="py-2 pr-3 font-black text-cyan-300">{e.syllabusCompletedPercent || 0}%</td>
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
