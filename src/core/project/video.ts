import { AspectRatio } from '../types/project';

export type RenderResolution = '720p' | '1080p' | '4k';

/**
 * Returns clean, even pixel dimensions for rendering video exports.
 * Guarantees even numbers for H.264/ProRes compatibility and strict compliance with aspect ratio.
 */
export function getRenderDimensions(
  width: number,
  height: number,
  resolution: RenderResolution,
  aspectRatio?: AspectRatio
): { width: number; height: number } {
  const shortEdge = resolution === '720p' ? 720 : resolution === '4k' ? 2160 : 1080;

  let aspect: number;
  if (aspectRatio === '9:16') {
    aspect = 9 / 16;
  } else if (aspectRatio === '1:1') {
    aspect = 1;
  } else if (aspectRatio === '4:3') {
    aspect = 4 / 3;
  } else if (aspectRatio === '21:9') {
    aspect = 21 / 9;
  } else if (aspectRatio === '16:9') {
    aspect = 16 / 9;
  } else if (width > 0 && height > 0) {
    aspect = width / height;
  } else {
    aspect = 16 / 9;
  }

  let w: number;
  let h: number;

  if (aspect >= 1) {
    h = shortEdge;
    w = Math.round(shortEdge * aspect);
  } else {
    w = shortEdge;
    h = Math.round(shortEdge / aspect);
  }

  // Ensure dimensions are divisible by 2 (mandatory for H.264/HEVC/ProRes codecs)
  w = w % 2 === 0 ? w : w - 1;
  h = h % 2 === 0 ? h : h - 1;

  return { width: w, height: h };
}

/**
 * Returns standard base dimensions (1080p base) for an aspect ratio.
 */
export function getStandardDimensionsForAspect(
  aspectRatio: AspectRatio,
  baseShortEdge: number = 1080
): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
      return { width: baseShortEdge, height: Math.round((baseShortEdge * 16) / 9) };
    case '1:1':
      return { width: baseShortEdge, height: baseShortEdge };
    case '4:3':
      return { width: Math.round((baseShortEdge * 4) / 3), height: baseShortEdge };
    case '21:9':
      return { width: Math.round((baseShortEdge * 64) / 27), height: baseShortEdge };
    case '16:9':
    default:
      return { width: Math.round((baseShortEdge * 16) / 9), height: baseShortEdge };
  }
}
