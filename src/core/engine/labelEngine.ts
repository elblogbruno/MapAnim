import { ProjectData, StopLabelStyle } from '../types/project';
import { LabelSceneState } from '../types/animation';
import { ProjectTimelineSchedule } from './timingEngine';
import { clamp, lerp } from '../math/interpolation';

const DEFAULT_LABEL_STYLE: StopLabelStyle = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 14,
  fontWeight: '700',
  color: '#2B2724',
  backgroundColor: '#F7F3E8',
  borderColor: '#D3C9B4',
  borderWidth: 1,
  borderRadius: 4,
  paddingX: 10,
  paddingY: 5,
  uppercase: true,
  letterSpacing: 1.5,
  shadow: true,
  leaderLine: true,
  offsetX: 0,
  offsetY: -36,
};

export function calculateDeterministicLabels(
  project: ProjectData,
  timeSeconds: number,
  schedule: ProjectTimelineSchedule,
  activeSegmentIndex: number
): LabelSceneState[] {
  const { stops, labelDisplayMode, defaultLabelStyle } = project.route;
  const mergedDefaultStyle = { ...DEFAULT_LABEL_STYLE, ...defaultLabelStyle };

  const labelsMap = new Map<string, LabelSceneState>();
  const isOutro = timeSeconds >= schedule.outroStartTime;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (!stop.visible) continue;

    const stopSchedule = schedule.stops[i];
    const arrivalTime = stopSchedule ? stopSchedule.arrivalTime : 0;
    const departureTime = stopSchedule ? stopSchedule.departureTime : 0;

    const style: StopLabelStyle = {
      ...mergedDefaultStyle,
      ...(stop.labelStyle || {}),
    };

    let opacity = 0;
    let scale = 1;
    let isCurrent = false;

    // Check if this is the start or final stop
    const isStart = i === 0;
    const isFinal = i === stops.length - 1;
    const isVisited = timeSeconds >= arrivalTime;
    const isNextDestination = activeSegmentIndex === i - 1;
    const isCurrentlyActive = (activeSegmentIndex === i - 1) || (timeSeconds >= arrivalTime && timeSeconds <= departureTime);

    if (isCurrentlyActive) {
      isCurrent = true;
    }

    switch (labelDisplayMode) {
      case 'all':
        opacity = 1;
        scale = 1;
        break;

      case 'current':
        if (isCurrent || (isStart && timeSeconds < schedule.routeStartTime) || (isFinal && isOutro)) {
          opacity = 1;
        } else {
          opacity = 0;
        }
        break;

      case 'visited':
        if (timeSeconds < arrivalTime) {
          // Fade in slightly before arrival
          const fadeLead = 1.0;
          if (timeSeconds >= arrivalTime - fadeLead) {
            opacity = clamp((timeSeconds - (arrivalTime - fadeLead)) / fadeLead, 0, 1);
          } else {
            opacity = 0;
          }
        } else {
          opacity = 1;
        }
        break;

      case 'cinematic':
      default:
        if (isOutro) {
          // In final zoom-out: Show strategic stops (Start, End, and Priority 1 or Highlight stops)
          const isStrategic = isStart || isFinal || stop.behavior === 'highlight' || stop.labelPriority === 1;
          if (isStrategic) {
            opacity = 0.95;
            scale = isFinal || isStart ? 1.05 : 0.9;
          } else {
            // Lower prominence for minor pass-through stops at final zoom-out
            opacity = 0.25;
            scale = 0.8;
          }
        } else if (timeSeconds < schedule.routeStartTime) {
          // Intro: Start stop is prominently visible
          if (isStart) {
            const introFade = clamp(timeSeconds / (schedule.introEndTime * 0.8 || 1), 0, 1);
            opacity = introFade;
            scale = lerp(0.85, 1, introFade);
          } else {
            opacity = 0;
          }
        } else {
          // Traveling:
          if (isCurrentlyActive || isNextDestination) {
            // Fade in approaching destination
            const activeSlot = schedule.segments[activeSegmentIndex];
            if (activeSlot && isNextDestination) {
              const segProgress = clamp(
                (timeSeconds - activeSlot.travelStartTime) / (activeSlot.travelEndTime - activeSlot.travelStartTime || 1),
                0,
                1
              );
              // Appears when 40% through segment
              opacity = clamp((segProgress - 0.4) / 0.6, 0, 1);
              scale = lerp(0.9, 1.0, opacity);
            } else {
              opacity = 1;
              scale = 1;
            }
          } else if (isVisited) {
            // Visited stop: smoothly fade to subtle state or fade out for pass-through stops
            const timeSinceDeparture = timeSeconds - departureTime;
            if (stop.behavior === 'highlight' || isStart) {
              // Stays visible at elegant muted opacity
              opacity = clamp(1.0 - timeSinceDeparture * 0.3, 0.4, 1.0);
              scale = 0.92;
            } else {
              // Pass-through stops fade out smoothly after visit
              opacity = clamp(1.0 - timeSinceDeparture * 0.8, 0, 1.0);
              scale = 0.85;
            }
          } else {
            opacity = 0;
          }
        }
        break;
    }

    // Invariant check: Strict deduplication by stopId
    if (labelsMap.has(stop.id)) {
      console.warn(`[LabelEngine Violation]: Duplicate stop ID "${stop.id}" detected in scene derivation. Dropping duplicate.`);
      continue;
    }

    labelsMap.set(stop.id, {
      stopId: stop.id,
      displayName: stop.displayName || stop.canonicalName.split(',')[0],
      coordinates: stop.coordinates,
      opacity,
      scale,
      offsetX: style.offsetX || 0,
      offsetY: style.offsetY || -36,
      leaderLine: style.leaderLine,
      visible: opacity > 0.01,
      style,
      priority: isCurrent ? 1 : isFinal ? 2 : isStart ? 3 : stop.labelPriority || 4,
      isCurrent,
    });
  }

  return Array.from(labelsMap.values());
}
