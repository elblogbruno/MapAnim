import React from 'react';
import { Gauge, Navigation, Compass } from 'lucide-react';
import { DistanceHudConfig, HudPosition, HudTheme } from '../../core/types/project';

interface Props {
  distanceMeters: number;
  totalDistanceMeters: number;
  progress: number;
  config?: DistanceHudConfig;
  legacyUnit?: 'miles' | 'km' | 'hidden';
  legacyShow?: boolean;
}

export const DistanceHudOverlay: React.FC<Props> = ({
  distanceMeters,
  totalDistanceMeters,
  progress,
  config,
  legacyUnit = 'km',
  legacyShow = true,
}) => {
  const isEnabled = config ? config.enabled : (legacyShow && legacyUnit !== 'hidden');
  if (!isEnabled) return null;

  const unit = config?.unit || (legacyUnit === 'miles' ? 'miles' : 'km');
  const position: HudPosition = config?.position || 'bottomLeft';
  const theme: HudTheme = config?.theme || 'glassDark';
  const label = config?.customLabel !== undefined ? config.customLabel : (unit === 'km' ? 'TOTAL DISTANCE' : 'TOTAL DISTANCE');
  const showProgress = config?.showProgressBar ?? true;
  const decimals = config?.decimals ?? 1;

  // Conversion
  const value = unit === 'km' ? distanceMeters / 1000 : distanceMeters / 1609.344;
  const totalValue = unit === 'km' ? totalDistanceMeters / 1000 : totalDistanceMeters / 1609.344;
  const unitLabel = unit === 'km' ? 'km' : 'mi';

  const formattedDistance = decimals > 0
    ? value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(value).toLocaleString('en-US');

  const formattedTotal = decimals > 0
    ? totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : Math.round(totalValue).toLocaleString('en-US');

  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'topLeft':
        return 'top-4 left-4';
      case 'topRight':
        return 'top-4 right-4';
      case 'topCenter':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'bottomRight':
        return 'bottom-4 right-4';
      case 'bottomCenter':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      case 'bottomLeft':
      default:
        return 'bottom-4 left-4';
    }
  };

  return (
    <div
      className={`absolute ${getPositionClasses()} z-10 pointer-events-none transition-all duration-100 ease-out select-none`}
    >
      {theme === 'glassDark' && (
        <div className="bg-studio-950/85 backdrop-blur-md border border-studio-700/70 rounded-xl px-3.5 py-2 shadow-2xl flex flex-col gap-1 min-w-[140px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-accent-400">
              <Compass className="w-3.5 h-3.5 animate-spin-slow" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-studio-400">
                {label}
              </span>
            </div>
            {showProgress && (
              <span className="text-[10px] font-mono font-bold text-accent-400">
                {percent}%
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="font-mono text-lg md:text-xl font-black text-white tracking-tight leading-none drop-shadow">
              {formattedDistance}
            </span>
            <span className="font-mono text-xs font-bold text-accent-400 uppercase">
              {unitLabel}
            </span>
          </div>

          {showProgress && (
            <div className="w-full bg-studio-800 rounded-full h-1 overflow-hidden mt-0.5">
              <div
                className="bg-gradient-to-r from-accent-600 to-accent-400 h-full rounded-full transition-all duration-75"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      )}

      {theme === 'vintageBadge' && (
        <div className="bg-[#F7F3E8] border-2 border-[#8C342D] rounded-lg px-3 py-1.5 shadow-xl flex flex-col items-center justify-center min-w-[130px]">
          <div className="flex items-center gap-1 text-[#8C342D]">
            <Navigation className="w-3 h-3 fill-[#8C342D]" />
            <span className="text-[9px] font-black uppercase tracking-wider font-display">
              {label}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono text-base md:text-lg font-black text-[#2B2724] leading-none">
              {formattedDistance}
            </span>
            <span className="font-serif text-xs font-bold text-[#8C342D] uppercase">
              {unitLabel}
            </span>
          </div>
          {showProgress && (
            <div className="w-full bg-[#D3C9B4] rounded-full h-1 overflow-hidden mt-1">
              <div className="bg-[#8C342D] h-full" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      )}

      {theme === 'minimalClean' && (
        <div className="bg-white/95 backdrop-blur-sm border border-black/10 rounded-md px-3 py-1.5 shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-600" />
          <div>
            <div className="text-[8px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-sm md:text-base font-bold text-gray-900 leading-none">{formattedDistance}</span>
              <span className="text-[11px] font-bold text-gray-500 uppercase">{unitLabel}</span>
              {showProgress && <span className="text-[9px] text-gray-400">{percent}%</span>}
            </div>
          </div>
        </div>
      )}

      {theme === 'techSport' && (
        <div className="bg-black/90 border border-cyan-500/50 rounded-lg px-3.5 py-2 shadow-cyan-500/20 shadow-lg flex flex-col gap-1 min-w-[150px]">
          <div className="flex items-center justify-between text-cyan-400">
            <div className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono font-bold tracking-widest">
                {label}
              </span>
            </div>
            <span className="text-[9px] font-mono text-cyan-300">
              / {formattedTotal} {unitLabel}
            </span>
          </div>
          <div className="flex items-baseline justify-between font-mono">
            <span className="text-lg md:text-xl font-bold text-cyan-100 text-shadow-cyan leading-none">
              {formattedDistance}
            </span>
            <span className="text-xs font-bold text-cyan-400">
              {unitLabel}
            </span>
          </div>
          {showProgress && (
            <div className="w-full bg-cyan-950 rounded h-1.5 overflow-hidden p-0.5 border border-cyan-800/60">
              <div
                className="bg-cyan-400 h-full rounded transition-all duration-75 shadow-sm shadow-cyan-400"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
