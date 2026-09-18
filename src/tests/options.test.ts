import { describe, expect, it } from 'vitest';
import { getSceneAtTime } from '../core/engine/animationEngine';
import { calculateTimelineSchedule } from '../core/engine/timingEngine';
import { geodesicDistance } from '../core/math/geo';
import { createRoute66Project } from '../core/project/route66Demo';
import { getMapLayerVisibility } from '../core/providers/mapStyles/styleRegistry';
import { parseGeoJson } from '../core/providers/routing/gpxGeojsonProvider';
import { migrateProject } from '../core/project/migrations';
import { getRenderDimensions } from '../core/project/video';

describe('editor options', () => {
  it('produces valid scenes for every exposed camera, easing, label and title mode', () => {
    const project = createRoute66Project();
    for (const mode of ['cinematicFollow', 'follow', 'segmentFit', 'staticOverview'] as const) {
      project.camera.mode = mode;
      const scene = getSceneAtTime(project, 6);
      expect(scene.camera.center.every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(scene.camera.zoom)).toBe(true);
    }
    for (const easing of ['cinematic', 'easeInOut', 'linear', 'easeIn', 'easeOut'] as const) {
      project.route.routeEasing = easing;
      expect(Number.isFinite(getSceneAtTime(project, 6).route.segmentProgress)).toBe(true);
    }
    for (const displayMode of ['cinematic', 'visited', 'current', 'all'] as const) {
      project.route.labelDisplayMode = displayMode;
      expect(getSceneAtTime(project, 6).labels.length).toBeGreaterThan(0);
    }
    for (const animation of ['fade', 'slideUp', 'scale', 'none'] as const) {
      project.overlays.titles[0].animation = animation;
      expect(getSceneAtTime(project, 0.2).titles[0].opacity).toBeGreaterThanOrEqual(0);
    }
  });

  it('makes direct follow center the camera on the vehicle', () => {
    const project = createRoute66Project();
    const slot = calculateTimelineSchedule(project).segments[0];
    const time = (slot.travelStartTime + slot.travelEndTime) / 2;

    project.camera.mode = 'follow';
    const direct = getSceneAtTime(project, time);
    expect(geodesicDistance(direct.camera.center, direct.route.headPosition!)).toBeLessThan(0.01);

    project.camera.mode = 'cinematicFollow';
    const cinematic = getSceneAtTime(project, time);
    expect(geodesicDistance(cinematic.camera.center, cinematic.route.headPosition!)).toBeGreaterThan(1000);
  });

  it('keeps animated route geometries valid at segment boundaries', () => {
    const project = createRoute66Project();
    const schedule = calculateTimelineSchedule(project);
    const times = [0, schedule.routeStartTime, ...schedule.segments.map(slot => slot.startTime)];

    for (const time of times) {
      const scene = getSceneAtTime(project, time);
      expect(scene.route.drawnPolylines.every(poly => poly.coordinates.length >= 2)).toBe(true);
    }
  });

  it('keeps future connectors visibly distinct from the active route', () => {
    const scene = getSceneAtTime(createRoute66Project(), 6);
    const future = scene.route.drawnPolylines.filter(poly => poly.opacity < 1);
    expect(future.length).toBeGreaterThan(0);
    expect(future.every(poly => poly.opacity >= 0.35 && poly.width >= 2)).toBe(true);
  });

  it('maps every basemap feature switch to matching layer visibility', () => {
    const features = createRoute66Project().map.features;
    expect(getMapLayerVisibility({ id: 'boundary_state', type: 'line' }, features)).toBe(true);
    expect(getMapLayerVisibility({ id: 'boundary_country', type: 'line' }, { ...features, showCountryBorders: false })).toBe(false);
    expect(getMapLayerVisibility({ id: 'road_motorway', type: 'line', 'source-layer': 'transportation' }, { ...features, showHighways: false })).toBe(false);
    expect(getMapLayerVisibility({ id: 'road_minor', type: 'line', 'source-layer': 'transportation' }, { ...features, showRoads: false })).toBe(false);
    expect(getMapLayerVisibility({ id: 'waterway_label', type: 'symbol' }, { ...features, showWaterLabels: true, cinematicClean: false })).toBe(true);
    expect(getMapLayerVisibility({ id: 'poi_label', type: 'symbol' }, { ...features, showPOIs: true, cinematicClean: true })).toBe(false);
    expect(getMapLayerVisibility({ id: 'hillshade', type: 'hillshade' }, { ...features, showTerrainRelief: false })).toBe(false);
  });

  it('honors instant titles and stop photo display', () => {
    const project = createRoute66Project();
    project.overlays.titles[0].animation = 'none';
    project.route.stops[0].photo = {
      id: 'photo-1',
      url: 'data:image/png;base64,AA==',
      displayMode: 'fullscreen',
      durationSeconds: 2,
    };

    expect(getSceneAtTime(project, 2.15).titles[0].opacity).toBe(1);
    expect(getSceneAtTime(project, 0.2).activePhoto?.photo.displayMode).toBe('fullscreen');
  });

  it('rejects invalid imported coordinates without losing valid ones', () => {
    const parsed = parseGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [500, 95] } },
        { type: 'Feature', properties: { name: 'Valid' }, geometry: { type: 'Point', coordinates: [-3.7, 40.4] } },
        { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[-3.7, 40.4], ['bad', 0]] } },
      ],
    });

    expect(parsed.waypoints).toHaveLength(1);
    expect(parsed.tracks[0].coordinates).toEqual([[-3.7, 40.4]]);
  });

  it('fills missing optional settings in older project files', () => {
    const project = migrateProject({
      version: 1,
      metadata: { id: 'old', name: 'Old project' },
      video: { width: 1280, height: 720, fps: 25, duration: 10, aspectRatio: '16:9', format: 'mp4' },
      route: { stops: [], segments: [] },
    });

    expect(project.map.features.showRoads).toBe(true);
    expect(project.camera.mode).toBe('cinematicFollow');
    expect(project.route.stops).toEqual([]);
  });

  it('preserves every aspect ratio at every export resolution', () => {
    expect(getRenderDimensions(1920, 1080, '720p')).toEqual({ width: 1280, height: 720 });
    expect(getRenderDimensions(1080, 1920, '1080p')).toEqual({ width: 1080, height: 1920 });
    expect(getRenderDimensions(1080, 1080, '4k')).toEqual({ width: 2160, height: 2160 });
    expect(getRenderDimensions(2560, 1080, '4k')).toEqual({ width: 5120, height: 2160 });
  });
});
