import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Upload, Route } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';
import { ItineraryItem } from './ItineraryItem';
import { haptics } from '../../utils/haptics';

export const ItineraryList: React.FC = () => {
  const { project, updateStop, removeStop, reorderStops, loadDemoProject, createNewProject } = useProjectStore();
  const {
    selectedStopId,
    focusStop,
    setMobileTab,
    setIsAddStopModalOpen,
    setIsGpxModalOpen,
  } = useEditorStore();

  const handleSelectStop = (stopId: string) => {
    haptics.light();
    focusStop(stopId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab('preview');
    }
  };

  const stops = project.route.stops;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      haptics.selection();
      reorderStops(String(active.id), String(over.id));
    }
  };

  const totalDistanceKm = (
    project.route.segments.reduce((acc, s) => acc + (s.distanceMeters || 0), 0) / 1000
  ).toFixed(0);

  return (
    <div className="flex flex-col h-full bg-studio-900 md:border-r border-studio-800/80 relative">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-studio-800/80 flex items-center justify-between bg-studio-950/80">
        <div>
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-accent-500" />
            <h2 className="font-extrabold text-sm sm:text-base text-studio-100 tracking-tight">
              Itinerario
            </h2>
          </div>
          <p className="text-[11px] text-studio-400 mt-0.5 font-medium">
            {stops.length} {stops.length === 1 ? 'parada' : 'paradas'}
            {Number(totalDistanceKm) > 0 ? ` • ${totalDistanceKm} km total` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGpxModalOpen(true)}
            className="p-2 rounded-xl bg-studio-900 hover:bg-studio-800 text-studio-300 hover:text-white transition-colors border border-studio-750 min-h-[38px] min-w-[38px] flex items-center justify-center shadow-sm"
            title="Importar ruta GPX / GeoJSON"
          >
            <Upload className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddStopModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-accent-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs transition-all shadow-md shadow-accent-600/25 min-h-[38px] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Parada</span>
          </button>
        </div>
      </div>

      {/* Demos & Templates Quick Bar */}
      <div className="px-4 py-2 bg-studio-950/40 border-b border-studio-800/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-medium text-studio-400 flex-shrink-0">Plantillas:</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => {
              if (project.route.stops.length > 0 && !window.confirm('¿Vaciar el itinerario para comenzar un viaje en blanco? Tus cambios están guardados.')) return;
              createNewProject('Nueva Ruta');
            }}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-studio-850 text-studio-300 border border-studio-700/70 hover:bg-studio-800 hover:text-white transition-colors"
            title="Vaciar itinerario y empezar de cero"
          >
            + Vacío
          </button>
          <button
            onClick={() => loadDemoProject('route66')}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/40 hover:bg-amber-900/60 transition-colors"
          >
            Ruta 66
          </button>
          <button
            onClick={() => loadDemoProject('europe')}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-950/40 text-blue-300 border border-blue-800/40 hover:bg-blue-900/60 transition-colors"
          >
            Europa
          </button>
        </div>
      </div>

      {/* List Container - With safe padding for mobile bottom bar */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2 pb-28 lg:pb-4">
        {stops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-studio-800 rounded-2xl bg-studio-950/40 my-4">
            <Route className="w-12 h-12 text-studio-600 mb-3" />
            <p className="text-sm font-bold text-studio-200">No hay paradas en el itinerario</p>
            <p className="text-xs text-studio-400 mt-1 max-w-xs leading-relaxed">
              Añade paradas para comenzar tu ruta o selecciona una de las plantillas de arriba.
            </p>
            <button
              onClick={() => setIsAddStopModalOpen(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-600 to-rose-600 hover:brightness-110 text-xs font-bold text-white shadow-lg shadow-accent-600/25 active:scale-95 transition-all"
            >
              Añadir Primera Parada
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stops.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {stops.map((stop, idx) => (
                <ItineraryItem
                  key={stop.id}
                  stop={stop}
                  index={idx}
                  isLast={idx === stops.length - 1}
                  isSelected={selectedStopId === stop.id}
                  onSelect={() => handleSelectStop(stop.id)}
                  onUpdate={updates => updateStop(stop.id, updates)}
                  onRemove={() => {
                    haptics.heavy();
                    removeStop(stop.id);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Mobile Floating Action Button (FAB) for thumb quick addition */}
      {stops.length > 0 && (
        <button
          type="button"
          onClick={() => setIsAddStopModalOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-accent-600 to-rose-600 text-white font-bold text-xs shadow-xl shadow-accent-600/40 border border-white/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Parada</span>
        </button>
      )}
    </div>
  );
};
