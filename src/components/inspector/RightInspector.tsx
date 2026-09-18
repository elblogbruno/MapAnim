import React, { useEffect } from 'react';
import { Route, Video, Palette, Sparkles, MapPin, ChevronDown, ChevronLeft, ChevronRight, Sliders, Map } from 'lucide-react';
import { useEditorStore, EditorTab } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { StopInspector } from './StopInspector';
import { RouteInspector } from './RouteInspector';
import { CameraInspector } from './CameraInspector';
import { MapStyleInspector } from './MapStyleInspector';
import { EffectsInspector } from './EffectsInspector';

export const RightInspector: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedStopId,
    setSelectedStopId,
    inspectorMode,
    setInspectorMode,
    setMobileTab,
  } = useEditorStore();
  const { project, updateStop } = useProjectStore();

  const stops = project.route.stops;

  // Ensure a stop is selected if on the stops tab
  useEffect(() => {
    if (activeTab === 'stops' && !selectedStopId && stops.length > 0) {
      setSelectedStopId(stops[0].id);
    }
  }, [activeTab, selectedStopId, stops, setSelectedStopId]);

  const selectedStop = stops.find(s => s.id === selectedStopId) || stops[0];
  const currentStopIndex = stops.findIndex(s => s.id === (selectedStop?.id || ''));
  const isFirstStop = currentStopIndex <= 0;
  const isLastStop = currentStopIndex === -1 || currentStopIndex >= stops.length - 1;

  const handlePrevStop = () => {
    if (currentStopIndex > 0) {
      setSelectedStopId(stops[currentStopIndex - 1].id);
    }
  };

  const handleNextStop = () => {
    if (currentStopIndex >= 0 && currentStopIndex < stops.length - 1) {
      setSelectedStopId(stops[currentStopIndex + 1].id);
    }
  };

  const tabs: { id: EditorTab; label: string; title: string; icon: React.FC<any> }[] = [
    { id: 'stops', label: 'Parada', title: 'Propiedades de la Parada', icon: MapPin },
    { id: 'route', label: 'Ruta', title: 'Ruta y Vehículo', icon: Route },
    { id: 'camera', label: 'Cámara', title: 'Cámara y Globo 3D', icon: Video },
    { id: 'style', label: 'Estilo', title: 'Estilo de Mapa', icon: Palette },
    { id: 'effects', label: 'Efectos', title: 'Títulos y Efectos Visuales', icon: Sparkles },
  ];

  return (
    <div className="flex flex-col h-full bg-studio-900 md:border-l border-studio-800/80">
      {/* Top Inspector Bar: Title, Back to Map on Mobile & Mode Switcher */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-studio-950/90 border-b border-studio-800/80 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2">
          {/* Quick Return to Map on Mobile */}
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-studio-900 hover:bg-studio-850 text-accent-400 border border-studio-750 text-xs font-bold active:scale-95 transition-all shadow-sm"
            title="Volver a la vista del mapa"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Ver en Mapa</span>
          </button>

          <span className="hidden sm:inline text-[11px] font-bold text-studio-200 uppercase tracking-wider">
            Ajustes
          </span>
        </div>

        {/* Visual vs Pro Mode Switcher */}
        <div className="flex items-center bg-studio-900 rounded-lg p-0.5 border border-studio-750 text-[10px]">
          <button
            type="button"
            onClick={() => setInspectorMode('visual')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
              inspectorMode === 'visual'
                ? 'bg-accent-600 text-white shadow-sm font-bold'
                : 'text-studio-400 hover:text-studio-200'
            }`}
            title="Tarjetas visuales y ajustes guiados"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Visual</span>
          </button>
          <button
            type="button"
            onClick={() => setInspectorMode('pro')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all ${
              inspectorMode === 'pro'
                ? 'bg-studio-800 text-white shadow-sm font-bold border border-studio-700'
                : 'text-studio-400 hover:text-studio-200'
            }`}
            title="Parámetros avanzados y ajuste fino"
          >
            <Sliders className="w-2.5 h-2.5" />
            <span>Pro</span>
          </button>
        </div>
      </div>

      {/* Tabs Header - Scrollable pill chips with breathing room */}
      <div className="flex items-center border-b border-studio-800/80 bg-studio-950/95 py-2.5 px-3 gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.title}
              className={`flex-shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs transition-all min-h-[36px] ${
                isActive
                  ? 'bg-gradient-to-r from-accent-600 to-rose-600 text-white shadow-md shadow-accent-600/20 font-bold border border-white/10'
                  : 'bg-studio-900/90 text-studio-300 hover:text-white hover:bg-studio-850 border border-studio-800/80 font-medium'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content - With safe padding for mobile bottom bar */}
      <div className="flex-1 overflow-y-auto pb-28 lg:pb-4">
        {activeTab === 'stops' && (
          <div className="flex flex-col">
            {/* Stop Selector & Navigation Header */}
            {stops.length > 0 && (
              <div className="px-3.5 py-3 bg-studio-950/90 border-b border-studio-800/80 space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent-400" />
                    <span className="text-[10px] font-bold text-studio-300 uppercase tracking-wider">
                      Parada Seleccionada
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-studio-850 text-studio-300 border border-studio-700/60 font-medium">
                    {currentStopIndex >= 0 ? currentStopIndex + 1 : 1} / {stops.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevStop}
                    disabled={isFirstStop}
                    title="Parada Anterior"
                    aria-label="Parada Anterior"
                    className="p-2 rounded-lg bg-studio-900 border border-studio-700/80 hover:bg-studio-850 hover:border-studio-600 disabled:opacity-30 disabled:pointer-events-none text-studio-300 transition-colors flex-shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1 min-w-0">
                    <select
                      value={selectedStop?.id || ''}
                      onChange={e => setSelectedStopId(e.target.value)}
                      className="w-full bg-studio-900 hover:bg-studio-850 focus:bg-studio-900 border border-studio-700/80 hover:border-studio-600 focus:border-accent-500 text-studio-100 text-xs font-semibold rounded-lg pl-2.5 pr-7 py-2 appearance-none cursor-pointer transition-colors shadow-sm outline-none truncate min-h-[38px]"
                    >
                      {stops.map((s, idx) => (
                        <option key={s.id} value={s.id} className="bg-studio-900 text-studio-100 py-1">
                          #{idx + 1} — {s.displayName} ({s.behavior})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-studio-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStop}
                    disabled={isLastStop}
                    title="Siguiente Parada"
                    aria-label="Siguiente Parada"
                    className="p-2 rounded-lg bg-studio-900 border border-studio-700/80 hover:bg-studio-850 hover:border-studio-600 disabled:opacity-30 disabled:pointer-events-none text-studio-300 transition-colors flex-shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {selectedStop ? (
              <StopInspector
                stop={selectedStop}
                onUpdate={updates => updateStop(selectedStop.id, updates)}
              />
            ) : (
              <div className="p-6 text-center text-xs text-studio-500">
                No hay paradas en el itinerario. Añade paradas en la pestaña Itinerario para editar sus propiedades.
              </div>
            )}
          </div>
        )}
        {activeTab === 'route' && <RouteInspector />}
        {activeTab === 'camera' && <CameraInspector />}
        {activeTab === 'style' && <MapStyleInspector />}
        {activeTab === 'effects' && <EffectsInspector />}
      </div>
    </div>
  );
};
