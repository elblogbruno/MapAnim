import React, { useState } from 'react';
import { Globe, Map, Sparkles, RotateCcw, Maximize2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';

export const CameraInspector: React.FC = () => {
  const { project, setProject, updateCamera } = useProjectStore();
  const inspectorMode = useEditorStore(state => state.inspectorMode);
  const resetCameraPosition = useEditorStore(state => state.resetCameraPosition);
  const fitRouteOverview = useEditorStore(state => state.fitRouteOverview);
  const [isManualControlsOpen, setIsManualControlsOpen] = useState(false);
  const camera = project.camera;
  const isGlobe = camera.projection === 'globe' || project.map.projection === 'globe';

  const setProjection = (proj: 'globe' | 'mercator') => {
    setProject({ ...project, map: { ...project.map, projection: proj }, camera: { ...project.camera, projection: proj } });
  };

  return (
    <div className="space-y-4 p-3.5 sm:p-4 text-xs">
      {/* 1. Quick Camera Reset & Framing Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Encuadre Rápido de Cámara
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={resetCameraPosition}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-studio-900 hover:bg-studio-850 text-studio-200 hover:text-white font-semibold border border-studio-750 transition-all shadow-sm active:scale-95 group"
            title="Restablecer posición de cámara al encuadre actual del vídeo"
          >
            <RotateCcw className="w-3.5 h-3.5 text-accent-400 group-hover:-rotate-45 transition-transform" />
            <span className="text-[11px]">Centrar Posición</span>
          </button>

          <button
            type="button"
            onClick={fitRouteOverview}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-studio-900 hover:bg-studio-850 text-studio-200 hover:text-white font-semibold border border-studio-750 transition-all shadow-sm active:scale-95"
            title="Ajustar zoom para ver toda la ruta"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px]">Ruta Completa</span>
          </button>
        </div>
      </div>

      {/* 2. Map Projection Mode Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Proyección del Mapa
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

        {isGlobe && (
          <div className="bg-studio-900/70 border border-studio-800 rounded-xl p-3 space-y-2 mt-2">
            <div className="flex justify-between text-[11px] text-studio-400">
              <span className="flex items-center gap-1.5 text-accent-400 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Altitud Orbital Espacial
              </span>
              <span className="font-mono text-studio-200 font-bold">
                {(camera.spaceZoomLevel ?? 1.6).toFixed(1)}z
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={camera.spaceZoomLevel ?? 1.6}
              onChange={e => updateCamera({ spaceZoomLevel: parseFloat(e.target.value) })}
              className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
            />
            <span className="text-[10px] text-studio-400 block">
              Controla la altura de la cámara en el espacio durante la intro y despedida.
            </span>
          </div>
        )}
      </div>

      {/* 3. Camera Motion Style Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Estilo de Movimiento de Cámara
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              id: 'cinematicFollow',
              name: 'Persecución 3D',
              iconEmoji: '🎬',
              desc: 'Enfoque dinámico adelantado en 3D',
              apply: () => updateCamera({ mode: 'cinematicFollow', defaultPitch: 46, defaultZoom: 6.8, lookAheadFactor: 0.30 }),
              isActive: camera.mode === 'cinematicFollow' && camera.defaultPitch > 20 && camera.defaultPitch < 55,
            },
            {
              id: 'birdsEye',
              name: 'Vista de Pájaro 2D',
              iconEmoji: '🦅',
              desc: 'Vista cenital vertical sin inclinación',
              apply: () => updateCamera({ mode: 'follow', defaultPitch: 0, defaultBearing: 0, defaultZoom: 6.2 }),
              isActive: camera.defaultPitch === 0,
            },
            {
              id: 'roadTrip',
              name: 'Road Trip POV',
              iconEmoji: '🏎️',
              desc: 'Ángulo bajo rasante muy dinámico',
              apply: () => updateCamera({ mode: 'cinematicFollow', defaultPitch: 58, defaultZoom: 7.6, lookAheadFactor: 0.35 }),
              isActive: camera.defaultPitch >= 55,
            },
            {
              id: 'segmentFit',
              name: 'Encuadre de Tramo',
              iconEmoji: '🎯',
              desc: 'Encuadra origen y destino en pantalla',
              apply: () => updateCamera({ mode: 'segmentFit', defaultPitch: 35, defaultZoom: 6.0 }),
              isActive: camera.mode === 'segmentFit',
            },
          ].map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={preset.apply}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[72px] ${
                preset.isActive
                  ? 'bg-accent-600/25 border-accent-500 text-white shadow-md shadow-accent-600/10 ring-1 ring-accent-500/30'
                  : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{preset.iconEmoji}</span>
                <span className="font-bold text-xs text-studio-100">{preset.name}</span>
              </div>
              <span className="text-[10px] text-studio-400 leading-tight">
                {preset.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Manual Fine-Tuning Sliders Card */}
      {(inspectorMode === 'pro' || isManualControlsOpen) ? (
        <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
              Ajustes Manuales de Cámara
            </h4>
            {inspectorMode === 'visual' && (
              <button
                onClick={() => setIsManualControlsOpen(false)}
                className="text-xs text-studio-500 hover:text-studio-300 underline"
              >
                Ocultar
              </button>
            )}
          </div>

          {/* Default Travel Zoom */}
          <div>
            <div className="flex justify-between text-[11px] text-studio-400 mb-1">
              <span>Nivel de Zoom de Viaje</span>
              <span className="font-mono text-studio-200 font-bold">{camera.defaultZoom.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="3.5"
              max="12.0"
              step="0.1"
              value={camera.defaultZoom}
              onChange={e => updateCamera({ defaultZoom: parseFloat(e.target.value) })}
              className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
            />
          </div>

          {/* Camera Pitch */}
          <div>
            <div className="flex justify-between text-[11px] text-studio-400 mb-1">
              <span>Inclinación 3D (Pitch)</span>
              <span className="font-mono text-studio-200 font-bold">{camera.defaultPitch.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={camera.defaultPitch}
              onChange={e => updateCamera({ defaultPitch: parseFloat(e.target.value) })}
              className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
            />
          </div>

          {/* Camera Bearing */}
          <div>
            <div className="flex justify-between text-[11px] text-studio-400 mb-1">
              <span>Rotación / Rumbo (Bearing)</span>
              <span className="font-mono text-studio-200 font-bold">{camera.defaultBearing.toFixed(0)}°</span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={camera.defaultBearing}
              onChange={e => updateCamera({ defaultBearing: parseFloat(e.target.value) })}
              className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
            />
          </div>

          <button
            type="button"
            onClick={() => updateCamera({ defaultPitch: 46, defaultBearing: 0, defaultZoom: 6.5, mode: 'cinematicFollow' })}
            className="w-full py-2 text-center text-xs font-semibold text-studio-300 hover:text-white rounded-xl bg-studio-900 border border-studio-750 transition-colors"
          >
            Restablecer ángulos estándar (46° / 6.5z)
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsManualControlsOpen(true)}
          className="w-full py-2.5 text-center text-xs font-semibold text-studio-400 hover:text-studio-200 rounded-xl border border-dashed border-studio-800 hover:border-studio-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>⚙️ Ajustes manuales de pitch, zoom y rotación</span>
        </button>
      )}

      {/* 5. Cinematic Intro & Outro Sequences Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Secuencias Cinemáticas
        </h4>

        <label className="flex items-center justify-between cursor-pointer py-1">
          <div className="pr-3">
            <span className="text-studio-200 font-semibold block text-xs">
              {isGlobe ? 'Aproximación Orbital (Globo 3D)' : 'Zoom Inicial de Intro'}
            </span>
            <span className="text-[10px] text-studio-400 leading-tight">
              {isGlobe ? 'Desciende desde el espacio planetario hacia la primera parada' : 'Zoom cinematográfico desde el mapa general'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={camera.introZoomEnabled}
            onChange={e => updateCamera({ introZoomEnabled: e.target.checked })}
            className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-studio-800/60">
          <div className="pr-3">
            <span className="text-studio-200 font-semibold block text-xs">
              {isGlobe ? 'Alejamiento al Espacio (Outro)' : 'Zoom Final Panorámico'}
            </span>
            <span className="text-[10px] text-studio-400 leading-tight">
              {isGlobe ? 'Se aleja hacia el globo espacial mostrando todo el viaje completo' : 'Se aleja para mostrar la ruta completa en el mapa'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={camera.outroZoomOutEnabled}
            onChange={e => updateCamera({ outroZoomOutEnabled: e.target.checked })}
            className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
