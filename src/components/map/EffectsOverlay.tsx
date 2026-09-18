import React from 'react';
import { TextureEffectsConfig } from '../../core/types/project';

interface Props {
  effects: TextureEffectsConfig;
}

export const EffectsOverlay: React.FC<Props> = ({ effects }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* Paper Grain Overlay */}
      {effects.paperTexture && (
        <div
          className="absolute inset-0 mix-blend-multiply pointer-events-none"
          style={{
            opacity: effects.paperOpacity || 0.08,
            backgroundImage: `radial-gradient(#444 1px, transparent 1px), radial-gradient(#222 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px',
          }}
        />
      )}

      {/* Film Grain */}
      {effects.filmGrain && (
        <div
          className="absolute inset-0 mix-blend-overlay pointer-events-none"
          style={{
            opacity: effects.filmGrainOpacity || 0.05,
            background: 'repeating-radial-gradient(circle, #fff, #888 1px, #000 2px)',
            backgroundSize: '4px 4px',
          }}
        />
      )}

      {/* Cinematic Vignette */}
      {effects.vignette && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(15,10,5,${effects.vignetteStrength || 0.35}) 100%)`,
          }}
        />
      )}

      {/* Color Grading Filter */}
      {effects.colorGrade === 'vintageWarm' && (
        <div
          className="absolute inset-0 mix-blend-color pointer-events-none"
          style={{
            backgroundColor: 'rgba(215, 175, 120, 0.08)',
          }}
        />
      )}
      {effects.colorGrade === 'cinematicCold' && (
        <div
          className="absolute inset-0 mix-blend-color pointer-events-none"
          style={{
            backgroundColor: 'rgba(70, 130, 180, 0.08)',
          }}
        />
      )}
    </div>
  );
};
