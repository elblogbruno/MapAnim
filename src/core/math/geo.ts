import { Coordinates, LngLatTuple, BoundingBox } from '../types/geo';

const EARTH_RADIUS_METERS = 6371008.8; // Mean Earth radius in meters (WGS84)

/**
 * Calculates accurate geodesic (great circle) distance between two points in meters using Haversine formula
 */
export function geodesicDistance(coord1: Coordinates | LngLatTuple, coord2: Coordinates | LngLatTuple): number {
  const [lng1, lat1] = Array.isArray(coord1) ? coord1 : [coord1.lng, coord1.lat];
  const [lng2, lat2] = Array.isArray(coord2) ? coord2 : [coord2.lng, coord2.lat];

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate initial forward bearing from point 1 to point 2 in degrees (0..360)
 */
export function calculateBearing(coord1: Coordinates | LngLatTuple, coord2: Coordinates | LngLatTuple): number {
  const [lng1, lat1] = Array.isArray(coord1) ? coord1 : [coord1.lng, coord1.lat];
  const [lng2, lat2] = Array.isArray(coord2) ? coord2 : [coord2.lng, coord2.lat];

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda1 = (lng1 * Math.PI) / 180;
  const lambda2 = (lng2 * Math.PI) / 180;

  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);

  const theta = Math.atan2(y, x);
  const bearing = (theta * 180) / Math.PI;

  return (bearing + 360) % 360;
}

/**
 * Normalize longitude to -180..180
 */
export function wrapLongitude(lng: number): number {
  while (lng < -180) lng += 360;
  while (lng > 180) lng -= 360;
  return lng;
}

/**
 * Computes bounding box for a set of points
 */
export function calculateBoundingBox(points: (Coordinates | LngLatTuple)[]): BoundingBox {
  if (points.length === 0) {
    return { minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 };
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const pt of points) {
    const [lng, lat] = Array.isArray(pt) ? pt : [pt.lng, pt.lat];
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Expand bounding box by percentage (e.g. 0.15 = 15% padding)
 */
export function expandBoundingBox(box: BoundingBox, paddingPercentage: number = 0.15): BoundingBox {
  const deltaLng = (box.maxLng - box.minLng) * paddingPercentage || 0.05;
  const deltaLat = (box.maxLat - box.minLat) * paddingPercentage || 0.05;

  return {
    minLng: wrapLongitude(box.minLng - deltaLng),
    minLat: Math.max(-85, box.minLat - deltaLat),
    maxLng: wrapLongitude(box.maxLng + deltaLng),
    maxLat: Math.min(85, box.maxLat + deltaLat),
  };
}

/**
 * Calculate zoom level to fit bounding box into viewport dimensions (width, height)
 */
export function calculateFitZoom(
  box: BoundingBox,
  viewportWidth: number,
  viewportHeight: number,
  paddingPx: number = 60
): { center: LngLatTuple; zoom: number } {
  const center: LngLatTuple = [
    (box.minLng + box.maxLng) / 2,
    (box.minLat + box.maxLat) / 2,
  ];

  const lngSpan = Math.abs(box.maxLng - box.minLng);
  const latSpan = Math.abs(box.maxLat - box.minLat);

  const effWidth = Math.max(100, viewportWidth - paddingPx * 2);
  const effHeight = Math.max(100, viewportHeight - paddingPx * 2);

  // Standard web mercator zoom estimation
  const zoomX = Math.log2((effWidth * 360) / (lngSpan * 256 || 1));
  const zoomY = Math.log2((effHeight * 180) / (latSpan * 256 || 1));

  const zoom = Math.min(zoomX, zoomY, 18);
  return {
    center,
    zoom: Math.max(1, Math.min(18, zoom)),
  };
}
