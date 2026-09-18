import React from 'react';
import { Sparkles, Globe, Map, Video, ChevronRight, Eye, RotateCcw, Maximize2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { calculateTimelineSchedule } from '../../core/engine/timingEngine';

export const CanvasFloatingControls: React.FC = () => {
  const {
    selectedStopId,
    setSelectedStopId,
    setIsThemePickerOpen,
    setActiveTab,
    setMobileTab,
    showSafeArea,
    setShowSafeArea,
    resetCameraPosition,
    fitRouteOverview,
  } = useEditorStore();
  const { project, setProject, updateCamera, updateStop } = useProjectStore();
  const { seek } = usePlaybackStore();

  const isGlobe = project.camera.projection === 'globe' || project.map.projection === 'globe';
  const stops = project.route.stops;
  const selectedStop = stops.find(s => s.id === selectedStopId);

  const toggleProjection = () => {
    const next = isGlobe ? 'mercator' : 'globe';
    setProject({
      ...project,
      map: { ...project.map, projection: next },
      camera: { ...project.camera, projection: next },
    });
  };

  const setQuickCameraVibe = (vibe: 'cinematic' | 'birdsEye' | 'roadTrip') => {
    if (vibe === 'cinematic') {
      updateCamera({ mode: 'cinematicFollow', defaultPitch: 46, defaultZoom: 6.8, lookAheadFactor: 0.30 });
    } else if (vibe === 'birdsEye') {
      updateCamera({ mode: 'follow', defaultPitch: 0, defaultZoom: 6.0, lookAheadFactor: 0.15 });
    } else if (vibe === 'roadTrip') {
      updateCamera({ mode: 'cinematicFollow', defaultPitch: 58, defaultZoom: 7.6, lookAheadFactor: 0.35 });
    }
  };

  // Jump to selected stop arrival time
  const handleJumpToStop = () => {
    if (!selectedStop) return;
    const schedule = calculateTimelineSchedule(project);
    const stopSlot = schedule.stops.find(s => s.stopId === selectedStop.id);
    if (stopSlot) {
      seek(stopSlot.arrivalTime);
    }
  };

  return (
    <>
      {/* Top Floating Quick Bar (Desktop Only - Mobile uses MobileQuickControls) */}
      <div className="hidden lg:flex absolute top-4 right-4 z-30 items-center gap-2 pointer-events-auto">
        {/* 1-Click Master Themes Button */}
        <button
          type="button"
          onClick={() => setIsThemePickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-studio-900/90 hover:bg-studio-800 text-studio-100 text-xs font-semibold border border-accent-500/40 hover:border-accent-500 shadow-xl backdrop-blur-md transition-all group"
          title="Elegir Tema Visual Maestro"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent-400 group-hover:rotate-12 transition-transform" />
          <span>Temas</span>
        </button>

        {/* 3D Globe / 2D Flat Toggle */}
        <button
          type="button"
          onClick={toggleProjection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-studio-900/90 hover:bg-studio-800 text-studio-200 text-xs font-semibold border border-studio-700/80 shadow-xl backdrop-blur-md transition-all"
          title={isGlobe ? 'Cambiar a mapa plano 2D' : 'Cambiar a Globo 3D'}
        >
          {isGlobe ? (
            <>
              <Globe className="w-3.5 h-3.5 text-accent-400" />
              <span>Globo 3D</span>
            </>
          ) : (
            <>
              <Map className="w-3.5 h-3.5 text-blue-400" />
              <span>Plano 2D</span>
            </>
          )}
        </button>

        {/* Camera Quick Presets Dropdown */}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-studio-900/90 hover:bg-studio-800 text-studio-200 text-xs font-semibold border border-studio-700/80 shadow-xl backdrop-blur-md transition-all"
          >
            <Video className="w-3.5 h-3.5 text-studio-400" />
            <span>Cámara</span>
          </button>
          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-studio-900/95 border border-studio-700/90 rounded-xl p-1.5 shadow-2xl backdrop-blur-md w-48 space-y-1 z-40">
            <button
              onClick={() => setQuickCameraVibe('cinematic')}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-studio-800 text-xs font-medium text-studio-200 flex items-center gap-2"
            >
              <span>🎬</span> Persecución Cinemática
            </button>
            <button
              onClick={() => setQuickCameraVibe('birdsEye')}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-studio-800 text-xs font-medium text-studio-200 flex items-center gap-2"
            >
              <span>🦅</span> Vista Aérea 2D
            </button>
            <button
              onClick={() => setQuickCameraVibe('roadTrip')}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-studio-800 text-xs font-medium text-studio-200 flex items-center gap-2"
            >
              <span>🏎️</span> Conducción Road Trip
            </button>
            <div className="h-px bg-studio-800 my-1" />
            <button
              onClick={resetCameraPosition}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-studio-800 text-xs font-medium text-accent-300 flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-accent-400" />
              <span>Restablecer Cámara</span>
            </button>
            <button
              onClick={fitRouteOverview}
              className="text-left px-2.5 py-1.5 rounded-lg hover:bg-studio-800 text-xs font-medium text-studio-200 flex items-center gap-2"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver Ruta Completa</span>
            </button>
          </div>
        </div>

        {/* Reset Camera Quick Button */}
        <button
          type="button"
          onClick={resetCameraPosition}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-studio-900/90 hover:bg-studio-800 text-studio-200 hover:text-white text-xs font-semibold border border-studio-700/80 hover:border-accent-500/50 shadow-xl backdrop-blur-md transition-all active:scale-95 group"
          title="Restablecer posición de cámara"
        >
          <RotateCcw className="w-3.5 h-3.5 text-accent-400 group-hover:-rotate-45 transition-transform" />
          <span>Reset Cam</span>
        </button>

        {/* Safe Area Guide Toggle */}
        <button
          type="button"
          onClick={() => setShowSafeArea(!showSafeArea)}
          className={`p-2 rounded-full border shadow-xl backdrop-blur-md transition-all ${
            showSafeArea
              ? 'bg-accent-600/30 border-accent-500 text-accent-300'
              : 'bg-studio-900/90 border-studio-700/80 text-studio-400 hover:text-studio-200 hover:bg-studio-800'
          }`}
          title="Alternar Guías de Área Segura TikTok / Reels"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Selected Stop Floating Contextual Toolbar (Canvas bottom overlay - Desktop) */}
      {selectedStop && (
        <div className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-40 items-center gap-2 p-1.5 pl-3 rounded-full bg-studio-950/90 border border-studio-700/80 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-auto">
          {/* Stop Name & Jump */}
          <button
            onClick={handleJumpToStop}
            className="flex items-center gap-2 text-xs font-bold text-white hover:text-accent-300 transition-colors mr-1"
            title="Haz clic para saltar la línea de tiempo a esta parada"
          >
            <span className="w-2 h-2 rounded-full bg-accent-400 animate-ping" />
            <span>{selectedStop.displayName}</span>
          </button>

          <div className="h-4 w-px bg-studio-800 mx-1" />

          {/* Quick Behavior Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateStop(selectedStop.id, { behavior: 'highlight', pauseDuration: 0.35 })}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                selectedStop.behavior === 'highlight'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-studio-400 hover:text-white'
              }`}
            >
              Resaltar
            </button>
            <button
              type="button"
              onClick={() => updateStop(selectedStop.id, { behavior: 'passThrough', pauseDuration: 0 })}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                selectedStop.behavior === 'passThrough'
                  ? 'bg-studio-800 text-white border border-studio-700'
                  : 'text-studio-400 hover:text-white'
              }`}
            >
              Paso
            </button>
            <button
              type="button"
              onClick={() => updateStop(selectedStop.id, { behavior: 'pause', pauseDuration: 1.0 })}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                selectedStop.behavior === 'pause'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-studio-400 hover:text-white'
              }`}
            >
              Pausa
            </button>
          </div>

          <div className="h-4 w-px bg-studio-800 mx-1" />

          {/* Open in Inspector */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('stops');
              setMobileTab('inspector');
              setSelectedStopId(selectedStop.id);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-studio-850 hover:bg-studio-800 text-studio-300 hover:text-white text-[10px] font-semibold border border-studio-700/60 transition-colors"
          >
            <span>Editar</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
};
