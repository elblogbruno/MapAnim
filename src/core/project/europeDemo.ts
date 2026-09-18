import { ProjectData } from '../types/project';
import { LngLatTuple } from '../types/geo';
import { createCinematicArc } from '../math/polyline';
import { geodesicDistance } from '../math/geo';

const EUROPE_STOPS = [
  { id: 'stop_paris', canonicalName: 'Paris, Île-de-France, France', displayName: 'PARIS', coords: [2.3522, 48.8566] as LngLatTuple, behavior: 'highlight' as const },
  { id: 'stop_lyon', canonicalName: 'Lyon, Auvergne-Rhône-Alpes, France', displayName: 'LYON', coords: [4.8357, 45.7640] as LngLatTuple, behavior: 'passThrough' as const },
  { id: 'stop_geneva', canonicalName: 'Geneva, Switzerland', displayName: 'GENEVA', coords: [6.1432, 46.2044] as LngLatTuple, behavior: 'highlight' as const },
  { id: 'stop_milan', canonicalName: 'Milan, Lombardy, Italy', displayName: 'MILAN', coords: [9.1900, 45.4642] as LngLatTuple, behavior: 'passThrough' as const },
  { id: 'stop_rome', canonicalName: 'Rome, Lazio, Italy', displayName: 'ROME', coords: [12.4964, 41.9028] as LngLatTuple, behavior: 'highlight' as const },
];

export function createEuropeDemoProject(): ProjectData {
  const stops = EUROPE_STOPS.map((s, idx) => ({
    id: s.id,
    canonicalName: s.canonicalName,
    displayName: s.displayName,
    coordinates: { lng: s.coords[0], lat: s.coords[1] },
    visible: true,
    behavior: s.behavior,
    pauseDuration: s.behavior === 'highlight' ? 0.4 : 0,
    cameraPriority: idx === 0 || idx === EUROPE_STOPS.length - 1 ? 1 : 2,
    labelPriority: idx === 0 || idx === EUROPE_STOPS.length - 1 ? 1 : 2,
    markerStyle: {
      type: 'circle' as const,
      size: 10,
      color: '#3B82F6',
      strokeColor: '#FFFFFF',
      strokeWidth: 2,
      pulse: true,
      glow: false,
    },
    labelStyle: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      fontWeight: '700',
      color: '#0F172A',
      backgroundColor: '#FFFFFF',
      borderColor: '#CBD5E1',
      borderWidth: 1,
      borderRadius: 4,
      paddingX: 10,
      paddingY: 5,
      uppercase: true,
      letterSpacing: 1.2,
      shadow: true,
      leaderLine: true,
      offsetX: 0,
      offsetY: -32,
    },
  }));

  const segments = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    const p1: LngLatTuple = [s1.coordinates.lng, s1.coordinates.lat];
    const p2: LngLatTuple = [s2.coordinates.lng, s2.coordinates.lat];
    const geometry = createCinematicArc(p1, p2, 25, 0.04);
    const distanceMeters = geodesicDistance(s1.coordinates, s2.coordinates) * 1.15;

    segments.push({
      id: `seg_${s1.id}_to_${s2.id}`,
      startStopId: s1.id,
      endStopId: s2.id,
      travelMode: 'car' as const,
      routeMode: 'realRoad' as const,
      geometry,
      distanceMeters,
      color: '#2563EB',
      width: 4,
      vehicle: {
        enabled: true,
        icon: 'car' as const,
        size: 24,
        color: '#FFFFFF',
      },
    });
  }

  return {
    version: 1,
    metadata: {
      id: 'europe_demo_project',
      name: 'Grand European Journey',
      description: 'Scenic road trip from Paris to Rome via the Swiss Alps and Northern Italy.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'Route Motion Studio',
    },
    video: {
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 10.0,
      aspectRatio: '16:9',
      format: 'mp4',
    },
    map: {
      stylePreset: 'cleanLight',
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
        color: '#2563EB',
        width: 4,
        outlineColor: '#FFFFFF',
        outlineWidth: 1.5,
        opacity: 1,
        completedOpacity: 0.9,
        futureVisibility: true,
        lineCap: 'round',
        lineJoin: 'round',
        glow: true,
        glowColor: 'rgba(37, 99, 235, 0.3)',
        glowBlur: 4,
      },
      defaultMarkerStyle: {
        type: 'circle',
        size: 10,
        color: '#2563EB',
        strokeColor: '#FFFFFF',
        strokeWidth: 2,
        pulse: true,
        glow: false,
      },
      defaultLabelStyle: {
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
        borderColor: '#CBD5E1',
        borderWidth: 1,
        borderRadius: 4,
        paddingX: 10,
        paddingY: 5,
        uppercase: true,
        letterSpacing: 1.2,
        shadow: true,
        leaderLine: true,
        offsetX: 0,
        offsetY: -32,
      },
      labelDisplayMode: 'cinematic',
      optimizeOverlappingLabels: true,
      routeEasing: 'cinematic',
    },
    camera: {
      mode: 'cinematicFollow',
      lookAheadFactor: 0.25,
      defaultZoom: 7.0,
      defaultPitch: 15,
      defaultBearing: 0,
      smoothingDuration: 0.8,
      introZoomEnabled: true,
      outroZoomOutEnabled: true,
      outroHoldSeconds: 1.5,
      keyframes: [],
    },
    effects: {
      paperTexture: false,
      paperOpacity: 0,
      vignette: true,
      vignetteStrength: 0.15,
      filmGrain: false,
      filmGrainOpacity: 0,
      colorGrade: 'none',
    },
    overlays: {
      titles: [
        {
          id: 'title_euro_intro',
          text: 'GRAND TOUR',
          subtitle: 'PARIS TO ROME • 2025',
          startTime: 0.1,
          duration: 2.0,
          position: 'top',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 36,
          color: '#0F172A',
          animation: 'fade',
        },
      ],
      safeAreaGuides: false,
      showDistanceIndicator: true,
      distanceUnit: 'km',
    },
  };
}
