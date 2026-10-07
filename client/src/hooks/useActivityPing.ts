import { useEffect } from 'react';
import { api, getAuthToken } from '../services/api';

const PING_EVERY_MS = 5 * 60 * 1000;
const IDLE_AFTER_MS = 5 * 60 * 1000;

// Tells the server the student is actively using the app. Time is only counted while the tab is
// visible AND the student has recently interacted, so a forgotten open tab doesn't inflate usage.
// The server measures the time itself; this only sends a tiny "still here" signal every few minutes.
export function useActivityPing(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let lastPing = 0;
    let lastInteraction = Date.now();

    const ping = (keepalive = false) => {
      if (!getAuthToken()) return;
      const now = Date.now();
      if (now - lastPing < 20_000) return;
      lastPing = now;
      api.pingActivity(keepalive).catch(() => {});
    };

    const touch = () => { lastInteraction = Date.now(); };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') ping(true); // credit the time just spent
      else { touch(); ping(); }
    };
    const onPageHide = () => ping(true);
    const interactionEvents: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

    interactionEvents.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    ping(); // start of this visit

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastInteraction < IDLE_AFTER_MS) ping();
    }, PING_EVERY_MS);

    return () => {
      window.clearInterval(timer);
      interactionEvents.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [active]);
}
