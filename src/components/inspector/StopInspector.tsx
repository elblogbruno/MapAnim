import React, { useState, useRef } from 'react';
import { RouteStop, MarkerType } from '../../core/types/project';
import {
  MapPin,
  ChevronDown,
  Sparkles,
  Sliders,
  Disc,
  CircleDot,
  EyeOff,
  MousePointer,
  Camera,
  Trash2,
  UploadCloud,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';
import { TravelMode, RouteMode } from '../../core/types/geo';
import { uploadStopPhoto, getOptimizedStorageUrl } from '../../core/project/cloudStorage';

interface Props {
  stop: RouteStop;
  onUpdate: (updates: Partial<RouteStop>) => void;
}

export const StopInspector: React.FC<Props> = ({ stop, onUpdate }) => {
  const markerStyle = stop.markerStyle || {};
  const labelStyle = stop.labelStyle || {};
  const { project, updateSegment, recalculateSegmentRoute } = useProjectStore();
  const inspectorMode = useEditorStore(state => state.inspectorMode);
  const [isUpdatingRoute, setIsUpdatingRoute] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      const res = await uploadStopPhoto(file, stop.id);
      if (res.error) {
        setPhotoError(res.error);
      } else if (res.url) {
        onUpdate({
          behavior: stop.behavior === 'passThrough' ? 'pause' : stop.behavior,
          pauseDuration: Math.max(stop.pauseDuration || 0, 1.8),
          photo: {
            id: `photo_${stop.id}_${Date.now()}`,
            url: res.url,
            caption: '',
            displayMode: 'card',
            durationSeconds: 2.0,
          },
        });
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Error al subir la imagen');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const outgoingSegment = project.route.segments.find(s => s.startStopId === stop.id);
  const nextStop = outgoingSegment ? project.route.stops.find(s => s.id === outgoingSegment.endStopId) : null;

  return (
    <div className="space-y-4 p-3.5 sm:p-4 text-xs">
      {/* 1. Stop Name & Identity Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Nombre de la Parada
        </label>
        <input
          type="text"
          value={stop.displayName}
          onChange={e => onUpdate({ displayName: e.target.value })}
          placeholder="Ej. Chicago, Ruta 66 Inicio"
          className="w-full bg-studio-900 border border-studio-700/80 rounded-xl px-3.5 py-2.5 text-studio-100 font-semibold focus:outline-none focus:border-accent-500 transition-colors shadow-inner text-sm"
        />

        {/* Location Badge */}
        <div className="p-3 bg-studio-900/70 rounded-xl border border-studio-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-studio-300 font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-accent-500 flex-shrink-0" />
            <span className="truncate font-semibold text-xs">{stop.canonicalName}</span>
          </div>
          <span className="text-[10px] text-accent-400 font-semibold flex-shrink-0 ml-2 bg-accent-950/60 px-2 py-0.5 rounded-full border border-accent-800/40">
            Verificada
          </span>
        </div>
      </div>

      {/* 2. Animation Behavior Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Comportamiento en Animación
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onUpdate({ behavior: 'highlight', pauseDuration: 0.35 })}
            className={`py-2.5 px-2 rounded-xl border text-center font-medium transition-all flex flex-col items-center gap-1.5 min-h-[48px] justify-center ${
              stop.behavior === 'highlight'
                ? 'bg-amber-950/50 border-amber-500/70 text-amber-300 font-bold shadow-md shadow-amber-950/30 ring-1 ring-amber-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[11px]">Resaltar</span>
          </button>
          <button
            onClick={() => onUpdate({ behavior: 'passThrough', pauseDuration: 0 })}
            className={`py-2.5 px-2 rounded-xl border text-center font-medium transition-all flex flex-col items-center gap-1.5 min-h-[48px] justify-center ${
              stop.behavior === 'passThrough'
                ? 'bg-studio-800 border-studio-600 text-studio-100 font-bold shadow-md ring-1 ring-studio-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <span className="text-sm">⏩</span>
            <span className="text-[11px]">Paso Fluido</span>
          </button>
          <button
            onClick={() => onUpdate({ behavior: 'pause', pauseDuration: 1.0 })}
            className={`py-2.5 px-2 rounded-xl border text-center font-medium transition-all flex flex-col items-center gap-1.5 min-h-[48px] justify-center ${
              stop.behavior === 'pause'
                ? 'bg-blue-950/50 border-blue-500/70 text-blue-300 font-bold shadow-md shadow-blue-950/30 ring-1 ring-blue-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <span className="text-sm">⏸️</span>
            <span className="text-[11px]">Pausa</span>
          </button>
        </div>

        {/* Pause Duration */}
        {stop.behavior === 'pause' && (
          <div className="bg-studio-900/70 p-3 rounded-xl border border-studio-800/80 space-y-2">
            <div className="flex justify-between text-[11px] text-studio-300">
              <span className="font-semibold">Tiempo de Pausa</span>
              <span className="font-mono text-accent-400 font-bold">{stop.pauseDuration || 1.0}s</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={stop.pauseDuration || 1.0}
              onChange={e => onUpdate({ pauseDuration: parseFloat(e.target.value) })}
              className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* 3. Stop Photo & Postcard Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-studio-300 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-accent-400" />
            <span>Foto o Postal de la Parada</span>
          </label>
          {stop.photo && (
            <button
              type="button"
              onClick={() => onUpdate({ photo: undefined })}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
              title="Quitar foto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar</span>
            </button>
          )}
        </div>

        {stop.photo ? (
          <div className="space-y-3 bg-studio-900/80 p-3 rounded-xl border border-studio-800">
            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-studio-950 group">
              <img
                src={getOptimizedStorageUrl(stop.photo.url, 600, 85)}
                alt={stop.displayName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-[10px]">
                {stop.photo.url.includes('supabase.co') ? (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-mono font-medium">Supabase CDN</span>
                  </>
                ) : (
                  <span className="text-studio-300 font-mono">Almacenamiento Local</span>
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg shadow-lg hover:bg-studio-100 transition-colors"
                >
                  Cambiar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-studio-400 mb-1">Pie de Foto (Opcional)</label>
              <input
                type="text"
                value={stop.photo.caption || ''}
                placeholder="Ej. Vistas panorámicas desde el mirador"
                onChange={e =>
                  onUpdate({
                    photo: {
                      ...stop.photo!,
                      caption: e.target.value,
                    },
                  })
                }
                className="w-full bg-studio-950 border border-studio-750 rounded-lg px-3 py-2 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-accent-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-studio-400 mb-1.5">Estilo de Presentación</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'card' as const, label: 'Tarjeta' },
                  { id: 'polaroid' as const, label: 'Polaroid' },
                  { id: 'fullscreen' as const, label: 'Completa' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        photo: {
                          ...stop.photo!,
                          displayMode: m.id,
                        },
                      })
                    }
                    className={`py-2 text-[11px] font-semibold rounded-xl border transition-all ${
                      stop.photo?.displayMode === m.id
                        ? 'bg-accent-600/30 border-accent-500 text-accent-200 shadow-sm font-bold'
                        : 'bg-studio-950 border-studio-800 text-studio-400 hover:text-studio-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={isUploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 px-3 rounded-xl border border-dashed border-studio-700 hover:border-accent-500/70 bg-studio-900/40 hover:bg-studio-900/80 text-studio-300 transition-all flex flex-col items-center justify-center gap-2 text-center group"
            >
              {isUploadingPhoto ? (
                <div className="flex items-center gap-2 text-accent-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-semibold">Optimizando y subiendo a Storage...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-studio-400 group-hover:text-accent-400 transition-colors" />
                  <span className="text-xs font-semibold group-hover:text-white transition-colors">
                    Subir foto para esta parada
                  </span>
                  <span className="text-[10px] text-studio-500">PNG, JPG o WebP (máx. 10 MB)</span>
                </>
              )}
            </button>

            {photoError && (
              <p className="text-[10px] text-rose-400 text-center">{photoError}</p>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

      {/* 4. Next Leg Transport & Vehicle (Only if not final stop) */}
      {outgoingSegment && nextStop && (
        <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
              Vehículo hacia la Siguiente Parada
            </h4>
            <span className="text-[10px] text-accent-400 font-semibold truncate max-w-[140px]">
              → {nextStop.displayName}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'plane' as const, label: 'Avión', iconEmoji: '✈️', mode: 'airplane' as TravelMode, route: 'arc' as RouteMode },
              { id: 'car' as const, label: 'Deportivo', iconEmoji: '🏎️', mode: 'car' as TravelMode, route: 'realRoad' as RouteMode },
              { id: 'vintageCar' as const, label: 'Coche Clásico', iconEmoji: '🚗', mode: 'car' as TravelMode, route: 'realRoad' as RouteMode },
              { id: 'motorcycle' as const, label: 'Moto', iconEmoji: '🏍️', mode: 'motorcycle' as TravelMode, route: 'realRoad' as RouteMode },
              { id: 'bus' as const, label: 'Furgoneta', iconEmoji: '🚐', mode: 'bus' as TravelMode, route: 'realRoad' as RouteMode },
              { id: 'dot' as const, label: 'Punto Sutil', iconEmoji: '⚪', mode: 'car' as TravelMode, route: 'realRoad' as RouteMode },
            ].map(opt => {
              const currentVehicle = outgoingSegment.vehicle?.icon || 'vintageCar';
              const isSelected = currentVehicle === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isUpdatingRoute}
                  onClick={async () => {
                    setIsUpdatingRoute(true);
                    try {
                      updateSegment(outgoingSegment.id, {
                        travelMode: opt.mode,
                        routeMode: opt.route,
                        vehicle: {
                          enabled: opt.id !== 'dot',
                          icon: opt.id,
                          size: opt.id === 'plane' ? 28 : 24,
                          color: '#FFFFFF',
                        },
                      });
                      await recalculateSegmentRoute(outgoingSegment.id);
                    } finally {
                      setIsUpdatingRoute(false);
                    }
                  }}
                  className={`py-2.5 px-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 min-h-[52px] justify-center ${
                    isSelected
                      ? 'bg-accent-600/25 border-accent-500 text-accent-200 shadow-sm font-bold ring-1 ring-accent-500/30'
                      : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
                  }`}
                >
                  <span className="text-lg">{opt.iconEmoji}</span>
                  <span className="text-[10px] truncate max-w-full font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-studio-400 bg-studio-900/80 p-2.5 rounded-xl border border-studio-800">
            <span>Trayecto: <strong className="text-studio-200">{outgoingSegment.routeMode === 'arc' ? 'Vuelo Curvo' : 'Carretera Real'}</strong></span>
            {isUpdatingRoute ? (
              <span className="text-accent-400 animate-pulse font-medium">Calculando ruta...</span>
            ) : (
              <span className="text-accent-400 font-mono font-bold">{((outgoingSegment.distanceMeters || 0) / 1000).toFixed(0)} km</span>
            )}
          </div>
        </div>
      )}

      {/* 5. Visual Marker Customization Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
            Estilo del Marcador
          </h4>
          {/* Quick Color Picker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-studio-400">Color:</span>
            <input
              type="color"
              value={markerStyle.color || '#8C342D'}
              onChange={e => onUpdate({ markerStyle: { ...markerStyle, color: e.target.value } })}
              className="w-6 h-6 rounded-lg cursor-pointer border border-studio-700 bg-studio-950 p-0"
            />
          </div>
        </div>

        {/* Visual Marker Presets */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'pin' as MarkerType, label: 'Pin', icon: MapPin },
            { id: 'circle' as MarkerType, label: 'Punto', icon: Disc },
            { id: 'ring' as MarkerType, label: 'Anillo', icon: CircleDot },
            { id: 'invisible' as MarkerType, label: 'Oculto', icon: EyeOff },
          ].map(preset => {
            const Icon = preset.icon;
            const isSelected = (markerStyle.type || 'circle') === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onUpdate({ markerStyle: { ...markerStyle, type: preset.id } })}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all min-h-[46px] justify-center ${
                  isSelected
                    ? 'bg-accent-600/25 border-accent-500 text-accent-200 shadow-sm font-bold ring-1 ring-accent-500/30'
                    : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Direct Canvas Drag Hint */}
      <div className="p-3 rounded-xl bg-accent-950/20 border border-accent-600/30 flex items-center gap-2.5 text-xs text-accent-300">
        <MousePointer className="w-4 h-4 flex-shrink-0 text-accent-400" />
        <span>Puedes arrastrar la etiqueta de esta ciudad directamente en el mapa.</span>
      </div>

      {/* Advanced Fine-Tuning (Accordion in Visual mode, always visible in Pro mode) */}
      {(inspectorMode === 'pro' || isAdvancedOpen) ? (
        <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-studio-400" />
              <span>Ajustes Numéricos Avanzados</span>
            </h4>
            {inspectorMode === 'visual' && (
              <button
                onClick={() => setIsAdvancedOpen(false)}
                className="text-xs text-studio-500 hover:text-studio-300 underline"
              >
                Ocultar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-studio-400 mb-1">Offset X (px)</label>
              <input
                type="number"
                value={labelStyle.offsetX ?? 0}
                onChange={e => onUpdate({ labelStyle: { ...labelStyle, offsetX: parseInt(e.target.value) || 0 } })}
                className="w-full bg-studio-900 border border-studio-700 rounded-lg px-2.5 py-1.5 text-studio-200 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-studio-400 mb-1">Offset Y (px)</label>
              <input
                type="number"
                value={labelStyle.offsetY ?? -34}
                onChange={e => onUpdate({ labelStyle: { ...labelStyle, offsetY: parseInt(e.target.value) || 0 } })}
                className="w-full bg-studio-900 border border-studio-700 rounded-lg px-2.5 py-1.5 text-studio-200 font-mono text-xs"
              />
            </div>
          </div>

          <div className="text-[11px] font-mono text-studio-400 p-2.5 bg-studio-900/80 rounded-xl border border-studio-800">
            Coordenadas: {stop.coordinates.lat.toFixed(5)}, {stop.coordinates.lng.toFixed(5)}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(true)}
          className="w-full py-2.5 text-center text-xs font-semibold text-studio-400 hover:text-studio-200 rounded-xl border border-dashed border-studio-800 hover:border-studio-700 transition-colors flex items-center justify-center gap-2"
        >
          <Sliders className="w-3.5 h-3.5 text-studio-500" />
          <span>Ajustes numéricos y coordenadas</span>
          <ChevronDown className="w-3.5 h-3.5 text-studio-500" />
        </button>
      )}
    </div>
  );
};
