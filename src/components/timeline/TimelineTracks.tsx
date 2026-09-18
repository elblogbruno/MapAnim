import React, { useRef } from 'react';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { useProjectStore } from '../../store/useProjectStore';
import { calculateTimelineSchedule } from '../../core/engine/timingEngine';
import { Camera, Route } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

const VEHICLE_EMOJIS: Record<string, string> = {
  plane: '✈️',
  car: '🏎️',
  vintageCar: '🚗',
  motorcycle: '🏍️',
  bus: '🚐',
  dot: '⚪',
};

export const TimelineTracks: React.FC = () => {
  const { currentTime, duration, seek } = usePlaybackStore();
  const { project } = useProjectStore();
  const { selectedStopId, setSelectedStopId } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const schedule = calculateTimelineSchedule(project);
  const stops = project.route.stops;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pos * duration);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const movePos = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      seek(movePos * duration);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate ruler markers (smart step based on duration to avoid collisions)
  const secondMarkers = [];
  const step = duration > 20 ? 5 : duration > 8 ? 2 : 1;
  for (let s = 0; s <= duration; s += step) {
    const leftPercent = (s / duration) * 100;
    secondMarkers.push(
      <div
        key={s}
        className="absolute top-0 bottom-0 border-l border-studio-800/80 pointer-events-none flex flex-col justify-between"
        style={{ left: `${leftPercent}%` }}
      >
        <span className="text-[8px] md:text-[9px] font-mono text-studio-400 pl-0.5 md:pl-1">{s}s</span>
        <div className="h-1.5 md:h-2 w-px bg-studio-700" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="relative flex-1 bg-studio-950 px-2 py-1 select-none cursor-pointer flex flex-col justify-between overflow-hidden touch-none"
    >
      {/* Time Ruler */}
      <div className="relative h-4 md:h-5 border-b border-studio-800/80 mb-0.5">
        {secondMarkers}
      </div>

      {/* Tracks Container */}
      <div className="space-y-1 md:space-y-1.5 flex-1 flex flex-col justify-center">
        {/* Route & Stop Segments Track */}
        <div className="relative h-6 md:h-6 bg-studio-900 rounded-lg border border-studio-800/80 overflow-hidden flex items-center">
          <div className="absolute left-1.5 z-10 flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-studio-400 uppercase pointer-events-none">
            <Route className="w-2.5 h-2.5 md:w-3 md:h-3 text-accent-500" />
            <span className="hidden sm:inline">Ruta</span>
          </div>

          {/* Segment Blocks */}
          {schedule.segments.map((seg, idx) => {
            const startPct = (seg.startTime / duration) * 100;
            const widthPct = ((seg.endTime - seg.startTime) / duration) * 100;
            const rawSeg = project.route.segments.find(s => s.id === seg.segmentId);
            const vehicleIcon = rawSeg?.vehicle?.icon || 'vintageCar';
            const emoji = VEHICLE_EMOJIS[vehicleIcon] || '🏎️';

            return (
              <div
                key={seg.segmentId}
                className="absolute top-0 bottom-0 bg-accent-950/40 hover:bg-accent-900/50 border-r border-studio-700/60 flex items-center justify-between px-1.5 overflow-hidden transition-colors"
                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                title={`Leg ${idx + 1}: ${((rawSeg?.distanceMeters || 0) / 1000).toFixed(0)} km`}
              >
                <span className="text-[10px] select-none">{emoji}</span>
                <span className="text-[8px] md:text-[9px] font-mono text-accent-300/80 truncate ml-1">
                  {((rawSeg?.distanceMeters || 0) / 1000).toFixed(0)}km
                </span>
              </div>
            );
          })}

          {/* Stop Arrival Milestone Badges */}
          {schedule.stops.map((stopSlot, idx) => {
            const stop = stops[idx];
            if (!stop) return null;
            const leftPct = (stopSlot.arrivalTime / duration) * 100;
            const isSelected = stop.id === selectedStopId;
            const isHighlight = stop.behavior === 'highlight';

            return (
              <button
                key={stopSlot.stopId}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  seek(stopSlot.arrivalTime);
                  setSelectedStopId(stop.id);
                }}
                title={`Stop #${idx + 1}: ${stop.displayName} (${stopSlot.arrivalTime.toFixed(1)}s)`}
                className="absolute top-0 bottom-0 z-20 flex flex-col items-center group cursor-pointer"
                style={{ left: `${leftPct}%` }}
              >
                <div
                  className={`h-full w-px ${isSelected ? 'bg-accent-400' : 'bg-studio-700 group-hover:bg-studio-400'}`}
                />
                <div
                  className={`absolute top-0.5 transform -translate-x-1/2 px-1 py-0.2 rounded text-[8px] font-bold flex items-center gap-0.5 shadow transition-transform ${
                    isSelected
                      ? 'bg-accent-500 text-white ring-1 ring-white scale-110 z-30'
                      : isHighlight
                      ? 'bg-amber-500 text-stone-950 ring-1 ring-amber-900'
                      : 'bg-studio-800 text-studio-200 border border-studio-600 group-hover:scale-110'
                  }`}
                >
                  <span>{idx + 1}</span>
                  <span className="hidden md:inline max-w-[45px] truncate">{stop.displayName}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Camera Track - Desktop Only to free up mobile vertical space */}
        <div className="hidden sm:flex relative h-4 md:h-5 bg-studio-900 rounded-lg border border-studio-800/80 overflow-hidden items-center">
          <div className="absolute left-1.5 z-10 flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-studio-400 uppercase pointer-events-none">
            <Camera className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-400" />
            <span className="hidden sm:inline">Cámara</span>
          </div>

          {/* Intro Phase */}
          <div
            className="absolute top-0 bottom-0 bg-blue-950/30 border-r border-blue-800/40 flex items-center justify-end pr-1 text-[8px] md:text-[9px] font-mono text-blue-300/60"
            style={{
              left: 0,
              width: `${(schedule.introEndTime / duration) * 100}%`,
            }}
          >
            In
          </div>

          {/* Outro Phase */}
          <div
            className="absolute top-0 bottom-0 bg-blue-950/30 border-l border-blue-800/40 flex items-center pl-1 text-[8px] md:text-[9px] font-mono text-blue-300/60"
            style={{
              left: `${(schedule.outroStartTime / duration) * 100}%`,
              width: `${((duration - schedule.outroStartTime) / duration) * 100}%`,
            }}
          >
            Out
          </div>
        </div>
      </div>

      {/* Red Scrub Playhead Line */}
      <div
        className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
        style={{ left: `${playheadPercent}%` }}
      >
        <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rotate-45 transform -translate-y-1 shadow-md" />
        <div className="w-0.5 flex-1 bg-red-500 shadow-sm" />
      </div>
    </div>
  );
};
