import { ProjectData } from '../types/project';
import { LngLatTuple } from '../types/geo';
import { createCinematicArc } from '../math/polyline';
import { geodesicDistance } from '../math/geo';

// Verified coordinates for Route 66 Demo
const STOPS_DATA = [
  { id: 'stop_01_chicago', canonicalName: 'Chicago, Illinois, United States', displayName: 'CHICAGO', coords: [-87.6298, 41.8781] as LngLatTuple, behavior: 'highlight' as const, labelPriority: 1 },
  { id: 'stop_02_st_louis', canonicalName: 'St. Louis, Missouri, United States', displayName: 'ST. LOUIS', coords: [-90.1994, 38.6270] as LngLatTuple, behavior: 'highlight' as const, labelPriority: 1 },
  { id: 'stop_03_carthage', canonicalName: 'Carthage, Missouri, United States', displayName: 'CARTHAGE', coords: [-94.3094, 37.1764] as LngLatTuple, behavior: 'passThrough' as const, labelPriority: 3 },
  { id: 'stop_04_clinton', canonicalName: 'Clinton, Oklahoma, United States', displayName: 'CLINTON', coords: [-98.9665, 35.5145] as LngLatTuple, behavior: 'passThrough' as const, labelPriority: 3 },
  { id: 'stop_05_tucumcari', canonicalName: 'Tucumcari, New Mexico, United States', displayName: 'TUCUMCARI', coords: [-103.7250, 35.1717] as LngLatTuple, behavior: 'highlight' as const, labelPriority: 2 },
  { id: 'stop_06_grants', canonicalName: 'Grants, New Mexico, United States', displayName: 'GRANTS', coords: [-107.8514, 35.1473] as LngLatTuple, behavior: 'passThrough' as const, labelPriority: 3 },
  { id: 'stop_07_gallup', canonicalName: 'Gallup, New Mexico, United States', displayName: 'GALLUP', coords: [-108.7426, 35.5281] as LngLatTuple, behavior: 'passThrough' as const, labelPriority: 3 },
  { id: 'stop_08_monument_valley', canonicalName: 'Monument Valley, Arizona/Utah, United States', displayName: 'MONUMENT VALLEY', coords: [-110.1735, 36.9980] as LngLatTuple, behavior: 'highlight' as const, labelPriority: 1 },
  { id: 'stop_09_las_vegas', canonicalName: 'Las Vegas, Nevada, United States', displayName: 'LAS VEGAS', coords: [-115.1398, 36.1699] as LngLatTuple, behavior: 'highlight' as const, labelPriority: 1 },
  { id: 'stop_10_los_angeles', canonicalName: 'Los Angeles, California, United States', displayName: 'LOS ANGELES', coords: [-118.2437, 34.0522] as LngLatTuple, behavior: 'passThrough' as const, labelPriority: 2 },
  { id: 'stop_11_santa_monica', canonicalName: 'Santa Monica, California, United States', displayName: 'SANTA MONICA', coords: [-118.4912, 34.0195] as LngLatTuple, behavior: 'highlight' as const, labelPriority: 1 },
];

/**
 * Creates intermediate highway waypoint geometry matching the historic US-66 corridor
 */
function createRoute66Geometry(start: LngLatTuple, end: LngLatTuple, intermediateWaypoints: LngLatTuple[] = []): LngLatTuple[] {
  const allKeyPoints = [start, ...intermediateWaypoints, end];
  const fullGeometry: LngLatTuple[] = [];

  for (let i = 0; i < allKeyPoints.length - 1; i++) {
    const p1 = allKeyPoints[i];
    const p2 = allKeyPoints[i + 1];
    const subArc = createCinematicArc(p1, p2, 12, 0.02);
    if (i > 0) subArc.shift(); // Avoid duplicate joint
    fullGeometry.push(...subArc);
  }

  return fullGeometry;
}

export function createRoute66Project(): ProjectData {
  const stops = STOPS_DATA.map((s, idx) => ({
    id: s.id,
    canonicalName: s.canonicalName,
    displayName: s.displayName,
    coordinates: { lng: s.coords[0], lat: s.coords[1] },
    visible: true,
    behavior: s.behavior,
    pauseDuration: s.behavior === 'highlight' ? 0.35 : 0,
    cameraPriority: s.labelPriority,
    labelPriority: s.labelPriority,
    markerStyle: {
      type: idx === 0 || idx === STOPS_DATA.length - 1 ? 'circle' as const : 'ring' as const,
      size: idx === 0 || idx === STOPS_DATA.length - 1 ? 12 : 9,
      color: '#8C342D',
      strokeColor: '#F7F3E8',
      strokeWidth: 2.5,
      pulse: true,
      glow: false,
    },
    labelStyle: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: idx === 0 || idx === STOPS_DATA.length - 1 ? 14 : 12,
      fontWeight: '800',
      color: '#2B2724',
      backgroundColor: '#F7F3E8',
      borderColor: '#D3C9B4',
      borderWidth: 1.5,
      borderRadius: 4,
      paddingX: 10,
      paddingY: 5,
      uppercase: true,
      letterSpacing: 1.5,
      shadow: true,
      leaderLine: true,
      offsetX: 0,
      offsetY: -34,
    },
  }));

  // Route 66 Highway Waypoints
  const waypointsMap: Record<number, LngLatTuple[]> = {
    0: [[-89.6504, 39.7817]], // Springfield IL
    1: [[-92.1735, 37.9514], [-93.2923, 37.2089]], // Rolla, Springfield MO
    2: [[-94.6275, 36.9856], [-95.9928, 36.1540], [-97.5164, 35.4676]], // Joplin, Tulsa, Oklahoma City
    3: [[-100.2818, 35.2217], [-101.8313, 35.2220]], // Shamrock, Amarillo TX
    4: [[-105.2934, 35.0076], [-106.6504, 35.0844]], // Santa Rosa, Albuquerque NM
    5: [[-108.2000, 35.3000]], // Continental Divide
    6: [[-109.8500, 35.0500], [-110.1500, 36.5000]], // Holbrook to Monument Valley junction
    7: [[-111.4500, 36.8000], [-112.5000, 35.8000], [-114.0500, 35.2000]], // Grand Canyon edge, Kingman
    8: [[-116.0500, 34.9000], [-117.2898, 34.1083]], // Barstow, San Bernardino
    9: [[-118.3500, 34.0500]], // Pasadena / LA Metro
  };

  const segments = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    const p1: LngLatTuple = [s1.coordinates.lng, s1.coordinates.lat];
    const p2: LngLatTuple = [s2.coordinates.lng, s2.coordinates.lat];
    const intermediate = waypointsMap[i] || [];
    const geometry = createRoute66Geometry(p1, p2, intermediate);
    const distanceMeters = geodesicDistance(s1.coordinates, s2.coordinates) * 1.18; // approx driving factor

    segments.push({
      id: `seg_${s1.id}_to_${s2.id}`,
      startStopId: s1.id,
      endStopId: s2.id,
      travelMode: 'car' as const,
      routeMode: 'realRoad' as const,
      geometry,
      distanceMeters,
      color: '#8C342D',
      width: 4.5,
      vehicle: {
        enabled: true,
        icon: 'vintageCar' as const,
        size: 26,
        color: '#F7F3E8',
      },
    });
  }

  return {
    version: 1,
    metadata: {
      id: 'route_66_demo_project',
      name: 'Route 66 — USA 2025',
      description: 'Cinematic journey across historic US Route 66 from Chicago to Santa Monica Pier.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'Route Motion Studio',
    },
    video: {
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 12.0,
      aspectRatio: '16:9',
      format: 'mp4',
    },
    map: {
      stylePreset: 'vintageAmericana',
      features: {
        showRoads: true,
        showHighways: true,
        showBuiltInLabels: false,
        showStateBorders: true,
        showCountryBorders: true,
        showWaterLabels: false,
        showPOIs: false,
        showTerrainRelief: true,
        cinematicClean: true,
      },
    },
    route: {
      stops,
      segments,
      defaultLineStyle: {
        color: '#8C342D',
        width: 4.5,
        outlineColor: '#FFFFFF',
        outlineWidth: 1.5,
        opacity: 1,
        completedOpacity: 0.9,
        futureVisibility: true,
        lineCap: 'round',
        lineJoin: 'round',
        glow: true,
        glowColor: 'rgba(140, 52, 45, 0.4)',
        glowBlur: 6,
      },
      defaultMarkerStyle: {
        type: 'ring',
        size: 10,
        color: '#8C342D',
        strokeColor: '#FFFFFF',
        strokeWidth: 2,
        pulse: true,
        glow: false,
      },
      defaultLabelStyle: {
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 12,
        fontWeight: '800',
        color: '#2B2724',
        backgroundColor: '#F7F3E8',
        borderColor: '#D3C9B4',
        borderWidth: 1.5,
        borderRadius: 4,
        paddingX: 10,
        paddingY: 5,
        uppercase: true,
        letterSpacing: 1.5,
        shadow: true,
        leaderLine: true,
        offsetX: 0,
        offsetY: -34,
      },
      labelDisplayMode: 'cinematic',
      optimizeOverlappingLabels: true,
      routeEasing: 'cinematic',
    },
    camera: {
      mode: 'cinematicFollow',
      lookAheadFactor: 0.28,
      defaultZoom: 6.8,
      defaultPitch: 22,
      defaultBearing: -8,
      smoothingDuration: 0.8,
      introZoomEnabled: true,
      outroZoomOutEnabled: true,
      outroHoldSeconds: 1.8,
      keyframes: [],
    },
    effects: {
      paperTexture: true,
      paperOpacity: 0.07,
      vignette: true,
      vignetteStrength: 0.25,
      filmGrain: true,
      filmGrainOpacity: 0.04,
      colorGrade: 'vintageWarm',
    },
    overlays: {
      titles: [
        {
          id: 'title_intro',
          text: 'ROUTE 66',
          subtitle: 'THE MAIN STREET OF AMERICA • 2025',
          startTime: 0.1,
          duration: 2.2,
          position: 'top',
          fontFamily: 'Cinzel, serif',
          fontSize: 38,
          color: '#2B2724',
          animation: 'fade',
        },
        {
          id: 'title_outro',
          text: 'CHICAGO → SANTA MONICA',
          subtitle: '2,448 MILES COMPLETED',
          startTime: 10.2,
          duration: 1.8,
          position: 'bottom',
          fontFamily: 'Cinzel, serif',
          fontSize: 32,
          color: '#2B2724',
          animation: 'slideUp',
        },
      ],
      safeAreaGuides: false,
      showDistanceIndicator: true,
      distanceUnit: 'miles',
    },
  };
}
