const nonNegative = (value: unknown): number => {
  const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : 0;
};
export function leaderboardStats(user: any, completedSubtopics: number, period: string, now = new Date()) {
  let today: string;
  try { today = new Intl.DateTimeFormat('en-CA', {timeZone:user.timezone || 'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
  catch { today = now.toISOString().slice(0,10); }
  const day = (offset: number) => new Date(Date.parse(today+'T12:00:00Z') - offset*86400000).toISOString().slice(0,10);
  const days = period === 'monthly' ? 30 : 7;
  const minutes = user.studyMinutesByDate || {};
  const getMinutes = (date: string) => nonNegative(minutes instanceof Map ? minutes.get(date) : minutes[date]);
  let totalStudyMinutes = 0;
  for(let i=0;i<days;i++) totalStudyMinutes += getMinutes(day(i));
  const dates = new Set(Array.isArray(user.completedDates) ? user.completedDates : []);
  let currentStreak = 0;
  // A streak stays alive until the end of today if yesterday was completed.
  let offset = dates.has(day(0)) ? 0 : 1;
  while(dates.has(day(offset)) && currentStreak < dates.size) { currentStreak++; offset++; }
  const completedTasks = Math.floor(nonNegative(completedSubtopics));
  const score = Math.floor(totalStudyMinutes / 6) + currentStreak * 20 + completedTasks * 5;
  return {score,totalStudyMinutes,completedHours:totalStudyMinutes/60,currentStreak,completedTasks};
}
