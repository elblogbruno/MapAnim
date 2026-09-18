import React from 'react';
import { StopSceneState } from '../../core/types/animation';

interface ScreenPoint {
  x: number;
  y: number;
}

interface Props {
  stops: StopSceneState[];
  projectCoord: (lng: number, lat: number) => ScreenPoint | null;
  onSelectStop?: (stopId: string) => void;
  selectedStopId?: string | null;
}

export const MarkerOverlay: React.FC<Props> = ({
  stops,
  projectCoord,
  onSelectStop,
  selectedStopId,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {stops.map(s => {
        if (!s.stop.visible || s.style.type === 'invisible') return null;
        const pt = projectCoord(s.stop.coordinates.lng, s.stop.coordinates.lat);
        if (!pt) return null;

        const isSelected = selectedStopId === s.stopId;
        const baseSize = s.style.size || 10;
        const color = s.style.color || '#8C342D';
        const strokeColor = s.style.strokeColor || '#FFFFFF';

        return (
          <div
            key={s.stopId}
            data-stop-marker={s.stopId}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto group"
            style={{
              left: `${pt.x}px`,
              top: `${pt.y}px`,
              opacity: s.markerOpacity,
            }}
            onClick={() => onSelectStop && onSelectStop(s.stopId)}
          >
            {/* Pulsing arrival wave */}
            {s.style.pulse && s.pulseOpacity > 0 && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: '50%',
                  top: '50%',
                  width: `${baseSize * 3}px`,
                  height: `${baseSize * 3}px`,
                  backgroundColor: color,
                  opacity: s.pulseOpacity,
                  transform: `translate(-50%, -50%) scale(${s.pulseScale})`,
                }}
              />
            )}

            {/* Marker Shape */}
            {s.style.type === 'ring' ? (
              <div
                className="rounded-full flex items-center justify-center transition-transform duration-75 shadow-md"
                style={{
                  width: `${baseSize * 2}px`,
                  height: `${baseSize * 2}px`,
                  backgroundColor: strokeColor,
                  border: `${s.style.strokeWidth || 2.5}px solid ${color}`,
                  transform: `scale(${s.markerScale * (isSelected ? 1.25 : 1.0)})`,
                }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: `${baseSize * 0.7}px`,
                    height: `${baseSize * 0.7}px`,
                    backgroundColor: color,
                  }}
                />
              </div>
            ) : s.style.type === 'pin' ? (
              <div
                className="flex flex-col items-center transition-transform duration-75 filter drop-shadow-md"
                style={{
                  transform: `translateY(-50%) scale(${s.markerScale * (isSelected ? 1.25 : 1.0)})`,
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: `${baseSize * 2}px`,
                    height: `${baseSize * 2}px`,
                    backgroundColor: color,
                    border: `2px solid ${strokeColor}`,
                  }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
                <div
                  className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent"
                  style={{ borderTopColor: color }}
                />
              </div>
            ) : (
              // Default circle
              <div
                className="rounded-full transition-transform duration-75 shadow-md"
                style={{
                  width: `${baseSize * 2}px`,
                  height: `${baseSize * 2}px`,
                  backgroundColor: color,
                  border: `${s.style.strokeWidth || 2}px solid ${strokeColor}`,
                  transform: `scale(${s.markerScale * (isSelected ? 1.25 : 1.0)})`,
                  boxShadow: isSelected
                    ? `0 0 0 3px rgba(225, 67, 55, 0.4)`
                    : s.style.glow ? `0 0 ${baseSize}px ${color}` : '0 2px 6px rgba(0,0,0,0.3)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
