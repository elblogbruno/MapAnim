import { describe, it, expect } from 'vitest';
import {
  precalculatePolylineDistances,
  pointAlongPolyline,
  slicePolylineAtDistance,
  createCinematicArc,
} from '../core/math/polyline';
import { LngLatTuple } from '../core/types/geo';

describe('Polyline Math & Trimming', () => {
  const line: LngLatTuple[] = [
    [-87.6298, 41.8781], // Chicago
    [-90.1994, 38.6270], // St Louis
    [-94.3094, 37.1764], // Carthage
  ];

  it('precalculates distances and total length accurately', () => {
    const data = precalculatePolylineDistances(line);
    expect(data.segmentLengths.length).toBe(2);
    expect(data.cumulativeDistances.length).toBe(3);
    expect(data.totalLength).toBeGreaterThan(700000); // > 700km
  });

  it('finds exact point along polyline at 50% distance', () => {
    const data = precalculatePolylineDistances(line);
    const half = data.totalLength / 2;
    const info = pointAlongPolyline(line, half, data);

    expect(info.point).toBeDefined();
    expect(info.point[0]).toBeLessThan(-87.6298);
    expect(info.point[0]).toBeGreaterThan(-94.3094);
    expect(info.heading).toBeGreaterThan(0);
  });

  it('slices polyline deterministically up to target distance', () => {
    const data = precalculatePolylineDistances(line);
    const quarter = data.totalLength / 4;
    const sliced = slicePolylineAtDistance(line, quarter, data);

    expect(sliced.length).toBe(2);
    expect(sliced[0]).toEqual(line[0]);
  });

  it('generates smooth cinematic arc points', () => {
    const start: LngLatTuple = [-87.6298, 41.8781];
    const end: LngLatTuple = [-118.4912, 34.0195];
    const arc = createCinematicArc(start, end, 30, 0.1);

    expect(arc.length).toBe(31);
    expect(arc[0]).toEqual(start);
    expect(arc[arc.length - 1]).toEqual(end);
  });
});
