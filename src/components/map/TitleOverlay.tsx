import React from 'react';
import { TitleSceneState, PhotoSceneState } from '../../core/types/animation';

interface Props {
  titles: TitleSceneState[];
  photo?: PhotoSceneState | null;
}

const positionClasses = {
  top: 'top-12 left-0 right-0 text-center',
  center: 'inset-0 flex flex-col items-center justify-center text-center',
  bottom: 'bottom-12 left-0 right-0 text-center',
  topLeft: 'top-12 left-12 text-left',
  bottomLeft: 'bottom-12 left-12 text-left',
};

export const TitleOverlay: React.FC<Props> = ({ titles, photo }) => (
  <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
    {titles.map(t => (
      <div
        key={t.title.id}
        data-title={t.title.id}
        className={`absolute ${positionClasses[t.title.position]}`}
        style={{
          opacity: t.opacity,
          transform: `translateY(${t.translateY}px) scale(${t.scale})`,
          transformOrigin: t.title.position.endsWith('Left') ? 'left center' : 'center',
        }}
      >
        <h2
          className="font-bold tracking-widest"
          style={{
            fontFamily: t.title.fontFamily,
            fontSize: `${t.title.fontSize || 38}px`,
            color: t.title.color || '#2B2724',
            textShadow: '0 2px 10px rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {t.title.text}
        </h2>
        {t.title.subtitle && (
          <p
            className="font-medium tracking-widest text-xs uppercase mt-1 opacity-90"
            style={{
              color: t.title.color || '#2B2724',
              textShadow: '0 1px 4px rgba(255,255,255,0.8)',
            }}
          >
            {t.title.subtitle}
          </p>
        )}
      </div>
    ))}

    {photo && photo.photo.displayMode === 'fullscreen' ? (
      <div
        className="absolute inset-0 z-20 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          opacity: photo.opacity,
          transform: `scale(${photo.scale})`,
        }}
      >
        <img
          src={photo.photo.url}
          alt={photo.stopName}
          className="w-full h-full object-cover scale-105 transition-transform duration-3000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        <div className="absolute bottom-10 left-8 right-8 text-white">
          <p className="text-xl font-bold tracking-wide drop-shadow-md">{photo.stopName}</p>
          {photo.photo.caption && (
            <p className="text-sm text-white/90 mt-1 drop-shadow font-light">{photo.photo.caption}</p>
          )}
        </div>
      </div>
    ) : photo && photo.photo.displayMode === 'polaroid' ? (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{
          opacity: photo.opacity,
          transform: `scale(${photo.scale})`,
        }}
      >
        <div className="bg-white p-3.5 pb-5 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-amber-900/10 max-w-xs rotate-[-1.5deg] flex flex-col items-center animate-fade-in">
          <div className="w-64 h-52 overflow-hidden bg-studio-950">
            <img
              src={photo.photo.url}
              alt={photo.stopName}
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
            />
          </div>
          <p className="mt-3 font-serif text-sm font-bold text-gray-900 tracking-wide text-center">
            {photo.photo.caption || photo.stopName}
          </p>
        </div>
      </div>
    ) : photo ? (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{
          opacity: photo.opacity,
          transform: `scale(${photo.scale})`,
        }}
      >
        <div className="bg-studio-950/90 backdrop-blur-xl border border-white/20 p-2.5 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] max-w-sm w-[90%] sm:w-80 flex flex-col overflow-hidden animate-fade-in">
          <div className="w-full h-44 rounded-xl overflow-hidden relative bg-studio-900">
            <img
              src={photo.photo.url}
              alt={photo.stopName}
              className="w-full h-full object-cover transform scale-100 hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <span className="text-[10px] uppercase font-mono tracking-wider text-accent-300 font-bold bg-black/40 px-1.5 py-0.5 rounded">
                Parada
              </span>
              <p className="text-sm font-bold truncate mt-0.5 drop-shadow">
                {photo.stopName}
              </p>
            </div>
          </div>
          {photo.photo.caption && (
            <p className="px-1.5 pt-2 pb-1 text-xs text-studio-300 leading-relaxed font-medium text-center">
              {photo.photo.caption}
            </p>
          )}
        </div>
      </div>
    ) : null}
  </div>
);
