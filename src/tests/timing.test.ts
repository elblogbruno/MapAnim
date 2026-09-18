import { describe, it, expect } from 'vitest';
import { calculateTimelineSchedule } from '../core/engine/timingEngine';
import { getSceneAtTime } from '../core/engine/animationEngine';
import { createRoute66Project } from '../core/project/route66Demo';
import { geodesicDistance } from '../core/math/geo';

describe('Deterministic Timing Engine', () => {
  const project = createRoute66Project();

  it('allocates valid non-overlapping segment intervals across full duration', () => {
    const schedule = calculateTimelineSchedule(project);

    expect(schedule.totalDuration).toBe(project.video.duration);
    expect(schedule.segments.length).toBe(project.route.segments.length);

    let lastEnd = schedule.introEndTime;

    for (const seg of schedule.segments) {
      expect(seg.startTime).toBeGreaterThanOrEqual(lastEnd - 1e-4);
      expect(seg.endTime).toBeGreaterThan(seg.startTime);
      lastEnd = seg.endTime;
    }

    expect(schedule.outroStartTime).toBeCloseTo(lastEnd, 2);
  });

  it('keeps the camera continuous between route segments', () => {
    const schedule = calculateTimelineSchedule(project);

    for (let i = 0; i < schedule.segments.length - 1; i++) {
      const boundary = schedule.segments[i].endTime;
      const before = getSceneAtTime(project, boundary).camera.center;
      const after = getSceneAtTime(project, boundary + 0.000001).camera.center;
      const destination = project.route.stops[i + 1].coordinates;

      expect(geodesicDistance(before, after)).toBeLessThan(10);
      expect(geodesicDistance(before, [destination.lng, destination.lat])).toBeGreaterThan(1000);
    }
  });
});
