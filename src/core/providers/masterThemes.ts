import { ProjectData, CameraMode, MarkerType, HudTheme } from '../types/project';

export interface MasterTheme {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  iconEmoji: string;
  gradient: string;
  accentColor: string;
  mapStyleId: string;
  projection: 'globe' | 'mercator';
  routeColor: string;
  routeWidth: number;
  routeGlow: boolean;
  routeGlowColor: string;
  dashPattern?: number[];
  vehicleIcon: 'car' | 'vintageCar' | 'motorcycle' | 'plane' | 'boat' | 'bus' | 'bicycle' | 'dot';
  vehicleSize: number;
  cameraMode: CameraMode;
  cameraPitch: number;
  cameraZoom: number;
  lookAheadFactor: number;
  markerType: MarkerType;
  markerColor: string;
  labelBg: string;
  labelColor: string;
  hudTheme: HudTheme;
}

export const MASTER_THEMES: MasterTheme[] = [
  {
    id: 'natgeo',
    name: 'National Geographic',
    tagline: 'Warm vintage cartography, dashed red route, classic explorer feel.',
    badge: 'Explorer Classic',
    iconEmoji: '🗺️',
    gradient: 'from-amber-700 via-amber-850 to-stone-900',
    accentColor: '#D97706',
    mapStyleId: 'vintageAmericana',
    projection: 'globe',
    routeColor: '#991B1B',
    routeWidth: 4,
    routeGlow: false,
    routeGlowColor: 'rgba(153, 27, 27, 0.3)',
    dashPattern: [8, 5],
    vehicleIcon: 'plane',
    vehicleSize: 28,
    cameraMode: 'cinematicFollow',
    cameraPitch: 42,
    cameraZoom: 6.5,
    lookAheadFactor: 0.30,
    markerType: 'ring',
    markerColor: '#991B1B',
    labelBg: '#FDFBF7',
    labelColor: '#1C1917',
    hudTheme: 'vintageBadge',
  },
  {
    id: 'topgear',
    name: 'Top Gear Road Trip',
    tagline: 'Dark satellite imagery, vibrant electric orange route & low chase cam.',
    badge: 'High Octane',
    iconEmoji: '🏎️',
    gradient: 'from-orange-600 via-amber-800 to-zinc-950',
    accentColor: '#F97316',
    mapStyleId: 'satellite',
    projection: 'mercator',
    routeColor: '#FF6B00',
    routeWidth: 5,
    routeGlow: true,
    routeGlowColor: 'rgba(255, 107, 0, 0.6)',
    dashPattern: undefined,
    vehicleIcon: 'car',
    vehicleSize: 26,
    cameraMode: 'cinematicFollow',
    cameraPitch: 56,
    cameraZoom: 7.2,
    lookAheadFactor: 0.35,
    markerType: 'pin',
    markerColor: '#FF6B00',
    labelBg: '#09090B',
    labelColor: '#FFFFFF',
    hudTheme: 'techSport',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Night Flight',
    tagline: 'Ultra-dark contrast, glowing neon cyan route and high-altitude 3D globe.',
    badge: 'Futuristic Sci-Fi',
    iconEmoji: '🌆',
    gradient: 'from-cyan-600 via-indigo-900 to-black',
    accentColor: '#06B6D4',
    mapStyleId: 'darkCinema',
    projection: 'globe',
    routeColor: '#00F0FF',
    routeWidth: 4.5,
    routeGlow: true,
    routeGlowColor: 'rgba(0, 240, 255, 0.8)',
    dashPattern: undefined,
    vehicleIcon: 'plane',
    vehicleSize: 28,
    cameraMode: 'cinematicFollow',
    cameraPitch: 48,
    cameraZoom: 6.8,
    lookAheadFactor: 0.32,
    markerType: 'circle',
    markerColor: '#00F0FF',
    labelBg: '#0F172A',
    labelColor: '#00F0FF',
    hudTheme: 'techSport',
  },
  {
    id: 'reelsViral',
    name: 'TikTok / Reels Viral',
    tagline: 'Punchy vivid colors, dynamic fast tracking, modern mobile aesthetic.',
    badge: 'Social Trending',
    iconEmoji: '📱',
    gradient: 'from-rose-600 via-purple-800 to-zinc-950',
    accentColor: '#E11D48',
    mapStyleId: 'cleanLight',
    projection: 'mercator',
    routeColor: '#E11D48',
    routeWidth: 5.5,
    routeGlow: true,
    routeGlowColor: 'rgba(225, 29, 72, 0.4)',
    dashPattern: undefined,
    vehicleIcon: 'vintageCar',
    vehicleSize: 28,
    cameraMode: 'cinematicFollow',
    cameraPitch: 50,
    cameraZoom: 7.5,
    lookAheadFactor: 0.28,
    markerType: 'pin',
    markerColor: '#E11D48',
    labelBg: '#FFFFFF',
    labelColor: '#0F172A',
    hudTheme: 'glassDark',
  },
  {
    id: 'minimalDoc',
    name: 'Documentary Minimal',
    tagline: 'Pure geography, elegant monochrome map, clean typography, bird’s eye view.',
    badge: 'Clean & Refined',
    iconEmoji: '🎬',
    gradient: 'from-slate-700 via-zinc-800 to-zinc-950',
    accentColor: '#38BDF8',
    mapStyleId: 'documentary',
    projection: 'mercator',
    routeColor: '#0284C7',
    routeWidth: 3.5,
    routeGlow: false,
    routeGlowColor: 'rgba(2, 132, 199, 0.2)',
    dashPattern: undefined,
    vehicleIcon: 'dot',
    vehicleSize: 18,
    cameraMode: 'follow',
    cameraPitch: 0,
    cameraZoom: 6.2,
    lookAheadFactor: 0.20,
    markerType: 'circle',
    markerColor: '#0284C7',
    labelBg: '#FFFFFF',
    labelColor: '#0F172A',
    hudTheme: 'minimalClean',
  },
];

/**
 * Applies a curated Master Theme to the entire ProjectData object
 */
export function applyThemeToProject(project: ProjectData, themeId: string): ProjectData {
  const theme = MASTER_THEMES.find(t => t.id === themeId);
  if (!theme) return project;

  return {
    ...project,
    map: {
      ...project.map,
      stylePreset: theme.mapStyleId as any,
      projection: theme.projection,
    },
    camera: {
      ...project.camera,
      mode: theme.cameraMode,
      projection: theme.projection,
      defaultPitch: theme.cameraPitch,
      defaultZoom: theme.cameraZoom,
      lookAheadFactor: theme.lookAheadFactor,
    },
    route: {
      ...project.route,
      defaultLineStyle: {
        ...project.route.defaultLineStyle,
        color: theme.routeColor,
        width: theme.routeWidth,
        glow: theme.routeGlow,
        glowColor: theme.routeGlowColor,
        dashPattern: theme.dashPattern,
      },
      segments: project.route.segments.map(seg => ({
        ...seg,
        color: theme.routeColor,
        width: theme.routeWidth,
        dashPattern: theme.dashPattern,
        vehicle: seg.vehicle
          ? {
              ...seg.vehicle,
              icon: theme.vehicleIcon,
              size: theme.vehicleSize,
              color: '#FFFFFF',
            }
          : undefined,
      })),
      defaultLabelStyle: {
        ...project.route.defaultLabelStyle,
        backgroundColor: theme.labelBg,
        color: theme.labelColor,
      },
      stops: project.route.stops.map(stop => ({
        ...stop,
        markerStyle: {
          ...stop.markerStyle,
          type: theme.markerType,
          color: theme.markerColor,
        },
        labelStyle: {
          ...stop.labelStyle,
          backgroundColor: theme.labelBg,
          color: theme.labelColor,
        },
      })),
    },
    overlays: {
      ...project.overlays,
      distanceHud: project.overlays.distanceHud
        ? {
            ...project.overlays.distanceHud,
            theme: theme.hudTheme,
          }
        : undefined,
    },
  };
}
