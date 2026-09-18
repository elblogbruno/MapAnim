import assert from 'node:assert';
import { geodesicDistance, calculateBearing, wrapLongitude, calculateBoundingBox, calculateFitZoom, expandBoundingBox } from '../src/core/math/geo.js';
import {
  precalculatePolylineDistances,
  pointAlongPolyline,
  slicePolylineAtDistance,
  slicePolylineRemaining,
  createCinematicArc,
} from '../src/core/math/polyline.js';
import { Easing } from '../src/core/math/easing.js';
import { createRoute66Project } from '../src/core/project/route66Demo.js';
import { getSceneAtTime } from '../src/core/engine/animationEngine.js';
import { calculateTimelineSchedule } from '../src/core/engine/timingEngine.js';
import { LngLatTuple } from '../src/core/types/geo.js';
import { getRenderDimensions, getStandardDimensionsForAspect } from '../src/core/project/video.js';

let passed = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n🧪 RUNNING ROUTE MOTION STUDIO UNIT & INVARIANT TESTS...\n');

console.log('--- Geospatial & Geodesic Math ---');
test('calculates accurate distance between Chicago and St. Louis (~418-425 km)', () => {
  const dist = geodesicDistance({ lng: -87.6298, lat: 41.8781 }, { lng: -90.1994, lat: 38.6270 });
  const distKm = dist / 1000;
  assert(distKm >= 415 && distKm <= 430, `Expected ~420km, got ${distKm}`);
});

test('calculates forward bearing from Chicago to St. Louis (~213° SW)', () => {
  const bearing = calculateBearing({ lng: -87.6298, lat: 41.8781 }, { lng: -90.1994, lat: 38.6270 });
  assert(bearing >= 200 && bearing <= 230, `Expected ~213°, got ${bearing}`);
});

test('wraps longitudes properly across antimeridian', () => {
  assert.strictEqual(wrapLongitude(190), -170);
  assert.strictEqual(wrapLongitude(-195), 165);
  assert.strictEqual(wrapLongitude(0), 0);
  assert.strictEqual(wrapLongitude(180), 180);
});

test('computes bounding box for Route 66 endpoints', () => {
  const points: LngLatTuple[] = [
    [-87.6298, 41.8781],
    [-118.4912, 34.0195],
  ];
  const bbox = calculateBoundingBox(points);
  assert.strictEqual(bbox.minLng, -118.4912);
  assert.strictEqual(bbox.maxLng, -87.6298);
  assert.strictEqual(bbox.minLat, 34.0195);
  assert.strictEqual(bbox.maxLat, 41.8781);
});

console.log('\n--- Polyline Math & Distance Trimming ---');
const testLine: LngLatTuple[] = [
  [-87.6298, 41.8781],
  [-90.1994, 38.6270],
  [-94.3094, 37.1764],
];

test('precalculates distances and total length accurately', () => {
  const data = precalculatePolylineDistances(testLine);
  assert.strictEqual(data.segmentLengths.length, 2);
  assert.strictEqual(data.cumulativeDistances.length, 3);
  assert(data.totalLength > 700000);
});

test('finds exact point along polyline at 50% distance', () => {
  const data = precalculatePolylineDistances(testLine);
  const half = data.totalLength / 2;
  const info = pointAlongPolyline(testLine, half, data);
  assert(info.point);
  assert(info.point[0] < -87.6298 && info.point[0] > -94.3094);
});

test('slices polyline deterministically up to target distance', () => {
  const data = precalculatePolylineDistances(testLine);
  const quarter = data.totalLength / 4;
  const sliced = slicePolylineAtDistance(testLine, quarter, data);
  assert.strictEqual(sliced.length, 2);
  assert.deepStrictEqual(sliced[0], testLine[0]);

  // At zero distance, does not return entire multi-point polyline
  const zeroSliced = slicePolylineAtDistance(testLine, 0, data);
  assert.deepStrictEqual(zeroSliced, [testLine[0], testLine[0]]);
});

test('slices remaining polyline from distance to end seamlessly', () => {
  const data = precalculatePolylineDistances(testLine);
  const quarter = data.totalLength / 4;
  const remaining = slicePolylineRemaining(testLine, quarter, data);
  assert.strictEqual(remaining.length, 3);
  assert.deepStrictEqual(remaining[remaining.length - 1], testLine[testLine.length - 1]);

  // Sliced and remaining meet at the exact same point
  const sliced = slicePolylineAtDistance(testLine, quarter, data);
  assert.deepStrictEqual(sliced[sliced.length - 1], remaining[0]);
});

test('generates smooth cinematic arc points', () => {
  const start: LngLatTuple = [-87.6298, 41.8781];
  const end: LngLatTuple = [-118.4912, 34.0195];
  const arc = createCinematicArc(start, end, 30, 0.1);
  assert.strictEqual(arc.length, 31);
  assert.deepStrictEqual(arc[0], start);
  assert.deepStrictEqual(arc[arc.length - 1], end);
});

console.log('\n--- Duplicate Prevention & Canonical Label Invariants ---');
const r66 = createRoute66Project();

test('verifies exact 11 stops in Route 66 project dataset with confirmed coordinates', () => {
  assert.strictEqual(r66.route.stops.length, 11);
  const names = r66.route.stops.map(s => s.displayName);
  assert.deepStrictEqual(names, [
    'CHICAGO',
    'ST. LOUIS',
    'CARTHAGE',
    'CLINTON',
    'TUCUMCARI',
    'GRANTS',
    'GALLUP',
    'MONUMENT VALLEY',
    'LAS VEGAS',
    'LOS ANGELES',
    'SANTA MONICA',
  ]);
});

test('guarantees strictly no duplicate stop labels across all animation timestamps (0..12s)', () => {
  const duration = r66.video.duration;
  for (let t = 0; t <= duration; t += 0.1) {
    const scene = getSceneAtTime(r66, t);
    const seen = new Set<string>();
    for (const label of scene.labels) {
      assert(!seen.has(label.stopId), `Duplicate stop ID "${label.stopId}" found at t=${t.toFixed(2)}s`);
      seen.add(label.stopId);
    }
  }
});

test('produces valid deterministic camera framing at t=intro, t=mid, and t=end', () => {
  const schedule = calculateTimelineSchedule(r66);
  const sceneIntro = getSceneAtTime(r66, 0);
  const sceneChicago = getSceneAtTime(r66, schedule.introEndTime);
  const sceneMid = getSceneAtTime(r66, 6);
  const sceneEnd = getSceneAtTime(r66, r66.video.duration);

  // At t=0, intro shows regional overview
  assert(sceneIntro.camera.center[0] < -90, 'Intro starts at regional overview');
  // By end of intro, camera has zoomed in to Chicago (-87.6)
  assert(sceneChicago.camera.center[0] > -90, 'Camera settles on Chicago at departure');

  // Mid route (New Mexico / Arizona)
  assert(sceneMid.camera.center[0] < -100, 'Mid should be in SW');
  assert(sceneEnd.route.segmentProgress === 1, 'End should reach completion');
});

console.log('\n--- Timing Schedule & Easing ---');
test('allocates valid non-overlapping segment intervals across full duration', () => {
  const schedule = calculateTimelineSchedule(r66);
  assert.strictEqual(schedule.totalDuration, r66.video.duration);
  assert.strictEqual(schedule.segments.length, r66.route.segments.length);

  let lastEnd = schedule.introEndTime;
  for (const seg of schedule.segments) {
    assert(seg.startTime >= lastEnd - 1e-4);
    assert(seg.endTime > seg.startTime);
    lastEnd = seg.endTime;
  }
});

test('cinematic easing accelerates gently from rest and decelerates smoothly into destination', () => {
  const cinematic = Easing.cinematic;
  assert(cinematic(0) === 0);
  assert(cinematic(1) === 1);
  assert(cinematic(0.1) < 0.08, 'Gentle acceleration at start');
  assert(cinematic(0.9) > 0.92, 'Gentle deceleration at end');
});

console.log('\n--- 9:16 Vertical Video & Export Dimensions ---');
test('getStandardDimensionsForAspect produces correct dimensions for 9:16, 16:9, 1:1, 4:3, 21:9', () => {
  const vertical = getStandardDimensionsForAspect('9:16');
  assert.strictEqual(vertical.width, 1080);
  assert.strictEqual(vertical.height, 1920);

  const wide = getStandardDimensionsForAspect('16:9');
  assert.strictEqual(wide.width, 1920);
  assert.strictEqual(wide.height, 1080);

  const square = getStandardDimensionsForAspect('1:1');
  assert.strictEqual(square.width, 1080);
  assert.strictEqual(square.height, 1080);

  const photo = getStandardDimensionsForAspect('4:3');
  assert.strictEqual(photo.width, 1440);
  assert.strictEqual(photo.height, 1080);

  const cinema = getStandardDimensionsForAspect('21:9');
  assert.strictEqual(cinema.width, 2560);
  assert.strictEqual(cinema.height, 1080);
});

test('getRenderDimensions produces even, codec-compliant 9:16 dimensions across all quality profiles', () => {
  const d720p = getRenderDimensions(1080, 1920, '720p', '9:16');
  assert.strictEqual(d720p.width, 720);
  assert.strictEqual(d720p.height, 1280);
  assert.strictEqual(d720p.width % 2, 0);
  assert.strictEqual(d720p.height % 2, 0);

  const d1080p = getRenderDimensions(1080, 1920, '1080p', '9:16');
  assert.strictEqual(d1080p.width, 1080);
  assert.strictEqual(d1080p.height, 1920);
  assert.strictEqual(d1080p.width % 2, 0);
  assert.strictEqual(d1080p.height % 2, 0);

  const d4k = getRenderDimensions(1080, 1920, '4k', '9:16');
  assert.strictEqual(d4k.width, 2160);
  assert.strictEqual(d4k.height, 3840);
  assert.strictEqual(d4k.width % 2, 0);
  assert.strictEqual(d4k.height % 2, 0);
});

test('calculateFitZoom adapts dynamically to vertical 9:16 bounds without clipping route width', () => {
  const allPoints: LngLatTuple[] = r66.route.stops.map(s => [s.coordinates.lng, s.coordinates.lat]);
  const bbox = expandBoundingBox(calculateBoundingBox(allPoints), 0.20);

  const fit16x9 = calculateFitZoom(bbox, 1920, 1080);
  const fit9x16 = calculateFitZoom(bbox, 1080, 1920);

  // In 9:16, the width (1080) is narrower than 16:9 width (1920),
  // so the zoom level for an East-West route like Route 66 must pull back (lower zoom)
  // to prevent Chicago or Los Angeles from being clipped on the edges
  assert(fit9x16.zoom < fit16x9.zoom, '9:16 must zoom out further than 16:9 to accommodate horizontal route span');
  assert(fit9x16.zoom >= 2 && fit9x16.zoom <= 10, 'Calculated 9:16 zoom is within valid Mercator range');
});

console.log(`\n======================================================`);
console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
console.log(`======================================================\n`);

if (passed !== total) {
  process.exit(1);
}
