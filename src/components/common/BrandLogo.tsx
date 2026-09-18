import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<Props> = ({ size = 'md', showSubtitle = false }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7 sm:w-8 sm:h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 select-none group cursor-default">
      {/* Signature Geometric Waypoint & Reel Icon Badge */}
      <div className={`${iconSizes[size]} relative rounded-xl bg-gradient-to-br from-amber-500 via-accent-600 to-rose-700 p-0.5 shadow-lg shadow-accent-600/25 flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
        <div className="w-full h-full bg-studio-950/80 backdrop-blur-sm rounded-[10px] flex items-center justify-center overflow-hidden relative">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-accent-600/30 via-transparent to-amber-400/20 pointer-events-none" />

          {/* Custom Stylized Route Loop & Waypoint SVG */}
          <svg
            viewBox="0 0 32 32"
            className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white filter drop-shadow-md"
            fill="none"
          >
            {/* Dynamic S-Curve Flight Path */}
            <path
              d="M6 24 C 8 16, 16 20, 16 12 C 16 8, 22 6, 26 8"
              stroke="url(#brandGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Waypoint Departure Ring */}
            <circle cx="6" cy="24" r="2.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
            {/* Motion Arrow / Destination Pin */}
            <circle cx="26" cy="8" r="3" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="26" cy="8" r="1" fill="#18181B" />

            <defs>
              <linearGradient id="brandGradient" x1="6" y1="24" x2="26" y2="8" gradientUnits="userSpaceOnUse">
                <stop stopColor="#EF4444" />
                <stop offset="0.5" stopColor="#F97316" />
                <stop offset="1" stopColor="#FBBF24" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white font-display">
            ROUTE
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-accent-600/90 to-amber-600/90 text-white shadow-sm border border-white/10">
            STUDIO
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] text-studio-400 font-mono uppercase tracking-widest mt-0.5">
            Cinematic Map Engine
          </span>
        )}
      </div>
    </div>
  );
};
