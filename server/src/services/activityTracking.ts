export const PING_MIN_GAP_MS = 20 * 1000;        // ignore spam / duplicate tabs
export const PING_SESSION_GAP_MS = 6 * 60 * 1000; // a longer silence means a new visit

// Decide how much time a ping earns. Measured from the server's own clock, never from the client.
export function pingCredit(prevMs: number, nowMs: number): { ignore: boolean; newVisit: boolean; minutes: number } {
  const gap = prevMs ? nowMs - prevMs : Infinity;
  if (gap < PING_MIN_GAP_MS) return { ignore: true, newVisit: false, minutes: 0 };
  const newVisit = gap > PING_SESSION_GAP_MS;
  return { ignore: false, newVisit, minutes: newVisit ? 1 : Math.round((gap / 60000) * 100) / 100 };
}
