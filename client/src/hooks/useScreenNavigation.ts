import { useCallback, useEffect, useState } from 'react';
import { ScreenId } from '../types';

const screens = new Set<ScreenId>(['dashboard', 'planner', 'topics', 'progress', 'admin', 'settings', 'courses', 'quiz', 'mistakes', 'pastpapers', 'paperquiz', 'leaderboard', 'notifications']);
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

  const navigate = useCallback((next: ScreenId, paperId?: string) => {
    const target = resolveScreen(next);
    if (!target) return;
    const url = new URL(window.location.href);
    if (target === 'paperquiz' && paperId) url.searchParams.set('paper', paperId);
    else if (target !== 'paperquiz') url.searchParams.delete('paper');
    url.hash = '/' + target;
    if (window.location.href !== url.href) window.history.pushState(null, '', url.pathname + url.search + url.hash);
    setScreen(target);
  }, []);
  return [screen, navigate] as const;
}
