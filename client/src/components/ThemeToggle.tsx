import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
export function initializeTheme() {
  let theme = 'dark';
  try { if (localStorage.getItem('mindmaze-theme') === 'light') theme = 'light'; } catch {}
  applyTheme(theme);
}
export function ThemeToggle() {
  const [light, setLight] = useState(() => document.documentElement.dataset.theme === 'light');
  return <button type="button" role="switch" aria-checked={light} aria-label="Light theme" title={light ? 'Switch to dark theme' : 'Switch to light theme'}
    className="theme-toggle flex items-center gap-1 rounded-full border p-1 shrink-0 min-h-[40px]" onClick={() => {
      const next = !light; setLight(next); applyTheme(next ? 'light' : 'dark');
      try { localStorage.setItem('mindmaze-theme', next ? 'light' : 'dark'); } catch {}
    }}>
    <span className="theme-toggle-thumb rounded-full p-1.5">{light ? <Sun size={16}/> : <Moon size={16}/>}</span>
    <span className="hidden lg:inline pr-2 text-xs font-semibold">{light ? 'Light' : 'Dark'}</span>
  </button>;
}
