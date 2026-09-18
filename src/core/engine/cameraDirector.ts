import { ProjectData } from '../types/project';
import { CameraSceneState } from '../types/animation';
import { LngLatTuple } from '../types/geo';
import { ProjectTimelineSchedule } from './timingEngine';
import { calculateBoundingBox, expandBoundingBox, calculateFitZoom } from '../math/geo';
import { interpolateLngLat, interpolateAngle, lerp, clamp } from '../math/interpolation';
import { getEasing } from '../math/easing';
import { pointAlongPolyline, precalculatePolylineDistances } from '../math/polyline';

export function calculateDeterministicCamera(
  project: ProjectData,
  timeSeconds: number,
  schedule: ProjectTimelineSchedule,
  headPosition: LngLatTuple | null,
  activeSegmentIndex: number
): CameraSceneState {
  const { stops, segments } = project.route;
  const cameraSettings = project.camera;
  const video = project.video;

  if (stops.length === 0) {
    return {
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 4,
      pitch: 0,
      bearing: 0,
    };
  }

  // 1. Check if manual keyframes are defined
  if (cameraSettings.mode === 'manualKeyframes' && cameraSettings.keyframes.length > 0) {
    const kfs = [...cameraSettings.keyframes].sort((a, b) => a.time - b.time);
    if (timeSeconds <= kfs[0].time) {
      return {
        center: kfs[0].center,
        zoom: kfs[0].zoom,
        pitch: kfs[0].pitch,
        bearing: kfs[0].bearing,
      };
    }
    if (timeSeconds >= kfs[kfs.length - 1].time) {
      const last = kfs[kfs.length - 1];
      return {
        center: last.center,
        zoom: last.zoom,
        pitch: last.pitch,
        bearing: last.bearing,
      };
    }
    for (let i = 0; i < kfs.length - 1; i++) {
      if (timeSeconds >= kfs[i].time && timeSeconds <= kfs[i + 1].time) {
        const k1 = kfs[i];
        const k2 = kfs[i + 1];
        const rawT = (timeSeconds - k1.time) / (k2.time - k1.time);
        const ease = getEasing(k1.easing || 'cinematic');
        const t = ease(rawT);
        return {
          center: interpolateLngLat(k1.center, k2.center, t),
          zoom: lerp(k1.zoom, k2.zoom, t),
          pitch: lerp(k1.pitch, k2.pitch, t),
          bearing: interpolateAngle(k1.bearing, k2.bearing, t),
        };
      }
    }
  }

  // 2. Precompute overall route fit
  const allPoints: LngLatTuple[] = stops.map(s => [s.coordinates.lng, s.coordinates.lat]);
  const routeBbox = calculateBoundingBox(allPoints);
  const paddedBbox = expandBoundingBox(routeBbox, 0.20);
  const fullFit = calculateFitZoom(paddedBbox, video.width, video.height);

  const startStop = stops[0];
  const startPos: LngLatTuple = [startStop.coordinates.lng, startStop.coordinates.lat];
  const endStop = stops[stops.length - 1];
  const endPos: LngLatTuple = [endStop.coordinates.lng, endStop.coordinates.lat];

  const defaultZoom = cameraSettings.defaultZoom || 6.5;
  const defaultPitch = cameraSettings.defaultPitch || 0;
  const defaultBearing = cameraSettings.defaultBearing || 0;

  // 3. Static Overview Mode
  if (cameraSettings.mode === 'staticOverview') {
    return {
      center: fullFit.center,
      zoom: fullFit.zoom,
      pitch: defaultPitch,
      bearing: defaultBearing,
    };
  }

  const isGlobe = cameraSettings.projection === 'globe' || project.map.projection === 'globe';
  const spaceAltitude = cameraSettings.spaceZoomLevel ?? (isGlobe ? 1.6 : Math.max(2, defaultZoom - 2.5));

  // 4. Intro Phase (Optional 3D Globe space fly-in or standard zoom-in + Departure City Hold)
  if (timeSeconds < schedule.introEndTime) {
    const introTotal = schedule.introEndTime || 1;
    const introT = clamp(timeSeconds / introTotal, 0, 1);

    if (cameraSettings.introZoomEnabled || cameraSettings.introGlobeSpin || isGlobe) {
      const introStartZoom = isGlobe ? spaceAltitude : Math.max(2, defaultZoom - 3.5);
      const introStartPitch = isGlobe ? 35 : 0;
      const introStartBearing = isGlobe ? defaultBearing - 25 : defaultBearing;

      // 60% of intro time is used for the graceful fly-in dive.
      // The remaining 40% (e.g. ~0.6s) firmly holds on the departure city (e.g. Madrid)
      // so the viewer clearly sees the origin city, marker pin, and stationary vehicle before movement.
      const flyInRatio = 0.60;
      if (introT < flyInRatio) {
        const flyInT = getEasing('easeInOutCubic')(introT / flyInRatio);
        return {
          center: interpolateLngLat(fullFit.center, startPos, flyInT),
          zoom: lerp(introStartZoom, defaultZoom, flyInT),
          pitch: lerp(introStartPitch, defaultPitch, flyInT),
          bearing: interpolateAngle(introStartBearing, defaultBearing, flyInT),
        };
      } else {
        return {
          center: startPos,
          zoom: defaultZoom,
          pitch: defaultPitch,
          bearing: defaultBearing,
        };
      }
    } else {
      return {
        center: startPos,
        zoom: defaultZoom,
        pitch: defaultPitch,
        bearing: defaultBearing,
      };
    }
  }

  // 5. Outro Phase (Destination Arrival Hold + Smooth Overview Reveal)
  if (timeSeconds >= schedule.outroStartTime) {
    if (!cameraSettings.outroZoomOutEnabled) {
      return {
        center: endPos,
        zoom: defaultZoom,
        pitch: defaultPitch,
        bearing: defaultBearing,
      };
    }

    const outroDuration = schedule.outroEndTime - schedule.outroStartTime;
    const outroT = clamp((timeSeconds - schedule.outroStartTime) / (outroDuration || 1), 0, 1);

    // Hold close up on the destination for the first 35% of outro (~0.8s)
    // Allows the arrival pulse animation to finish and viewer to celebrate reaching destination
    const holdRatio = 0.35;
    let t = 0;
    if (outroT > holdRatio) {
      const pullbackProgress = (outroT - holdRatio) / (1 - holdRatio);
      t = getEasing('easeInOutCubic')(pullbackProgress);
    }

    const targetOutroZoom = isGlobe ? spaceAltitude : fullFit.zoom;
    const targetOutroPitch = isGlobe ? 30 : 0;
    const targetOutroBearing = isGlobe ? 0 : 0;

    return {
      center: interpolateLngLat(endPos, fullFit.center, t),
      zoom: lerp(defaultZoom, targetOutroZoom, t),
      pitch: lerp(defaultPitch, targetOutroPitch, t),
      bearing: interpolateAngle(defaultBearing, targetOutroBearing, t),
    };
  }

  // 6. Active Route Traveling Phase (Cinematic Follow)
  const currentSlot = schedule.segments[activeSegmentIndex];
  const activeSeg = segments[activeSegmentIndex];

  if (!activeSeg || !currentSlot || !headPosition) {
    return {
      center: startPos,
      zoom: defaultZoom,
      pitch: defaultPitch,
      bearing: defaultBearing,
    };
  }

  const destinationStop = stops.find(s => s.id === activeSeg.endStopId);
  const destPos: LngLatTuple = destinationStop
    ? [destinationStop.coordinates.lng, destinationStop.coordinates.lat]
    : headPosition;

  const travelDuration = currentSlot.travelEndTime - currentSlot.travelStartTime;
  const travelProgress = clamp((timeSeconds - currentSlot.travelStartTime) / (travelDuration || 1), 0, 1);
  const activeData = precalculatePolylineDistances(activeSeg.geometry);

  const isFlight = activeSeg.travelMode === 'airplane' || activeSeg.vehicle?.icon === 'plane';
  const segDistanceKm = (activeSeg.distanceMeters || activeData.totalLength) / 1000;

  // Calculate dynamic cruising altitude zoom:
  // For long flights / long-distance legs (>800 km), ease out to a cruising altitude
  // showing the globe curvature and route arc over oceans, then descend back to defaultZoom upon arrival.
  let targetZoom = defaultZoom;
  if (isFlight || segDistanceKm > 800) {
    const maxReduction = isFlight
      ? Math.min(2.8, Math.max(1.0, Math.log2(segDistanceKm / 400)))
      : Math.min(1.8, Math.max(0.6, Math.log2(segDistanceKm / 700)));

    let altitudeFactor = 0;
    if (travelProgress < 0.25) {
      altitudeFactor = getEasing('easeInOutCubic')(travelProgress / 0.25);
    } else if (travelProgress <= 0.75) {
      altitudeFactor = 1.0;
    } else {
      altitudeFactor = 1.0 - getEasing('easeInOutCubic')((travelProgress - 0.75) / 0.25);
    }
    targetZoom = defaultZoom - maxReduction * altitudeFactor;
  } else if (project.route.defaultLineStyle.futureVisibility) {
    targetZoom = Math.max(3.5, defaultZoom - 2.5);
  }

  if (cameraSettings.mode === 'segmentFit') {
    const segBbox = calculateBoundingBox([headPosition, destPos]);
    const padded = expandBoundingBox(segBbox, 0.25);
    const segFit = calculateFitZoom(padded, video.width, video.height);
    return {
      center: segFit.center,
      zoom: Math.min(defaultZoom + 1, segFit.zoom),
      pitch: defaultPitch,
      bearing: defaultBearing,
    };
  }

  // Look-ahead calculation:
  // Strictly bounded so the vehicle is ALWAYS kept near the center of the screen
  // (never thrown off-screen into empty ocean water).
  const lookAhead = cameraSettings.mode === 'cinematicFollow'
    ? clamp(cameraSettings.lookAheadFactor ?? 0.25, 0.05, 0.45)
    : 0;

  const rawRamp = clamp((timeSeconds - schedule.routeStartTime) / 0.8, 0, 1);
  const startRamp = getEasing('easeInOut')(rawRamp);

  // Compute visible screen width in meters at the vehicle's current latitude and zoom
  const latRad = (Math.abs(headPosition[1]) * Math.PI) / 180;
  const metersPerPixel = (156543.03 * Math.cos(latRad)) / Math.pow(2, targetZoom);
  const screenWidthMeters = metersPerPixel * (video.width || 1920);

  // Maximum lead distance: never more than 12% of screen width or 120 km
  const maxLeadMeters = Math.min(screenWidthMeters * 0.12, 120000);

  const routeAverageLength = segments.reduce(
    (total, segment) => total + precalculatePolylineDistances(segment.geometry).totalLength,
    0
  ) / Math.max(1, segments.length);

  const easeFn = getEasing(project.route.routeEasing || 'cinematic');
  const activeSegmentProgress = easeFn(travelProgress);

  let targetLead = Math.min(routeAverageLength * lookAhead, maxLeadMeters);
  if (cameraSettings.mode === 'cinematicFollow' && startRamp >= 0.5) {
    targetLead = Math.max(1500, targetLead);
  }

  let distanceAhead = targetLead * startRamp;
  let distanceOnSegment = activeData.totalLength * activeSegmentProgress;
  let lookAheadTarget = headPosition;

  for (let i = activeSegmentIndex; i < segments.length; i++) {
    const segment = segments[i];
    const data = i === activeSegmentIndex ? activeData : precalculatePolylineDistances(segment.geometry);
    const available = Math.max(0, data.totalLength - distanceOnSegment);
    if (distanceAhead <= available) {
      lookAheadTarget = pointAlongPolyline(segment.geometry, distanceOnSegment + distanceAhead, data).point;
      break;
    }
    distanceAhead -= available;
    distanceOnSegment = 0;
    lookAheadTarget = segment.geometry[segment.geometry.length - 1] || lookAheadTarget;
  }

  return {
    center: cameraSettings.mode === 'follow' ? headPosition : lookAheadTarget,
    zoom: targetZoom,
    pitch: defaultPitch,
    bearing: defaultBearing,
  };
}
