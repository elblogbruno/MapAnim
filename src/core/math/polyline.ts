import { LngLatTuple } from '../types/geo';
import { geodesicDistance, calculateBearing } from './geo';
import { interpolateLngLat } from './interpolation';

export interface PolylineDistanceData {
  segmentLengths: number[]; // Length in meters of each segment [i, i+1]
  cumulativeDistances: number[]; // Cumulative distance up to vertex i
  totalLength: number; // Total length in meters
}

/**
 * Precalculates lengths and cumulative distances for all segments in a polyline
 */
export function precalculatePolylineDistances(coordinates: LngLatTuple[]): PolylineDistanceData {
  if (coordinates.length < 2) {
    return {
      segmentLengths: [],
      cumulativeDistances: [0],
      totalLength: 0,
    };
  }

  const segmentLengths: number[] = [];
  const cumulativeDistances: number[] = [0];
  let totalLength = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const len = geodesicDistance(coordinates[i], coordinates[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
    cumulativeDistances.push(totalLength);
  }

  return {
    segmentLengths,
    cumulativeDistances,
    totalLength,
  };
}

/**
 * Finds the exact point and forward tangent heading along a polyline at a given distance in meters
 */
export function pointAlongPolyline(
  coordinates: LngLatTuple[],
  distanceMeters: number,
  precalculated?: PolylineDistanceData
): {
  point: LngLatTuple;
  heading: number;
  segmentIndex: number;
  segmentProgress: number;
} {
  if (coordinates.length === 0) {
    return { point: [0, 0], heading: 0, segmentIndex: 0, segmentProgress: 0 };
  }
  if (coordinates.length === 1) {
    return { point: coordinates[0], heading: 0, segmentIndex: 0, segmentProgress: 0 };
  }

  const data = precalculated || precalculatePolylineDistances(coordinates);
  const total = data.totalLength;

  // Clamp distance
  const targetDist = Math.max(0, Math.min(total, distanceMeters));

  if (targetDist <= 0) {
    const heading = calculateBearing(coordinates[0], coordinates[1]);
    return { point: coordinates[0], heading, segmentIndex: 0, segmentProgress: 0 };
  }

  if (targetDist >= total) {
    const lastIdx = coordinates.length - 1;
    const heading = calculateBearing(coordinates[lastIdx - 1], coordinates[lastIdx]);
    return { point: coordinates[lastIdx], heading, segmentIndex: lastIdx - 1, segmentProgress: 1 };
  }

  // Binary search for segment
  const cum = data.cumulativeDistances;
  let low = 0;
  let high = cum.length - 2;
  let segIdx = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (cum[mid] <= targetDist && targetDist <= cum[mid + 1]) {
      segIdx = mid;
      break;
    } else if (cum[mid] > targetDist) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const segStartDist = cum[segIdx];
  const segLen = data.segmentLengths[segIdx] || 1e-6;
  const t = Math.max(0, Math.min(1, (targetDist - segStartDist) / segLen));

  const p1 = coordinates[segIdx];
  const p2 = coordinates[segIdx + 1];

  const point = interpolateLngLat(p1, p2, t);
  const heading = calculateBearing(p1, p2);

  return {
    point,
    heading,
    segmentIndex: segIdx,
    segmentProgress: t,
  };
}

/**
 * Returns the sliced polyline coordinates up to a given distance in meters
 */
export function slicePolylineAtDistance(
  coordinates: LngLatTuple[],
  distanceMeters: number,
  precalculated?: PolylineDistanceData
): LngLatTuple[] {
  if (coordinates.length <= 1) {
    return coordinates.length === 1 ? [coordinates[0], coordinates[0]] : [];
  }
  if (distanceMeters <= 0) {
    return [coordinates[0], coordinates[0]];
  }

  const data = precalculated || precalculatePolylineDistances(coordinates);
  if (distanceMeters >= data.totalLength) {
    return [...coordinates];
  }

  const { point, segmentIndex } = pointAlongPolyline(coordinates, distanceMeters, data);

  const sliced: LngLatTuple[] = coordinates.slice(0, segmentIndex + 1);
  sliced.push(point);

  return sliced;
}

/**
 * Returns the remaining sliced polyline coordinates from a given distance in meters to the end
 */
export function slicePolylineRemaining(
  coordinates: LngLatTuple[],
  distanceMeters: number,
  precalculated?: PolylineDistanceData
): LngLatTuple[] {
  if (coordinates.length <= 1) {
    return [];
  }

  const data = precalculated || precalculatePolylineDistances(coordinates);
  if (distanceMeters >= data.totalLength) {
    return [];
  }
  if (distanceMeters <= 0) {
    return [...coordinates];
  }

  const { point, segmentIndex } = pointAlongPolyline(coordinates, distanceMeters, data);

  const remaining: LngLatTuple[] = [point, ...coordinates.slice(segmentIndex + 1)];
  return remaining;
}

/**
 * Generates a cinematic curved arc (Great Circle path or quadratic bezier arc) between two coordinates
 */
export function createCinematicArc(
  start: LngLatTuple,
  end: LngLatTuple,
  numPoints: number = 50,
  curvature: number = 0.15
): LngLatTuple[] {
  const points: LngLatTuple[] = [];

  const midLng = (start[0] + end[0]) / 2;
  const midLat = (start[1] + end[1]) / 2;

  // Calculate perpendicular vector for lateral bow
  const dLng = end[0] - start[0];
  const dLat = end[1] - start[1];

  // Offset midpoint perpendicularly
  const perpLng = -dLat * curvature;
  const perpLat = dLng * curvature;

  const controlPoint: LngLatTuple = [midLng + perpLng, midLat + perpLat];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;

    // Quadratic Bezier on geographic space
    const lng = invT * invT * start[0] + 2 * invT * t * controlPoint[0] + t * t * end[0];
    const lat = invT * invT * start[1] + 2 * invT * t * controlPoint[1] + t * t * end[1];

    points.push([lng, lat]);
  }

  return points;
}
