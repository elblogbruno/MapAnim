import React, { useState, useRef, useEffect } from 'react';
import { Palette, Car, X, Check, Globe, Map, RotateCcw, Sparkles, Navigation, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';
import { MAP_STYLE_PRESETS } from '../../core/providers/mapStyles/styleRegistry';
import { MapStylePreset } from '../../core/types/providers';
import { haptics } from '../../utils/haptics';
import { BottomSheet } from '../common/BottomSheet';

type VehicleIcon = 'vintageCar' | 'car' | 'plane' | 'bus' | 'motorcycle';

export const MobileQuickControls: React.FC = () => {
  const { project, setProject, updateStop } = useProjectStore();
  const {
    selectedStopId,
    setSelectedStopId,
    focusStop,
    setActiveTab,
    setMobileTab,
    resetCameraPosition,
    fitRouteOverview,
  } = useEditorStore();

  const [activeDrawer, setActiveDrawer] = useState<'style' | 'vehicle' | null>(null);
  const chipContainerRef = useRef<HTMLDivElement>(null);

  const isGlobe = project.camera.projection === 'globe' || project.map.projection === 'globe';
  const stops = project.route.stops;
  const selectedStop = stops.find(s => s.id === selectedStopId);

  const currentIndex = selectedStop ? stops.findIndex(s => s.id === selectedStop.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < stops.length - 1;

  // Auto-scroll active chip into view horizontally
  useEffect(() => {
    if (!selectedStopId || !chipContainerRef.current) return;
    const activeChip = chipContainerRef.current.querySelector(`[data-stop-id="${selectedStopId}"]`);
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedStopId]);

  const vehicleOptions: { id: VehicleIcon; label: string; iconEmoji: string }[] = [
    { id: 'vintageCar', label: 'Coche Clásico', iconEmoji: '🚗' },
    { id: 'car', label: 'Coche Deportivo', iconEmoji: '🏎️' },
    { id: 'plane', label: 'Avión de Pasajeros', iconEmoji: '✈️' },
    { id: 'bus', label: 'Furgoneta Camper', iconEmoji: '🚐' },
    { id: 'motorcycle', label: 'Motocicleta', iconEmoji: '🏍️' },
  ];

  const toggleProjection = () => {
    haptics.medium();
    const next = isGlobe ? 'mercator' : 'globe';
    setProject({
      ...project,
      map: { ...project.map, projection: next },
      camera: { ...project.camera, projection: next },
    });
  };

  const handleSelectVehicle = (vehicleType: VehicleIcon) => {
    haptics.light();
    setProject({
      ...project,
      route: {
        ...project.route,
        segments: project.route.segments.map(seg => ({
          ...seg,
          vehicle: { enabled: true, icon: vehicleType, size: 26, color: '#ffffff' },
        })),
      },
    });
    setActiveDrawer(null);
  };

  const handleSelectStyle = (preset: MapStylePreset) => {
    haptics.light();
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
    setActiveDrawer(null);
  };

  const currentVehicle = project.route.segments[0]?.vehicle?.icon || 'vintageCar';

  return (
    <>
      {/* Carrusel Horizontal de Paradas en Móvil - Navegación rápida sin salir del mapa */}
      {stops.length > 0 && (
        <div
          ref={chipContainerRef}
          className="lg:hidden absolute top-3 left-3 right-16 z-20 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto pr-2"
        >
          {stops.map((stop, idx) => {
            const isSelected = stop.id === selectedStopId;
            return (
              <button
                key={stop.id}
                data-stop-id={stop.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  focusStop(stop.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 flex-shrink-0 backdrop-blur-xl ${
                  isSelected
                    ? 'bg-gradient-to-r from-accent-600 to-rose-600 text-white border border-accent-400/50 shadow-accent-600/30 ring-1 ring-white/30'
                    : 'bg-studio-950/85 text-studio-300 hover:text-white border border-white/[0.12]'
                }`}
                title={`Ir a parada ${idx + 1}: ${stop.displayName}`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isSelected ? 'bg-white text-accent-700' : 'bg-studio-800 text-studio-300'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="max-w-[84px] truncate">{stop.displayName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Dock Flotante Vertical (Lateral Derecho) - Espacioso, no invade el mapa */}
      <div className="lg:hidden absolute top-3 right-3 z-30 flex flex-col gap-2.5 pointer-events-auto">
        {/* 3D / 2D Toggle */}
        <button
          type="button"
          onClick={toggleProjection}
          className="w-10 h-10 rounded-full bg-studio-950/85 text-studio-100 border border-white/[0.12] shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center active:scale-90 transition-all"
          title={isGlobe ? 'Cambiar a mapa 2D' : 'Cambiar a Globo 3D'}
        >
          {isGlobe ? (
            <>
              <Globe className="w-4 h-4 text-accent-400" />
              <span className="text-[8px] font-black leading-none text-accent-300">3D</span>
            </>
          ) : (
            <>
              <Map className="w-4 h-4 text-sky-400" />
              <span className="text-[8px] font-black leading-none text-sky-300">2D</span>
            </>
          )}
        </button>

        {/* Centrar / Restablecer Cámara */}
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            resetCameraPosition();
            fitRouteOverview();
          }}
          className="w-10 h-10 rounded-full bg-studio-950/85 text-studio-300 hover:text-white border border-white/[0.12] shadow-2xl backdrop-blur-xl flex items-center justify-center active:scale-90 transition-all"
          title="Centrar y ver toda la ruta"
        >
          <RotateCcw className="w-4 h-4 text-studio-200" />
        </button>

        {/* Estilo & Vehículo */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setActiveDrawer('style');
          }}
          className="w-10 h-10 rounded-full bg-studio-950/85 text-amber-400 border border-white/[0.12] shadow-2xl backdrop-blur-xl flex items-center justify-center active:scale-90 transition-all"
          title="Personalizar Estilo y Vehículo"
        >
          <Palette className="w-4 h-4" />
        </button>
      </div>

      {/* Ficha Contextual de Parada Seleccionada en Móvil */}
      {selectedStop && (
        <div className="lg:hidden absolute bottom-3 inset-x-3 z-40 bg-studio-950/95 backdrop-blur-2xl border border-accent-500/40 rounded-2xl p-3 shadow-2xl animate-fade-in pointer-events-auto">
          {/* Fila Superior: Anterior [◀], Info Parada con salto, Siguiente [▶], y Cerrar [✕] */}
          <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-white/[0.08]">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => {
                if (hasPrev) {
                  haptics.light();
                  focusStop(stops[currentIndex - 1].id);
                }
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                hasPrev
                  ? 'bg-studio-900 text-studio-200 hover:bg-studio-800 border border-studio-750 active:scale-95'
                  : 'bg-studio-950/50 text-studio-600 border border-studio-900 cursor-not-allowed opacity-40'
              }`}
              title={hasPrev ? `Parada anterior: ${stops[currentIndex - 1]?.displayName}` : 'Primera parada'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                haptics.light();
                focusStop(selectedStop.id);
              }}
              className="flex items-center gap-2 text-xs font-bold text-white hover:text-accent-300 transition-colors min-w-0 flex-1 px-1 text-left active:opacity-80"
              title="Centrar y saltar a este momento en la línea de tiempo"
            >
              <span className="w-5 h-5 rounded-md bg-accent-600/30 border border-accent-500/50 flex items-center justify-center text-[10px] font-black text-accent-300 flex-shrink-0 font-mono">
                {currentIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs sm:text-sm font-black text-white">{selectedStop.displayName}</div>
                <div className="text-[10px] text-studio-400 font-medium truncate flex items-center gap-1">
                  <span>Parada {currentIndex + 1} de {stops.length}</span>
                  <span className="text-accent-400 font-mono font-bold">• ▶ Saltar</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              disabled={!hasNext}
              onClick={() => {
                if (hasNext) {
                  haptics.light();
                  focusStop(stops[currentIndex + 1].id);
                }
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                hasNext
                  ? 'bg-studio-900 text-studio-200 hover:bg-studio-800 border border-studio-750 active:scale-95'
                  : 'bg-studio-950/50 text-studio-600 border border-studio-900 cursor-not-allowed opacity-40'
              }`}
              title={hasNext ? `Siguiente parada: ${stops[currentIndex + 1]?.displayName}` : 'Última parada'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            <button
              type="button"
              onClick={() => setSelectedStopId(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
              title="Cerrar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Fila Inferior: Botones de Comportamiento & Acceso a Ajustes */}
          <div className="flex items-center justify-between gap-1.5 pt-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  updateStop(selectedStop.id, { behavior: 'highlight', pauseDuration: 0.35 });
                }}
                className={`min-h-[36px] px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase transition-all flex items-center gap-1 active:scale-95 ${
                  selectedStop.behavior === 'highlight'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-studio-900 border border-studio-800 text-studio-400'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Resaltar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  updateStop(selectedStop.id, { behavior: 'passThrough', pauseDuration: 0 });
                }}
                className={`min-h-[36px] px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase transition-all flex items-center gap-1 active:scale-95 ${
                  selectedStop.behavior === 'passThrough'
                    ? 'bg-studio-800 text-white border border-studio-600 shadow-sm'
                    : 'bg-studio-900 border border-studio-800 text-studio-400'
                }`}
              >
                <Navigation className="w-3 h-3 text-studio-300" />
                <span>Paso</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  updateStop(selectedStop.id, { behavior: 'pause', pauseDuration: 1.0 });
                }}
                className={`min-h-[36px] px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase transition-all flex items-center gap-1 active:scale-95 ${
                  selectedStop.behavior === 'pause'
                    ? 'bg-blue-500/25 text-blue-300 border border-blue-500/50 shadow-sm'
                    : 'bg-studio-900 border border-studio-800 text-studio-400'
                }`}
              >
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Pausa</span>
              </button>
            </div>

            {/* Abrir en Inspector */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setActiveTab('stops');
                setSelectedStopId(selectedStop.id);
                setMobileTab('inspector');
              }}
              className="min-h-[36px] flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent-600/30 hover:bg-accent-600/40 text-accent-300 font-bold text-xs border border-accent-500/40 active:scale-95 transition-all flex-shrink-0"
            >
              <span>Ajustes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Touch-Draggable Bottom Sheet */}
      <BottomSheet
        isOpen={activeDrawer !== null}
        onClose={() => setActiveDrawer(null)}
        title={
          activeDrawer === 'style' ? (
            <>
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Estilos de Mapa</span>
            </>
          ) : activeDrawer === 'vehicle' ? (
            <>
              <Car className="w-4 h-4 text-blue-400" />
              <span>Seleccionar Vehículo</span>
            </>
          ) : undefined
        }
      >
        {activeDrawer === 'style' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-6">
            {MAP_STYLE_PRESETS.map(preset => {
              const isSelected = project.map.stylePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectStyle(preset)}
                  className={`min-h-[50px] p-3 rounded-xl border text-left flex items-center justify-between transition-colors active:scale-[0.98] ${
                    isSelected
                      ? 'bg-accent-600/25 border-accent-500 text-white font-bold shadow-md'
                      : 'bg-studio-950/80 border-studio-800 text-studio-300 hover:bg-studio-850'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-studio-100">{preset.name}</div>
                    <div className="text-[11px] text-studio-400 truncate mt-0.5">{preset.description}</div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-accent-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        )}

        {activeDrawer === 'vehicle' && (
          <div className="grid grid-cols-1 gap-2 pb-6">
            {vehicleOptions.map(veh => {
              const isSelected = currentVehicle === veh.id;
              return (
                <button
                  key={veh.id}
                  type="button"
                  onClick={() => handleSelectVehicle(veh.id)}
                  className={`min-h-[50px] p-3 rounded-xl border text-left flex items-center justify-between transition-colors active:scale-[0.98] ${
                    isSelected
                      ? 'bg-accent-600/25 border-accent-500 text-white font-bold shadow-md'
                      : 'bg-studio-950/80 border-studio-800 text-studio-300 hover:bg-studio-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{veh.iconEmoji}</span>
                    <span className="text-xs font-semibold text-studio-100">{veh.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-accent-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        )}
      </BottomSheet>
    </>
  );
};
