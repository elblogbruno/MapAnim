import { ProjectData } from '../types/project';
import { geodesicDistance } from '../math/geo';

export interface SegmentTimeSlot {
  segmentIndex: number;
  segmentId: string;
  startStopId: string;
  endStopId: string;
  startTime: number;
  endTime: number;
  travelStartTime: number;
  travelEndTime: number;
  pauseDuration: number;
  distanceMeters: number;
}

export interface StopTimeSlot {
  stopIndex: number;
  stopId: string;
  arrivalTime: number; // When the route arrives at this stop
  departureTime: number; // When the route leaves this stop (after pause)
  pauseDuration: number;
}

export interface ProjectTimelineSchedule {
  introStartTime: number;
  introEndTime: number;
  routeStartTime: number;
  routeEndTime: number;
  outroStartTime: number;
  outroEndTime: number;
  totalDuration: number;
  segments: SegmentTimeSlot[];
  stops: StopTimeSlot[];
}

/**
 * Calculates the deterministic time schedule for all stops and segments in a project.
 * Uses distance-weighted allocation (with square-root compression) so long legs don't monopolize the video.
 */
export function calculateTimelineSchedule(project: ProjectData): ProjectTimelineSchedule {
  const { stops, segments } = project.route;
  const totalDuration = project.video.duration;

  const introDuration = project.camera.introZoomEnabled
    ? Math.max(1.4, Math.min(2.0, totalDuration * 0.12))
    : 0.6;
  const outroHold = project.camera.outroHoldSeconds || 1.2;
  const outroDuration = project.camera.outroZoomOutEnabled
    ? Math.max(2.0, Math.min(3.2, outroHold + 1.0))
    : 0.6;

  const routeAvailableDuration = Math.max(1.0, totalDuration - introDuration - outroDuration);

  if (stops.length === 0 || segments.length === 0) {
    return {
      introStartTime: 0,
      introEndTime: introDuration,
      routeStartTime: introDuration,
      routeEndTime: introDuration,
      outroStartTime: introDuration,
      outroEndTime: totalDuration,
      totalDuration,
      segments: [],
      stops: [],
    };
  }

  // Calculate total pause time across stops
  let totalPauseTime = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const stop = stops[i];
    if (stop.behavior === 'pause') {
      totalPauseTime += Math.max(0.2, stop.pauseDuration || 0.5);
    } else if (stop.behavior === 'highlight' && i > 0) {
      totalPauseTime += 0.25; // Subtle arrival beat for highlighted stops
    }
  }

  // Ensure travel time has enough room
  const availableTravelTime = Math.max(0.5, routeAvailableDuration - totalPauseTime);

  // Compute distance weights for segments using sqrt(distance) compression
  const segmentWeights: number[] = [];
  let totalWeight = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let dist = seg.distanceMeters;

    if (!dist || dist <= 0) {
      // Fallback to direct geodesic distance between stops
      const startStop = stops.find(s => s.id === seg.startStopId);
      const endStop = stops.find(s => s.id === seg.endStopId);
      if (startStop && endStop) {
        dist = geodesicDistance(startStop.coordinates, endStop.coordinates);
      } else {
        dist = 100000;
      }
    }

    // Square root compression prevents long flights/drives from overwhelming short hops
    const km = dist / 1000;
    const weight = Math.max(0.1, Math.sqrt(km));
    segmentWeights.push(weight);
    totalWeight += weight;
  }

  // Assign segment time slots
  const segmentSlots: SegmentTimeSlot[] = [];
  const stopSlots: StopTimeSlot[] = [];

  let currentTime = introDuration;

  // First stop arrives at start of route
  stopSlots.push({
    stopIndex: 0,
    stopId: stops[0].id,
    arrivalTime: 0,
    departureTime: currentTime,
    pauseDuration: 0,
  });

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const weightFraction = totalWeight > 0 ? segmentWeights[i] / totalWeight : 1 / segments.length;
    const travelDuration = availableTravelTime * weightFraction;

    const endStop = stops.find(s => s.id === seg.endStopId);
    let pauseDuration = 0;
    if (endStop) {
      if (endStop.behavior === 'pause') {
        pauseDuration = Math.max(0.2, endStop.pauseDuration || 0.5);
      } else if (endStop.behavior === 'highlight' && i < segments.length - 1) {
        pauseDuration = 0.25;
      }
    }

    const travelStartTime = currentTime;
    const travelEndTime = currentTime + travelDuration;
    const slotEndTime = travelEndTime + pauseDuration;

    segmentSlots.push({
      segmentIndex: i,
      segmentId: seg.id,
      startStopId: seg.startStopId,
      endStopId: seg.endStopId,
      startTime: travelStartTime,
      endTime: slotEndTime,
      travelStartTime,
      travelEndTime,
      pauseDuration,
      distanceMeters: seg.distanceMeters,
    });

    if (endStop) {
      stopSlots.push({
        stopIndex: i + 1,
        stopId: endStop.id,
        arrivalTime: travelEndTime,
        departureTime: slotEndTime,
        pauseDuration,
      });
    }

    currentTime = slotEndTime;
  }

  const routeEndTime = currentTime;
  const outroStartTime = routeEndTime;
  const outroEndTime = totalDuration;

  return {
    introStartTime: 0,
    introEndTime: introDuration,
    routeStartTime: introDuration,
    routeEndTime,
    outroStartTime,
    outroEndTime,
    totalDuration,
    segments: segmentSlots,
    stops: stopSlots,
  };
}
