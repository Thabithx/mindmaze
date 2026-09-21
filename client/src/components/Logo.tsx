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
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-base font-bold',
    md: 'text-xl font-extrabold',
    lg: 'text-2xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight',
  };

  return (
    <div
      id="mind-maze-brand-logo"
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Brand mark — neon maze-brain logo (blends into the dark navy background) */}
      <img
        src="/icon-192.png"
        alt="Mind Maze logo"
        width={192}
        height={192}
        className={`relative rounded-xl object-cover ring-1 ring-white/10 shadow-lg shadow-[#6B4EFF]/30 ${iconSizes[size]}`}
        draggable={false}
      />

      {showText && (
        <div className="flex flex-col">
          <div className={`leading-none flex items-center gap-1.5 ${textSizes[size]}`}>
            <span className="text-white">Mind</span>
            <span className="bg-gradient-to-r from-[#6B4EFF] via-[#8B5CF6] to-[#00F5FF] bg-clip-text text-transparent">
              Maze
            </span>
          </div>
          <span className="text-[10px] tracking-wider uppercase font-medium text-cyan-400 mt-0.5">
            GCE A/L Study Planner
          </span>
        </div>
      )}
    </div>
  );
};
