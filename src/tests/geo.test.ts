import { describe, it, expect } from 'vitest';
import { geodesicDistance, calculateBearing, wrapLongitude, calculateBoundingBox } from '../core/math/geo';

describe('Geodesic & Geospatial Math', () => {
  it('calculates accurate distance between Chicago and St. Louis', () => {
    const chicago = { lng: -87.6298, lat: 41.8781 };
    const stLouis = { lng: -90.1994, lat: 38.6270 };
    const distMeters = geodesicDistance(chicago, stLouis);

    // Approx 418 to 425 km
    const distKm = distMeters / 1000;
    expect(distKm).toBeGreaterThan(415);
    expect(distKm).toBeLessThan(430);
  });

  it('calculates forward bearing from Chicago to St. Louis (South-West ~213°)', () => {
    const chicago = { lng: -87.6298, lat: 41.8781 };
    const stLouis = { lng: -90.1994, lat: 38.6270 };
    const bearing = calculateBearing(chicago, stLouis);

    expect(bearing).toBeGreaterThan(200);
    expect(bearing).toBeLessThan(230);
  });

  it('wraps longitudes properly across antimeridian', () => {
    expect(wrapLongitude(190)).toBe(-170);
    expect(wrapLongitude(-195)).toBe(165);
    expect(wrapLongitude(0)).toBe(0);
    expect(wrapLongitude(180)).toBe(180);
  });

  it('computes correct bounding box for points', () => {
    const points = [
      [-87.6298, 41.8781],
      [-118.4912, 34.0195],
      [-90.1994, 38.6270],
    ] as [number, number][];

    const bbox = calculateBoundingBox(points);
    expect(bbox.minLng).toBeCloseTo(-118.4912);
    expect(bbox.maxLng).toBeCloseTo(-87.6298);
    expect(bbox.minLat).toBeCloseTo(34.0195);
    expect(bbox.maxLat).toBeCloseTo(41.8781);
  });
});
