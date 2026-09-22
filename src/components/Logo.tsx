import React from 'react';

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

  return (
    <div
      id="mind-maze-brand-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className={`flex shrink-0 items-center justify-center rounded-xl overflow-hidden bg-black/40 border border-purple-500/30 shadow-lg shadow-purple-900/30 ${iconSizes[size]}`}>
        <img
          src="/logo.png"
          alt="Mind Maze Logo"
          className="w-full h-full object-contain p-0.5"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="leading-none flex items-center font-black text-white text-base tracking-wide">
            <span>Mind Maze</span>
          </div>
          <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-400 mt-1">
            GCE A/L Study Suite
          </span>
        </div>
      )}
    </div>
  );
};

