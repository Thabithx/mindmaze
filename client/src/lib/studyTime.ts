export function safeMinutes(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
export function studyDate(now = new Date(), timezone = 'Asia/Colombo'): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
  catch { return studyDate(now, 'Asia/Colombo'); }
}
export function weekMinutes(records: Record<string, number>, today: string): number {
  const date = new Date(today + 'T12:00:00');
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (key <= today) total += safeMinutes(records[key]);
    date.setDate(date.getDate() + 1);
  }
  return total;
}
export function formatStudyTime(minutes: number): string {
  const seconds = Math.round(safeMinutes(minutes) * 60);
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}
