import { ProjectData } from '../types/project';
import {
  SceneState,
  DrawnPolyline,
  StopSceneState,
  TransportSceneState,
  TitleSceneState,
  PhotoSceneState,
} from '../types/animation';
import { LngLatTuple } from '../types/geo';
import { calculateBearing } from '../math/geo';
import { calculateTimelineSchedule } from './timingEngine';
import { calculateDeterministicCamera } from './cameraDirector';
import { calculateDeterministicLabels } from './labelEngine';
import {
  pointAlongPolyline,
  slicePolylineAtDistance,
  slicePolylineRemaining,
  precalculatePolylineDistances,
  PolylineDistanceData,
} from '../math/polyline';
import { getEasing } from '../math/easing';
import { clamp, lerp } from '../math/interpolation';

// Cache for precalculated polyline distances
const polylineDistanceCache = new Map<string, PolylineDistanceData>();

function getPolylineData(segmentId: string, coordinates: LngLatTuple[]): PolylineDistanceData {
  const cacheKey = `${segmentId}_${coordinates.length}_${coordinates[0]?.[0] || 0}`;
  if (!polylineDistanceCache.has(cacheKey)) {
    polylineDistanceCache.set(cacheKey, precalculatePolylineDistances(coordinates));
  }
  return polylineDistanceCache.get(cacheKey)!;
}

export function getSceneAtTime(project: ProjectData, timeSeconds: number): SceneState {
  const duration = project.video.duration;
  const t = clamp(timeSeconds, 0, duration);
  const progress = duration > 0 ? t / duration : 0;

  const schedule = calculateTimelineSchedule(project);
  const { stops, segments, defaultLineStyle, defaultMarkerStyle, routeEasing } = project.route;

  const easeFn = getEasing(routeEasing || 'cinematic');

  // Determine active segment
  let activeSegmentIndex = -1;
  let activeSegmentProgress = 0;
  let headPosition: LngLatTuple | null = null;
  let headHeading = 0;
  let totalDistanceTravelled = 0;
  let totalRouteDistance = 0;

  // Calculate total route distance
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const data = getPolylineData(seg.id, seg.geometry);
    totalRouteDistance += data.totalLength;
  }

  // Find active segment in schedule
  if (t < schedule.routeStartTime) {
    // Intro phase: at start stop
    activeSegmentIndex = 0;
    activeSegmentProgress = 0;
    if (stops.length > 0) {
      headPosition = [stops[0].coordinates.lng, stops[0].coordinates.lat];
      if (segments.length > 0 && segments[0].geometry.length > 1) {
        headHeading = getPolylineData(segments[0].id, segments[0].geometry).totalLength > 0
          ? pointAlongPolyline(segments[0].geometry, 0).heading
          : 0;
      }
    }
  } else if (t >= schedule.routeEndTime) {
    // Outro phase: at final stop
    activeSegmentIndex = segments.length - 1;
    activeSegmentProgress = 1;
    totalDistanceTravelled = totalRouteDistance;
    if (stops.length > 0) {
      const lastStop = stops[stops.length - 1];
      headPosition = [lastStop.coordinates.lng, lastStop.coordinates.lat];
      const lastSeg = segments[segments.length - 1];
      if (lastSeg && lastSeg.geometry.length > 1) {
        const coords = lastSeg.geometry;
        const data = getPolylineData(lastSeg.id, coords);
        headHeading = pointAlongPolyline(coords, data.totalLength, data).heading;
      }
    }
  } else {
    // During travel
    for (let i = 0; i < schedule.segments.length; i++) {
      const slot = schedule.segments[i];
      if (t >= slot.startTime && t <= slot.endTime) {
        activeSegmentIndex = i;
        const travelDuration = slot.travelEndTime - slot.travelStartTime;
        if (t <= slot.travelStartTime) {
          activeSegmentProgress = 0;
        } else if (t >= slot.travelEndTime) {
          activeSegmentProgress = 1; // Pausing at destination
        } else {
          const rawProgress = (t - slot.travelStartTime) / (travelDuration || 1);
          activeSegmentProgress = easeFn(clamp(rawProgress, 0, 1));
        }
        break;
      }
    }
  }

  // Build drawn polylines
  const drawnPolylines: DrawnPolyline[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const coords = seg.geometry;
    if (coords.length < 2) continue;

    const data = getPolylineData(seg.id, coords);
    const segColor = seg.color || defaultLineStyle.color || '#8C342D';
    const segWidth = seg.width || defaultLineStyle.width || 4;

    if (i < activeSegmentIndex) {
      // Completed segment
      drawnPolylines.push({
        segmentId: seg.id,
        coordinates: coords,
        color: segColor,
        width: segWidth,
        opacity: defaultLineStyle.completedOpacity ?? defaultLineStyle.opacity ?? 1,
        dashPattern: seg.dashPattern || defaultLineStyle.dashPattern,
        outlineColor: defaultLineStyle.outlineColor || '#ffffff',
        outlineWidth: defaultLineStyle.outlineWidth || 0,
        glow: defaultLineStyle.glow,
        glowColor: defaultLineStyle.glowColor || '#8C342D',
      });
      totalDistanceTravelled += data.totalLength;
    } else if (i === activeSegmentIndex) {
      // Active segment
      const currentDist = data.totalLength * activeSegmentProgress;
      const sliced = slicePolylineAtDistance(coords, currentDist, data);
      const pointInfo = pointAlongPolyline(coords, currentDist, data);

      headPosition = pointInfo.point;
      headHeading = pointInfo.heading;
      totalDistanceTravelled += currentDist;

      drawnPolylines.push({
        segmentId: seg.id,
        coordinates: sliced,
        color: segColor,
        width: segWidth,
        opacity: defaultLineStyle.opacity ?? 1,
        dashPattern: seg.dashPattern || defaultLineStyle.dashPattern,
        outlineColor: defaultLineStyle.outlineColor || '#ffffff',
        outlineWidth: defaultLineStyle.outlineWidth || 0,
        glow: defaultLineStyle.glow,
        glowColor: defaultLineStyle.glowColor || '#8C342D',
      });

      // Keep un-traveled portion of the active segment visible ahead of the vehicle
      if (defaultLineStyle.futureVisibility && currentDist < data.totalLength) {
        const remaining = slicePolylineRemaining(coords, currentDist, data);
        if (remaining.length >= 2) {
          const futureOpacity = Math.max(
            0.35,
            (defaultLineStyle.completedOpacity ?? defaultLineStyle.opacity ?? 1) * 0.45
          );
          drawnPolylines.push({
            segmentId: `${seg.id}_future`,
            coordinates: remaining,
            color: segColor,
            width: Math.max(2, segWidth - 1),
            opacity: futureOpacity,
            dashPattern: [4, 4],
            outlineColor: 'transparent',
            outlineWidth: 0,
            glow: false,
            glowColor: 'transparent',
          });
        }
      }
    } else if (defaultLineStyle.futureVisibility) {
      // Future segment: visible enough to remain a reliable connector on both
      // light and dark basemaps, while still subordinate to the active route.
      const futureOpacity = Math.max(
        0.35,
        (defaultLineStyle.completedOpacity ?? defaultLineStyle.opacity ?? 1) * 0.45
      );
      drawnPolylines.push({
        segmentId: seg.id,
        coordinates: coords,
        color: segColor,
        width: Math.max(2, segWidth - 1),
        opacity: futureOpacity,
        dashPattern: [4, 4],
        outlineColor: 'transparent',
        outlineWidth: 0,
        glow: false,
        glowColor: 'transparent',
      });
    }
  }

  // Calculate Stops scene state
  const stopSceneStates: StopSceneState[] = [];

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const stopSlot = schedule.stops[i];
    const arrivalTime = stopSlot ? stopSlot.arrivalTime : 0;
    const departureTime = stopSlot ? stopSlot.departureTime : 0;

    let state: 'unvisited' | 'arriving' | 'visited' | 'current' = 'unvisited';
    let markerOpacity = 0.6;
    let markerScale = 1.0;
    let pulseScale = 1.0;
    let pulseOpacity = 0;

    if (t < arrivalTime) {
      state = 'unvisited';
      markerOpacity = 0.5;
    } else if (t >= arrivalTime && t <= departureTime + 0.3) {
      state = 'arriving';
      markerOpacity = 1.0;
      markerScale = 1.25;

      // Pulse animation on arrival (duration ~0.6s)
      const pulseTime = t - arrivalTime;
      if (pulseTime >= 0 && pulseTime <= 0.8) {
        const pt = pulseTime / 0.8;
        pulseScale = lerp(1.0, 2.5, pt);
        pulseOpacity = lerp(0.8, 0, pt);
      }
    } else {
      state = 'visited';
      markerOpacity = 0.9;
      markerScale = 1.0;
    }

    const defaultStyleFallback = {
      type: 'circle' as const,
      size: 10,
      color: '#8C342D',
      strokeColor: '#FFFFFF',
      strokeWidth: 2,
      pulse: true,
      glow: false,
    };

    const mergedMarkerStyle = {
      ...defaultStyleFallback,
      ...defaultMarkerStyle,
      ...(stop.markerStyle || {}),
    };

    stopSceneStates.push({
      stopId: stop.id,
      stop,
      state,
      markerOpacity,
      markerScale,
      pulseScale,
      pulseOpacity,
      style: mergedMarkerStyle,
    });
  }

  // Calculate Camera Scene State
  const camera = calculateDeterministicCamera(
    project,
    t,
    schedule,
    headPosition,
    activeSegmentIndex
  );

  // Calculate Labels Scene State (strictly deduplicated by stop ID)
  const labels = calculateDeterministicLabels(
    project,
    t,
    schedule,
    activeSegmentIndex
  );

  // Calculate Transport Scene State
  const activeSeg = segments[activeSegmentIndex] || segments[0];
  const vehicleConfig = activeSeg?.vehicle || segments[0]?.vehicle;
  const showVehicle = vehicleConfig?.enabled ?? true;

  const startStopPos: LngLatTuple | null = stops.length > 0 ? [stops[0].coordinates.lng, stops[0].coordinates.lat] : null;
  const startHeading = stops.length > 1 ? calculateBearing(stops[0].coordinates, stops[1].coordinates) : 0;

  const transport: TransportSceneState = {
    visible: showVehicle && (headPosition !== null || (startStopPos !== null && t <= schedule.routeEndTime)),
    position: headPosition || startStopPos || [0, 0],
    heading: headPosition ? headHeading : startHeading,
    icon: vehicleConfig?.icon || 'vintageCar',
    size: vehicleConfig?.size || 26,
    color: vehicleConfig?.color || '#F7F3E8',
  };

  // Calculate Overlay Titles Scene State
  const titles: TitleSceneState[] = [];
  for (const title of project.overlays.titles) {
    const isOutro = title.id === 'title_outro' || title.id.toLowerCase().includes('outro') || title.id.toLowerCase().includes('closing');
    // An outro title is anchored to the conclusion of the video (destination arrival & outro phase)
    const startTime = isOutro
      ? Math.max(schedule.outroStartTime, duration - (title.duration || 2.0))
      : title.startTime;
    const end = isOutro ? duration : startTime + title.duration;

    if (t >= startTime && t <= end) {
      const relTime = t - startTime;
      const effectiveDuration = end - startTime;
      let opacity = 1;
      let translateY = 0;
      let scale = 1;

      // Enter animation (first 0.5s)
      if (relTime < 0.5 && title.animation !== 'none') {
        const enterT = relTime / 0.5;
        if (title.animation === 'fade') {
          opacity = enterT;
        } else if (title.animation === 'slideUp') {
          opacity = enterT;
          translateY = lerp(20, 0, enterT);
        } else if (title.animation === 'scale') {
          opacity = enterT;
          scale = lerp(0.8, 1, enterT);
        }
      }
      // Exit animation (last 0.5s, only for mid-journey/intro titles; outro titles hold until video end)
      else if (!isOutro && title.animation !== 'none' && relTime > effectiveDuration - 0.5) {
        const exitT = (effectiveDuration - relTime) / 0.5;
        opacity = exitT;
      }

      titles.push({
        title,
        opacity,
        translateY,
        scale,
      });
    }
  }

  // Calculate Active Photo Scene State
  let activePhoto: PhotoSceneState | null = null;
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (stop.photo && stop.photo.displayMode !== 'disabled') {
      const stopSlot = schedule.stops[i];
      const arrival = stopSlot?.arrivalTime ?? 0;
      const photoDuration = stop.photo.durationSeconds || 2.0;
      if (t >= arrival && t <= arrival + photoDuration) {
        const photoRel = t - arrival;
        let opacity = 1;
        let scale = 1;
        if (photoRel < 0.3) {
          opacity = photoRel / 0.3;
          scale = lerp(0.8, 1.0, opacity);
        } else if (photoRel > photoDuration - 0.3) {
          opacity = (photoDuration - photoRel) / 0.3;
        }
        activePhoto = {
          photo: stop.photo,
          stopName: stop.displayName || stop.canonicalName,
          opacity,
          scale,
        };
        break;
      }
    }
  }

  const currentStop = stops[activeSegmentIndex + 1] || stops[0];

  return {
    time: t,
    totalDuration: duration,
    progress,
    camera,
    route: {
      activeSegmentIndex,
      segmentProgress: activeSegmentProgress,
      drawnPolylines,
      headPosition,
      headHeading,
      totalDistanceTravelledMeters: totalDistanceTravelled,
      totalRouteDistanceMeters: totalRouteDistance,
    },
    stops: stopSceneStates,
    labels,
    transport,
    titles,
    activePhoto,
    effects: project.effects,
    debug: {
      currentStopName: currentStop?.displayName,
      activeSegmentName: activeSeg ? `${activeSeg.startStopId} → ${activeSeg.endStopId}` : undefined,
    },
  };
}
