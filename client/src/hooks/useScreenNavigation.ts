import { useCallback, useEffect, useState } from 'react';
import { ScreenId } from '../types';

const screens = new Set<ScreenId>(['dashboard', 'planner', 'topics', 'progress', 'admin', 'settings', 'courses', 'quiz', 'mistakes', 'pastpapers', 'leaderboard', 'notifications']);
const aliases: Record<string, ScreenId> = { timetable: 'planner', daily: 'planner', 'study-plan': 'planner', practice: 'quiz', 'past-papers': 'pastpapers', analytics: 'progress', 'daily-topics': 'topics' };
export function resolveScreen(value: string): ScreenId | null {
  return screens.has(value as ScreenId) ? value as ScreenId : aliases[value] || null;
}
const readScreen = () => resolveScreen(window.location.hash.replace(/^#\/?/, ''));

export function useScreenNavigation(defaultScreen: ScreenId = 'dashboard') {
  const [screen, setScreen] = useState<ScreenId>(() => readScreen() || defaultScreen);
  useEffect(() => {
    // Hash routes also survive refreshes on static hosting without rewrite rules.
    if (!readScreen()) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#/${defaultScreen}`);
    const onHistory = () => setScreen(readScreen() || defaultScreen);
    window.addEventListener('popstate', onHistory);
    window.addEventListener('hashchange', onHistory);
    return () => {
      window.removeEventListener('popstate', onHistory);
      window.removeEventListener('hashchange', onHistory);
    };
  }, [defaultScreen]);

  const navigate = useCallback((next: ScreenId) => {
    const target = resolveScreen(next);
    if (!target) return;
    if (readScreen() !== target) window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#/${target}`);
    setScreen(target);
  }, []);
  return [screen, navigate] as const;
}
