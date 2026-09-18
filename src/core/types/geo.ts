/**
 * Geospatial basic types
 */

export interface Coordinates {
  lng: number; // Longitude (-180 to 180)
  lat: number; // Latitude (-90 to 90)
}

export type LngLatTuple = [number, number]; // [lng, lat]

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export type TravelMode = 
  | 'car'
  | 'motorcycle'
  | 'walking'
  | 'train'
  | 'bus'
  | 'airplane'
  | 'boat'
  | 'bicycle'
  | 'none';

export type RouteMode = 
  | 'realRoad'
  | 'direct'
  | 'arc'
  | 'imported'
  | 'custom';

export type StopBehavior = 
  | 'highlight'   // Stop camera, pulse marker, show prominent label
  | 'passThrough' // Don't stop camera, subtle marker, brief label
  | 'pause';      // Hold camera at stop for configured duration
