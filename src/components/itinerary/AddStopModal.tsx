import React, { useState, useEffect } from 'react';
import { Search, MapPin, X, Plus, Sparkles, Navigation, Clock } from 'lucide-react';
import { NominatimGeocodingProvider } from '../../core/providers/geocoding/nominatimProvider';
import { GeocodingResult } from '../../core/types/providers';
import { RouteStop, StopBehavior } from '../../core/types/project';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';
import { useTouchDragToDismiss } from '../../hooks/useTouchDragToDismiss';

const geocoder = new NominatimGeocodingProvider();

export const AddStopModal: React.FC = () => {
  const { isAddStopModalOpen, setIsAddStopModalOpen } = useEditorStore();
  const { addStop } = useProjectStore();

  const { dragProps, sheetStyle } = useTouchDragToDismiss({
    onDismiss: () => setIsAddStopModalOpen(false),
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<GeocodingResult | null>(null);

  // Manual Coordinate Inputs
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [behavior, setBehavior] = useState<StopBehavior>('highlight');
  const [mode, setMode] = useState<'search' | 'coords'>('search');

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await geocoder.search(query);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isAddStopModalOpen) return null;

  const handleSelectResult = (res: GeocodingResult) => {
    setSelectedResult(res);
    setCustomName(res.displayName.split(',')[0].toUpperCase());
  };

  const handleConfirmAdd = async () => {
    if (mode === 'search' && selectedResult) {
      const stopId = `stop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newStop: RouteStop = {
        id: stopId,
        canonicalName: selectedResult.canonicalName,
        displayName: customName || selectedResult.displayName,
        coordinates: selectedResult.coordinates,
        visible: true,
        behavior,
        pauseDuration: behavior === 'highlight' ? 0.35 : behavior === 'pause' ? 1.0 : 0,
        cameraPriority: behavior === 'highlight' ? 1 : 2,
        labelPriority: behavior === 'highlight' ? 1 : 2,
      };

      await addStop(newStop);
      setIsAddStopModalOpen(false);
      resetState();
    } else if (mode === 'coords') {
      const lat = parseFloat(customLat);
      const lng = parseFloat(customLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      const stopId = `stop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const name = customName.trim() || `Waypoint (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
      const newStop: RouteStop = {
        id: stopId,
        canonicalName: `${name} [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
        displayName: name.toUpperCase(),
        coordinates: { lat, lng },
        visible: true,
        behavior,
        pauseDuration: behavior === 'highlight' ? 0.35 : behavior === 'pause' ? 1.0 : 0,
        cameraPriority: 2,
        labelPriority: 2,
      };

      await addStop(newStop);
      setIsAddStopModalOpen(false);
      resetState();
    }
  };

  const resetState = () => {
    setQuery('');
    setResults([]);
    setSelectedResult(null);
    setCustomName('');
    setCustomLat('');
    setCustomLng('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in pointer-events-auto">
      <div
        style={sheetStyle}
        className="bg-studio-900 border border-studio-750 rounded-t-3xl sm:rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] pb-safe"
      >
        {/* Mobile Drag Indicator and Header (Touch Drag Zone) */}
        <div {...dragProps} className="touch-none select-none cursor-grab active:cursor-grabbing bg-studio-900 flex-shrink-0">
          <div className="py-2.5 flex items-center justify-center sm:hidden">
            <div className="w-12 h-1.5 bg-studio-600 rounded-full" />
          </div>

          {/* Modal Header */}
          <div className="flex items-center justify-between px-3.5 pb-3 md:p-4 border-b border-studio-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-accent-500" />
              <h3 className="font-bold text-xs md:text-sm text-studio-100 uppercase tracking-wide">
                Añadir Parada al Itinerario
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddStopModalOpen(false)}
              className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-studio-800 bg-studio-950/50 p-1 flex-shrink-0">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] ${
              mode === 'search'
                ? 'bg-studio-800 text-studio-100 shadow-sm font-bold'
                : 'text-studio-400 hover:text-studio-200'
            }`}
          >
            Buscar Ubicación
          </button>
          <button
            onClick={() => setMode('coords')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[38px] ${
              mode === 'coords'
                ? 'bg-studio-800 text-studio-100 shadow-sm font-bold'
                : 'text-studio-400 hover:text-studio-200'
            }`}
          >
            Coordenadas GPS
          </button>
        </div>

        {/* Modal Body */}
        <div
          data-scrollable="true"
          className="p-3.5 md:p-4 space-y-3.5 overflow-y-auto flex-1 touch-pan-y overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          {mode === 'search' ? (
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-studio-400" />
                <input
                  type="text"
                  placeholder="Ciudad o lugar (ej. Madrid, Roma, Gran Cañón)..."
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedResult(null);
                  }}
                  className="w-full bg-studio-950 border border-studio-700 rounded-xl pl-9 pr-4 py-2.5 text-xs md:text-sm text-studio-100 placeholder-studio-500 focus:outline-none focus:border-accent-500 transition-colors min-h-[44px]"
                  autoFocus
                />
                {isLoading && (
                  <div className="absolute right-3 top-3 text-[10px] text-studio-400 animate-pulse">
                    Buscando...
                  </div>
                )}
              </div>

              {/* Search Results List */}
              <div
                data-scrollable="true"
                className="max-h-48 md:max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-studio-800/80 bg-studio-950/50 p-1.5 touch-pan-y overscroll-contain"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  overscrollBehavior: 'contain',
                }}
              >
                {results.length === 0 ? (
                  <div className="p-4 text-center text-xs text-studio-500">
                    {query ? 'No se encontraron ubicaciones coincidentes' : 'Escribe para buscar en la base global'}
                  </div>
                ) : (
                  results.map(res => (
                    <div
                      key={res.id}
                      onClick={() => handleSelectResult(res)}
                      className={`p-3 rounded-lg cursor-pointer text-xs flex items-center justify-between transition-colors min-h-[44px] ${
                        selectedResult?.id === res.id
                          ? 'bg-accent-600/20 border border-accent-500/60 text-studio-100'
                          : 'hover:bg-studio-850 text-studio-300 active:bg-studio-800'
                      }`}
                    >
                      <div className="truncate flex-1">
                        <div className="font-semibold text-studio-100">{res.displayName}</div>
                        <div className="text-[10px] text-studio-500 truncate mt-0.5">
                          {res.canonicalName}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-studio-500 ml-2">
                        {res.coordinates.lat.toFixed(2)}, {res.coordinates.lng.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-studio-400 mb-1">
                  Nombre de la Parada
                </label>
                <input
                  type="text"
                  placeholder="ej. MIRADOR DEL VALLE"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-studio-950 border border-studio-700 rounded-xl px-3 py-2.5 text-xs md:text-sm text-studio-100 placeholder-studio-500 focus:outline-none focus:border-accent-500 min-h-[44px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div>
                  <label className="block text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-studio-400 mb-1">
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="36.0544"
                    value={customLat}
                    onChange={e => setCustomLat(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-700 rounded-xl px-2.5 py-2 text-xs md:text-sm text-studio-100 placeholder-studio-500 focus:outline-none focus:border-accent-500 font-mono min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-studio-400 mb-1">
                    Longitud
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-112.1401"
                    value={customLng}
                    onChange={e => setCustomLng(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-700 rounded-xl px-2.5 py-2 text-xs md:text-sm text-studio-100 placeholder-studio-500 focus:outline-none focus:border-accent-500 font-mono min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Behavior & Display Configuration */}
          <div className="pt-2 border-t border-studio-800 space-y-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-studio-400 mb-1.5">
                Comportamiento en la Animación
              </label>
              <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                <button
                  type="button"
                  onClick={() => setBehavior('highlight')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col items-start gap-1 transition-colors min-h-[52px] ${
                    behavior === 'highlight'
                      ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
                      : 'bg-studio-950 border-studio-800 text-studio-400 hover:bg-studio-850'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Resaltar
                  </div>
                  <span className="text-[9px] opacity-80 leading-tight">Llegada con pulso</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBehavior('passThrough')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col items-start gap-1 transition-colors min-h-[52px] ${
                    behavior === 'passThrough'
                      ? 'bg-studio-800 border-studio-600 text-studio-100'
                      : 'bg-studio-950 border-studio-800 text-studio-400 hover:bg-studio-850'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Navigation className="w-3 h-3 text-studio-300" /> Paso
                  </div>
                  <span className="text-[9px] opacity-80 leading-tight">Punto de paso continuo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBehavior('pause')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col items-start gap-1 transition-colors min-h-[52px] ${
                    behavior === 'pause'
                      ? 'bg-blue-950/40 border-blue-600/70 text-blue-200'
                      : 'bg-studio-950 border-studio-800 text-studio-400 hover:bg-studio-850'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Clock className="w-3 h-3 text-blue-400" /> Pausa
                  </div>
                  <span className="text-[9px] opacity-80 leading-tight">Detener cámara</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 md:p-4 border-t border-studio-800 bg-studio-950 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={() => setIsAddStopModalOpen(false)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-studio-400 hover:text-white transition-colors min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            disabled={mode === 'search' ? !selectedResult : !customLat || !customLng || Number(customLat) < -90 || Number(customLat) > 90 || Number(customLng) < -180 || Number(customLng) > 180}
            onClick={handleConfirmAdd}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shadow-md min-h-[44px] active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Añadir al Itinerario
          </button>
        </div>
      </div>
    </div>
  );
};
