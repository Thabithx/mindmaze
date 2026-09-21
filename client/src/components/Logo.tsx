import React from 'react';
import { Brain, Sparkles } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  onClick,
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  };

  const brainSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-8 h-8',
  };

  return (
    <div
      id="mind-maze-brand-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-600 shadow-lg shadow-indigo-900/40 text-white ${iconSizes[size]}`}>
        <Brain className={brainSizes[size]} />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="leading-none flex items-center gap-1 font-black text-white text-base tracking-wide">
            <span>Mind Maze</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          </div>
          <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-400 mt-1">
            GCE A/L Study Suite
          </span>
        </div>
      )}
    </div>
  );
};
