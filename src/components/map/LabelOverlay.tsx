import React, { useRef } from 'react';
import { LabelSceneState } from '../../core/types/animation';

interface ScreenPoint {
  x: number;
  y: number;
}

interface Props {
  labels: LabelSceneState[];
  projectCoord: (lng: number, lat: number) => ScreenPoint | null;
  onUpdateLabelOffset?: (stopId: string, offsetX: number, offsetY: number) => void;
  onSelectStop?: (stopId: string) => void;
  selectedStopId?: string | null;
}

export const LabelOverlay: React.FC<Props> = ({
  labels,
  projectCoord,
  onUpdateLabelOffset,
  onSelectStop,
  selectedStopId,
}) => {
  const dragStartRef = useRef<{ startX: number; startY: number; initialOffsetX: number; initialOffsetY: number } | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent,
    stopId: string,
    currentOffsetX: number,
    currentOffsetY: number
  ) => {
    e.stopPropagation();
    if (onSelectStop) onSelectStop(stopId);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: currentOffsetX,
      initialOffsetY: currentOffsetY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current || !onUpdateLabelOffset) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      onUpdateLabelOffset(
        stopId,
        Math.round(dragStartRef.current.initialOffsetX + dx),
        Math.round(dragStartRef.current.initialOffsetY + dy)
      );
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {labels.map(l => {
        if (!l.visible || l.opacity <= 0.01) return null;

        const anchorPt = projectCoord(l.coordinates.lng, l.coordinates.lat);
        if (!anchorPt) return null;

        const isSelected = selectedStopId === l.stopId;
        const offsetX = l.offsetX;
        const offsetY = l.offsetY;

        const labelCenterX = anchorPt.x + offsetX;
        const labelCenterY = anchorPt.y + offsetY;

        const style = l.style;

        return (
          <div key={l.stopId} className="contents">
            {/* Leader Line */}
            {style.leaderLine && (offsetX !== 0 || offsetY !== 0) && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: '100%', height: '100%' }}
              >
                <line
                  x1={anchorPt.x}
                  y1={anchorPt.y}
                  x2={labelCenterX}
                  y2={labelCenterY}
                  stroke={style.borderColor || '#D3C9B4'}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity={l.opacity * 0.75}
                />
              </svg>
            )}

            {/* Label Card */}
            <div
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-75 select-none ${
                isSelected ? 'ring-2 ring-accent-500 shadow-xl' : ''
              }`}
              style={{
                left: `${labelCenterX}px`,
                top: `${labelCenterY}px`,
                opacity: l.opacity,
                transform: `translate(-50%, -50%) scale(${l.scale})`,
                fontFamily: style.fontFamily || 'Montserrat, sans-serif',
                fontSize: `${style.fontSize || 12}px`,
                fontWeight: style.fontWeight || '700',
                color: style.color || '#2B2724',
                backgroundColor: style.backgroundColor || '#F7F3E8',
                borderColor: style.borderColor || '#D3C9B4',
                borderWidth: `${style.borderWidth ?? 1}px`,
                borderRadius: `${style.borderRadius ?? 4}px`,
                padding: `${style.paddingY ?? 4}px ${style.paddingX ?? 8}px`,
                letterSpacing: `${style.letterSpacing ?? 1.5}px`,
                textTransform: style.uppercase ? 'uppercase' : 'none',
                boxShadow: style.shadow ? '0 4px 12px rgba(0, 0, 0, 0.25)' : 'none',
                whiteSpace: 'nowrap',
              }}
              onMouseDown={e => handleMouseDown(e, l.stopId, offsetX, offsetY)}
              title="Drag to reposition label offset"
            >
              {l.displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
};
