import { describe, it, expect } from 'vitest';
import { createRoute66Project } from '../core/project/route66Demo';
import { getSceneAtTime } from '../core/engine/animationEngine';

describe('Duplicate-Prevention & Canonical Label Invariants', () => {
  const project = createRoute66Project();

  it('guarantees strictly no duplicate stop labels across all animation timestamps', () => {
    const duration = project.video.duration;
    const step = 0.1; // Check every 100ms

    for (let t = 0; t <= duration; t += step) {
      const scene = getSceneAtTime(project, t);
      const stopIdsSeen = new Set<string>();

      for (const label of scene.labels) {
        // Invariant: Stop ID must be unique
        expect(stopIdsSeen.has(label.stopId)).toBe(false);
        stopIdsSeen.add(label.stopId);

        // Invariant: Display name and coordinates must be valid
        expect(label.displayName).toBeTruthy();
        expect(label.coordinates.lat).toBeGreaterThan(0);
        expect(label.coordinates.lng).toBeLessThan(0);
      }
    }
  });

  it('verifies exact 11 stops in Route 66 project dataset', () => {
    expect(project.route.stops.length).toBe(11);
    const names = project.route.stops.map(s => s.displayName);

    expect(names).toEqual([
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

  it('produces valid camera framing at t=0, t=mid, and t=end', () => {
    const sceneStart = getSceneAtTime(project, 0);
    const sceneMid = getSceneAtTime(project, 6);
    const sceneEnd = getSceneAtTime(project, project.video.duration);

    // Intro starts on a wide overview before flying into Chicago
    expect(sceneStart.camera.zoom).toBeLessThan(sceneMid.camera.zoom);

    // Mid route (New Mexico / Arizona)
    expect(sceneMid.camera.center[0]).toBeLessThan(-100);

    // End route zooms out / reaches Santa Monica
    expect(sceneEnd.camera.center).toBeDefined();
    expect(sceneEnd.route.segmentProgress).toBe(1);
  });
});
