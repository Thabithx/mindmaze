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
  const imageSizes = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div
      id="mind-maze-brand-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="shrink-0 flex items-center justify-center bg-transparent">
        <img
          src="/logo.png"
          alt="Mind Maze Logo"
          className={`${imageSizes[size]} object-cover bg-transparent drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]`}
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
