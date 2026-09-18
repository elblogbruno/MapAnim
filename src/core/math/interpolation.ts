import { LngLatTuple } from '../types/geo';
import { CameraSceneState } from '../types/animation';
import { getEasing, EasingType } from './easing';
import { wrapLongitude } from './geo';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(min: number, max: number, val: number): number {
  if (Math.abs(max - min) < 1e-9) return 0;
  return clamp((val - min) / (max - min), 0, 1);
}

/**
 * Interpolates between two longitude/latitude points, taking the shortest circular route across antimeridian
 */
export function interpolateLngLat(p1: LngLatTuple, p2: LngLatTuple, t: number): LngLatTuple {
  let lng1 = p1[0];
  let lng2 = p2[0];

  // Adjust for antimeridian jump
  if (lng2 - lng1 > 180) {
    lng1 += 360;
  } else if (lng1 - lng2 > 180) {
    lng2 += 360;
  }

  const lng = wrapLongitude(lerp(lng1, lng2, t));
  const lat = lerp(p1[1], p2[1], t);

  return [lng, lat];
}

/**
 * Smooth angle interpolation (in degrees), handling wrap-around between 359° and 0°
 */
export function interpolateAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (a + diff * t + 360) % 360;
}

/**
 * Interpolates between two camera states
 */
export function interpolateCamera(
  camA: CameraSceneState,
  camB: CameraSceneState,
  progress: number,
  easing: EasingType = 'cinematic'
): CameraSceneState {
  const easeFn = getEasing(easing);
  const t = easeFn(clamp(progress, 0, 1));

  return {
    center: interpolateLngLat(camA.center, camB.center, t),
    zoom: lerp(camA.zoom, camB.zoom, t),
    pitch: lerp(camA.pitch, camB.pitch, t),
    bearing: interpolateAngle(camA.bearing, camB.bearing, t),
  };
}

/**
 * Interpolate hex colors (e.g. #8C342D to #F7F3E8)
 */
export function interpolateColor(colorA: string, colorB: string, t: number): string {
  const parseHex = (hex: string) => {
    const cleaned = hex.replace('#', '');
    const num = parseInt(cleaned.length === 3 ? cleaned.split('').map(c => c + c).join('') : cleaned, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const c1 = parseHex(colorA);
  const c2 = parseHex(colorB);

  const r = Math.round(lerp(c1.r, c2.r, t));
  const g = Math.round(lerp(c1.g, c2.g, t));
  const b = Math.round(lerp(c1.b, c2.b, t));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
