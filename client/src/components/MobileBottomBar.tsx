import React from 'react';
import { ScreenId } from '../types';
import {
  LayoutDashboard,
  CalendarCheck2,
  BookOpen,
  BarChart3,
} from 'lucide-react';

interface MobileBottomBarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  pendingDailyTasksCount?: number;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentScreen,
  onNavigate,
  pendingDailyTasksCount = 0,
}) => {
  const tabs: { id: ScreenId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'planner', label: 'Planner', icon: CalendarCheck2 },
    { id: 'topics', label: 'Topics', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
  ];

  return (
    <nav
      id="mobile-bottom-navigation-bar"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0E1022]/95 backdrop-blur-xl px-2 pt-1 pb-safe shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              id={`mobile-nav-${tab.id}`}
              onClick={() => onNavigate(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] py-1.5 transition-all cursor-pointer ${
                isActive ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-cyan-300' : ''}`} />
                {tab.id === 'planner' && pendingDailyTasksCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6B4EFF] px-1 text-[10px] font-bold text-white shadow-sm">
                    {pendingDailyTasksCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 ${
                  isActive ? 'font-bold text-cyan-300' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0.5 h-0.5 w-6 rounded-full bg-gradient-to-r from-[#6B4EFF] to-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
