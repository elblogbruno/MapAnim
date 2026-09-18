import { Coordinates, LngLatTuple } from './geo';
import { RouteStop, StopMarkerStyle, StopLabelStyle, StopPhoto, OverlayTitle, TextureEffectsConfig } from './project';

export interface DrawnPolyline {
  segmentId: string;
  coordinates: LngLatTuple[];
  color: string;
  width: number;
  opacity: number;
  dashPattern?: number[];
  outlineColor: string;
  outlineWidth: number;
  glow: boolean;
  glowColor: string;
}

export interface StopSceneState {
  stopId: string;
  stop: RouteStop;
  state: 'unvisited' | 'arriving' | 'visited' | 'current';
  markerOpacity: number;
  markerScale: number;
  pulseScale: number;
  pulseOpacity: number;
  style: StopMarkerStyle;
}

export interface LabelSceneState {
  stopId: string; // Unique canonical Stop ID
  displayName: string;
  coordinates: Coordinates;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  leaderLine: boolean;
  visible: boolean;
  style: StopLabelStyle;
  priority: number;
  isCurrent: boolean;
}

export interface TransportSceneState {
  visible: boolean;
  position: LngLatTuple;
  heading: number; // In degrees (0 = North, 90 = East)
  icon: 'car' | 'vintageCar' | 'motorcycle' | 'plane' | 'boat' | 'bus' | 'bicycle' | 'dot';
  size: number;
  color: string;
}

export interface TitleSceneState {
  title: OverlayTitle;
  opacity: number;
  translateY: number;
  scale: number;
}

export interface PhotoSceneState {
  photo: StopPhoto;
  stopName: string;
  opacity: number;
  scale: number;
}

export interface CameraSceneState {
  center: LngLatTuple; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface SceneState {
  time: number; // Time in seconds
  totalDuration: number;
  progress: number; // 0 to 1
  camera: CameraSceneState;
  route: {
    activeSegmentIndex: number;
    segmentProgress: number; // 0 to 1 for active segment
    drawnPolylines: DrawnPolyline[];
    headPosition: LngLatTuple | null;
    headHeading: number;
    totalDistanceTravelledMeters: number;
    totalRouteDistanceMeters: number;
  };
  stops: StopSceneState[];
  labels: LabelSceneState[];
  transport: TransportSceneState;
  titles: TitleSceneState[];
  activePhoto: PhotoSceneState | null;
  effects: TextureEffectsConfig;
  debug?: {
    currentStopName?: string;
    activeSegmentName?: string;
    fps?: number;
    tileReady?: boolean;
  };
}
