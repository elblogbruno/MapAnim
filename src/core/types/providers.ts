import { Coordinates, LngLatTuple, TravelMode } from './geo';

export interface GeocodingResult {
  id: string;
  canonicalName: string;
  displayName: string;
  coordinates: Coordinates;
  type?: string;
  country?: string;
  region?: string;
}

export interface GeocodingProvider {
  name: string;
  search(query: string): Promise<GeocodingResult[]>;
  reverse?(coordinates: Coordinates): Promise<GeocodingResult | null>;
}

export interface RoutingResult {
  geometry: LngLatTuple[]; // List of [lng, lat]
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
}

export interface RoutingProvider {
  name: string;
  calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: TravelMode
  ): Promise<RoutingResult>;
}

export interface MapStylePreset {
  id: string;
  name: string;
  description: string;
  styleUrl: string | object;
  defaultRouteColor: string;
  defaultLabelBg: string;
  defaultLabelColor: string;
  previewThumbnail?: string;
}

export interface MapStyleProvider {
  getPresets(): MapStylePreset[];
  getStyle(presetId: string): string | object;
}
