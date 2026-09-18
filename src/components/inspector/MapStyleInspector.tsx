import React from 'react';
import { Globe, Map, Sparkles, Check } from 'lucide-react';
import { MAP_STYLE_PRESETS } from '../../core/providers/mapStyles/styleRegistry';
import { MASTER_THEMES } from '../../core/providers/masterThemes';
import { useProjectStore } from '../../store/useProjectStore';

export const MapStyleInspector: React.FC = () => {
  const { project, setProject, updateMapSettings, applyMasterTheme } = useProjectStore();
  const currentStyleId = project.map.stylePreset;
  const features = project.map.features;
  const isGlobe = project.map.projection === 'globe' || project.camera.projection === 'globe';

  const setProjection = (proj: 'globe' | 'mercator') => {
    setProject({ ...project, map: { ...project.map, projection: proj }, camera: { ...project.camera, projection: proj } });
  };

  const selectStyle = (preset: (typeof MAP_STYLE_PRESETS)[number]) => {
    setProject({
      ...project,
      map: { ...project.map, stylePreset: preset.id as any },
      route: {
        ...project.route,
        defaultLineStyle: { ...project.route.defaultLineStyle, color: preset.defaultRouteColor },
        segments: project.route.segments.map(segment => ({ ...segment, color: preset.defaultRouteColor })),
        defaultLabelStyle: { ...project.route.defaultLabelStyle, backgroundColor: preset.defaultLabelBg, color: preset.defaultLabelColor },
        stops: project.route.stops.map(stop => ({
          ...stop,
          labelStyle: { ...stop.labelStyle, backgroundColor: preset.defaultLabelBg, color: preset.defaultLabelColor },
        })),
      },
    });
  };

  return (
    <div className="space-y-4 p-3.5 sm:p-4 text-xs">
      {/* 1. Master Visual Themes Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-studio-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-400" />
            <span>Temas Visuales Completos</span>
          </label>
          <span className="text-[10px] text-accent-400 font-semibold bg-accent-950/60 px-2 py-0.5 rounded-full border border-accent-800/40">
            1-Click
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MASTER_THEMES.map(theme => {
            const isCurrent =
              project.map.stylePreset === theme.mapStyleId &&
              project.route.defaultLineStyle.color.toLowerCase() === theme.routeColor.toLowerCase();

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyMasterTheme(theme.id)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[64px] ${
                  isCurrent
                    ? 'bg-accent-600/25 border-accent-500 text-white shadow-md shadow-accent-600/10 ring-1 ring-accent-500/30'
                    : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{theme.iconEmoji}</span>
                  {isCurrent && <Check className="w-4 h-4 text-accent-400" />}
                </div>
                <span className="font-bold text-xs text-studio-100 block truncate">{theme.name}</span>
                <span className="text-[10px] text-studio-400 block truncate mt-0.5">{theme.badge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Projection Selector Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Proyección del Mundo
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProjection('globe')}
            className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
              isGlobe
                ? 'bg-accent-600/25 border-accent-500 text-white shadow-md shadow-accent-600/10 ring-1 ring-accent-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <Globe className={`w-5 h-5 flex-shrink-0 ${isGlobe ? 'text-accent-400' : 'text-studio-500'}`} />
            <div>
              <span className="font-bold text-xs block text-studio-100">Globo 3D</span>
              <span className="text-[10px] text-studio-400">Tierra esférica</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setProjection('mercator')}
            className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
              !isGlobe
                ? 'bg-accent-600/25 border-accent-500 text-white shadow-md shadow-accent-600/10 ring-1 ring-accent-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <Map className={`w-5 h-5 flex-shrink-0 ${!isGlobe ? 'text-accent-400' : 'text-studio-500'}`} />
            <div>
              <span className="font-bold text-xs block text-studio-100">Mapa 2D Plano</span>
              <span className="text-[10px] text-studio-400">Mercator clásico</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Cartography Style Presets Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Estilo Cartográfico Base
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MAP_STYLE_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => selectStyle(preset)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[68px] ${
                currentStyleId === preset.id
                  ? 'bg-accent-600/20 border-accent-500 text-studio-100 shadow-md ring-1 ring-accent-500/30'
                  : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
              }`}
            >
              <span className="font-bold text-xs text-studio-100">{preset.name}</span>
              <span className="text-[10px] text-studio-400 line-clamp-2 mt-1 leading-relaxed">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Feature Layers Toggles Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Capas del Mapa
        </h4>

        <label className="flex items-center justify-between cursor-pointer py-1">
          <span className="text-studio-300 font-medium">Límites Estatales / Provinciales</span>
          <input
            type="checkbox"
            checked={features.showStateBorders}
            onChange={e =>
              updateMapSettings({
                features: { ...features, showStateBorders: e.target.checked },
              })
            }
            className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer py-1 border-t border-studio-800/60">
          <span className="text-studio-300 font-medium">Fronteras Internacionales</span>
          <input
            type="checkbox"
            checked={features.showCountryBorders}
            onChange={e =>
              updateMapSettings({
                features: { ...features, showCountryBorders: e.target.checked },
              })
            }
            className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer py-1 border-t border-studio-800/60">
          <span className="text-studio-300 font-medium">Sombreado de Relieve / Montañas</span>
          <input
            type="checkbox"
            checked={features.showTerrainRelief}
            onChange={e =>
              updateMapSettings({
                features: { ...features, showTerrainRelief: e.target.checked },
              })
            }
            className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer py-1 border-t border-studio-800/60">
          <div>
            <span className="text-studio-300 font-medium block">Modo Limpio Cinemático</span>
            <span className="text-[10px] text-studio-400">Oculta etiquetas de ciudades irrelevantes</span>
          </div>
          <input
            type="checkbox"
            checked={features.cinematicClean}
            onChange={e =>
              updateMapSettings({
                features: { ...features, cinematicClean: e.target.checked },
              })
            }
            className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
