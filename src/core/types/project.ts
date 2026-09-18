import { Coordinates, LngLatTuple, TravelMode, RouteMode, StopBehavior } from './geo';
export type { Coordinates, LngLatTuple, TravelMode, RouteMode, StopBehavior };

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';

export type MarkerType = 'circle' | 'ring' | 'pin' | 'dot' | 'shield' | 'invisible';

export type LabelDisplayMode = 'cinematic' | 'current' | 'visited' | 'all' | 'manual';

export type CameraMode = 
  | 'cinematicFollow' // Smooth look-ahead leading the route
  | 'follow'          // Centered on route head
  | 'segmentFit'      // Framing start and destination
  | 'staticOverview'  // Whole route framing
  | 'globeIntro'      // Zoom from high altitude
  | 'manualKeyframes'; // Custom user keyframes

export interface StopPhoto {
  id: string;
  url: string; // Base64 data URL or external URL
  caption?: string;
  displayMode: 'card' | 'polaroid' | 'fullscreen' | 'disabled';
  durationSeconds: number;
}

export interface StopMarkerStyle {
  type: MarkerType;
  size: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  pulse: boolean;
  glow: boolean;
}

export interface StopLabelStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  uppercase: boolean;
  letterSpacing: number;
  shadow: boolean;
  leaderLine: boolean;
  offsetX: number; // Screen space offset in px
  offsetY: number;
}

export interface RouteStop {
  id: string; // Unique canonical ID (e.g., "stop_chicago_01")
  canonicalName: string; // Full geocoded address (e.g. "Chicago, Illinois, United States")
  displayName: string; // User visible label (e.g. "CHICAGO")
  coordinates: Coordinates;
  visible: boolean;
  behavior: StopBehavior;
  pauseDuration: number; // In seconds
  cameraPriority: number; // 1 = highest, 5 = lowest
  labelPriority: number;  // 1 = highest, 5 = lowest
  markerStyle?: Partial<StopMarkerStyle>;
  labelStyle?: Partial<StopLabelStyle>;
  photo?: StopPhoto;
}

export interface RouteSegment {
  id: string; // e.g. "seg_stop1_to_stop2"
  startStopId: string;
  endStopId: string;
  travelMode: TravelMode;
  routeMode: RouteMode;
  geometry: LngLatTuple[]; // Polyline coordinates [lng, lat]
  distanceMeters: number;
  durationSeconds?: number; // Overrides auto-timing if set
  color?: string;
  width?: number;
  dashPattern?: number[];
  vehicle?: {
    enabled: boolean;
    icon: 'car' | 'vintageCar' | 'motorcycle' | 'plane' | 'boat' | 'bus' | 'bicycle' | 'dot';
    size: number;
    color: string;
    customSvgUrl?: string;
  };
}

export interface CameraKeyframe {
  time: number; // In seconds
  center: LngLatTuple; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  easing?: 'linear' | 'cinematic' | 'easeInOut' | 'easeOut';
}

export interface CameraSettings {
  mode: CameraMode;
  projection?: 'globe' | 'mercator';
  globeAtmosphere?: boolean;
  introGlobeSpin?: boolean;
  spaceZoomLevel?: number; // Space altitude (1.2 to 3.0)
  lookAheadFactor: number; // 0.15 to 0.35
  defaultZoom: number;
  defaultPitch: number;
  defaultBearing: number;
  smoothingDuration: number;
  introZoomEnabled: boolean;
  outroZoomOutEnabled: boolean;
  outroHoldSeconds: number;
  keyframes: CameraKeyframe[];
}

export interface RouteLineStyle {
  color: string;
  width: number;
  outlineColor: string;
  outlineWidth: number;
  opacity: number;
  completedOpacity: number;
  futureVisibility: boolean;
  lineCap: 'round' | 'square' | 'butt';
  lineJoin: 'round' | 'miter' | 'bevel';
  dashPattern?: number[];
  glow: boolean;
  glowColor: string;
  glowBlur: number;
}

export interface MapFeaturesConfig {
  showRoads: boolean;
  showHighways: boolean;
  showBuiltInLabels: boolean;
  showStateBorders: boolean;
  showCountryBorders: boolean;
  showWaterLabels: boolean;
  showPOIs: boolean;
  showTerrainRelief: boolean;
  cinematicClean: boolean; // Suppress noise while keeping geographic structure
}

export interface TextureEffectsConfig {
  paperTexture: boolean;
  paperOpacity: number; // 0 to 0.20
  vignette: boolean;
  vignetteStrength: number;
  filmGrain: boolean;
  filmGrainOpacity: number;
  colorGrade: 'none' | 'vintageWarm' | 'cinematicCold' | 'documentary' | 'sepiaSubtle';
}

export interface OverlayTitle {
  id: string;
  text: string;
  subtitle?: string;
  startTime: number;
  duration: number;
  position: 'center' | 'top' | 'bottom' | 'bottomLeft' | 'topLeft';
  fontFamily: string;
  fontSize: number;
  color: string;
  animation: 'fade' | 'slideUp' | 'scale' | 'none';
}

export interface VideoSettings {
  width: number;
  height: number;
  fps: number; // 24, 25, 30, 60
  duration: number; // Total seconds
  aspectRatio: AspectRatio;
  format: 'mp4' | 'prores' | 'pngSequence' | 'transparentOverlay';
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
}

export type HudPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'topCenter' | 'bottomCenter';
export type HudTheme = 'glassDark' | 'vintageBadge' | 'minimalClean' | 'techSport';

export interface DistanceHudConfig {
  enabled: boolean;
  unit: 'km' | 'miles';
  position: HudPosition;
  theme: HudTheme;
  customLabel?: string;
  showProgressBar?: boolean;
  decimals?: number;
}

export interface OverlaysConfig {
  titles: OverlayTitle[];
  safeAreaGuides: boolean;
  showDistanceIndicator: boolean;
  distanceUnit: 'miles' | 'km' | 'hidden';
  distanceHud?: DistanceHudConfig;
}

export interface ProjectAudioConfig {
  enabled: boolean;
  trackId?: string; // 'acoustic-journey' | 'cinematic-wonder' | 'lofi-wanderlust' | 'epic-adventure' | 'custom'
  trackName?: string;
  url?: string;
  volume: number; // 0..1 (default 0.7)
  fadeIn: number;
  fadeOut: number;
  sfxEnabled?: boolean;
  sfxVolume?: number; // 0..1 (default 0.7)
}

export interface ProjectData {
  version: string | number;
  metadata: ProjectMetadata;
  video: VideoSettings;
  map: {
    stylePreset: 'vintageAmericana' | 'documentary' | 'darkCinema' | 'cleanLight' | 'satellite' | 'minimal';
    projection?: 'globe' | 'mercator';
    customStyleUrl?: string;
    features: MapFeaturesConfig;
  };
  route: {
    stops: RouteStop[];
    segments: RouteSegment[];
    defaultLineStyle: RouteLineStyle;
    defaultMarkerStyle: StopMarkerStyle;
    defaultLabelStyle: StopLabelStyle;
    labelDisplayMode: LabelDisplayMode;
    optimizeOverlappingLabels: boolean;
    routeEasing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'cinematic';
  };
  camera: CameraSettings;
  effects: TextureEffectsConfig;
  overlays: OverlaysConfig;
  audio?: ProjectAudioConfig;
}
