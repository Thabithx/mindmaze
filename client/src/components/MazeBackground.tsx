import React from 'react';

export const MazeBackground: React.FC<{ opacity?: number }> = ({ opacity = 0.25 }) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Deep ambient glow spots */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#6B4EFF]/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-[#06B6D4]/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 w-[36rem] h-[36rem] bg-[#6B4EFF]/15 rounded-full blur-3xl" />

      {/* SVG Maze Circuit Grid */}
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="maze-grid-pattern"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            {/* Horizontal & Vertical grid segments */}
            <path
              d="M 0 30 H 60 V 90 H 120 M 60 0 V 60 H 120 M 0 90 H 30 V 120 M 90 0 V 30 H 120 M 30 60 H 90 V 120"
              stroke="#6B4EFF"
              strokeWidth="1.2"
              strokeOpacity="0.3"
              fill="none"
            />
            {/* Glowing intersection nodes */}
            <circle cx="60" cy="60" r="2.5" fill="#00F5FF" fillOpacity="0.6" />
            <circle cx="120" cy="30" r="1.8" fill="#8B5CF6" fillOpacity="0.5" />
            <circle cx="30" cy="90" r="2" fill="#06B6D4" fillOpacity="0.5" />
          </pattern>

          <linearGradient id="mazeFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B4EFF" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#00F5FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6B4EFF" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#maze-grid-pattern)" />

        {/* Dynamic Animated Pulse Lines */}
        <path
          d="M 50 100 Q 300 250 600 150 T 1200 400 T 1800 200"
          fill="none"
          stroke="url(#mazeFlowGrad)"
          strokeWidth="2.5"
          className="maze-animate-path"
        />
        <path
          d="M 200 900 Q 500 700 800 850 T 1500 650 T 2000 800"
          fill="none"
          stroke="#00F5FF"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          className="maze-animate-path"
          style={{ animationDuration: '45s' }}
        />
      </svg>
    </div>
  );
};
