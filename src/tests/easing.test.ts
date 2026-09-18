import { describe, it, expect } from 'vitest';
import { Easing, getEasing } from '../core/math/easing';

describe('Deterministic Easing Functions', () => {
  it('ensures all easing functions start at 0 and end at 1', () => {
    const eases = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'cinematic', 'smoothstep', 'smootherstep'] as const;

    for (const key of eases) {
      const fn = getEasing(key);
      expect(fn(0)).toBeCloseTo(0, 5);
      expect(fn(1)).toBeCloseTo(1, 5);
      expect(fn(0.5)).toBeGreaterThan(0);
      expect(fn(0.5)).toBeLessThan(1);
    }
  });

  it('cinematic easing accelerates gently from rest and decelerates smoothly into destination', () => {
    const cinematic = Easing.cinematic;

    // At 10%, slope is gentle
    const t01 = cinematic(0.1);
    expect(t01).toBeLessThan(0.08);

    // At 90%, approaching 1 smoothly
    const t09 = cinematic(0.9);
    expect(t09).toBeGreaterThan(0.92);
  });
});
