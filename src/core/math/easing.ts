/**
 * High quality deterministic easing functions
 */

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutCubic'
  | 'easeOutCubic'
  | 'cinematic'
  | 'smoothstep'
  | 'smootherstep';

export const Easing = {
  linear: (t: number): number => t,

  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => --t * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeIn: (t: number): number => t * t,
  easeOut: (t: number): number => t * (2 - t),
  easeInOut: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  smoothstep: (t: number): number => t * t * (3 - 2 * t),
  smootherstep: (t: number): number => t * t * t * (t * (t * 6 - 15) + 10),

  /**
   * Cinematic Easing:
   * Smooth, gentle acceleration upon departure, steady graceful travel,
   * and a smooth, filmic deceleration approaching destination.
   */
  cinematic: (t: number): number => {
    // Blends smootherstep with a subtle cubic curve
    const s = t * t * t * (t * (t * 6 - 15) + 10);
    const c = t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    return 0.7 * s + 0.3 * c;
  },
};

export function getEasing(type: EasingType = 'cinematic'): (t: number) => number {
  return Easing[type] || Easing.cinematic;
}
