import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Trash2, MapPin, Sparkles, Navigation, Clock, ChevronRight } from 'lucide-react';
import { RouteStop } from '../../core/types/project';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';

interface Props {
  stop: RouteStop;
  index: number;
  isSelected: boolean;
  isLast?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<RouteStop>) => void;
  onRemove: () => void;
}

const VEHICLE_INFO: Record<string, { label: string; emoji: string }> = {
  plane: { label: 'Vuelo', emoji: '✈️' },
  car: { label: 'Deportivo', emoji: '🏎️' },
  vintageCar: { label: 'Coche', emoji: '🚗' },
  motorcycle: { label: 'Moto', emoji: '🏍️' },
  bus: { label: 'Furgoneta', emoji: '🚐' },
  dot: { label: 'Punto', emoji: '⚪' },
};

export const ItineraryItem: React.FC<Props> = ({
  stop,
  index,
  isSelected,
  isLast = false,
  onSelect,
  onUpdate,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { project } = useProjectStore();
  const { setActiveTab, setMobileTab, setSelectedStopId } = useEditorStore();
  const outgoingSegment = project.route.segments.find(s => s.startStopId === stop.id);

  const vehicleKey = outgoingSegment?.vehicle?.icon || 'vintageCar';
  const vehicle = VEHICLE_INFO[vehicleKey] || { label: 'Vehículo', emoji: '🚗' };
  const distanceKm = ((outgoingSegment?.distanceMeters || 0) / 1000).toFixed(0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex flex-col transition-all duration-150 ${
        isDragging ? 'opacity-40 z-50' : 'opacity-100'
      }`}
    >
      {/* Main Stop Card */}
      <div
        onClick={onSelect}
        className={`group relative flex flex-col p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'bg-studio-850/90 border-accent-500/80 shadow-lg shadow-accent-500/10 ring-1 ring-accent-500/40'
            : 'bg-studio-900/90 hover:bg-studio-850/80 border-studio-800 hover:border-studio-700/80 shadow-sm'
        } ${!stop.visible ? 'opacity-60' : ''}`}
      >
        {/* Card Header: Drag Handle, Number Badge, Title, Actions */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 cursor-grab active:cursor-grabbing p-1 -ml-1 text-studio-500 hover:text-studio-200 transition-colors touch-none min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg hover:bg-studio-800"
              title="Arrastrar para reordenar parada"
              onClick={e => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>

            {/* Stop Number Badge */}
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all shadow-sm ${
                isSelected
                  ? 'bg-gradient-to-tr from-accent-600 to-rose-600 text-white shadow-accent-600/30 ring-2 ring-accent-400/50'
                  : 'bg-studio-800 text-studio-200 border border-studio-700 group-hover:border-studio-600'
              }`}
            >
              {index + 1}
            </div>

            {/* Destination Title & Canonical Location */}
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={stop.displayName}
                onChange={e => onUpdate({ displayName: e.target.value })}
                onClick={e => e.stopPropagation()}
                placeholder="Nombre de la parada"
                className="w-full bg-transparent text-studio-100 font-bold text-sm sm:text-base focus:outline-none focus:bg-studio-950/80 px-1.5 -mx-1.5 py-0.5 rounded-lg border border-transparent focus:border-studio-600 transition-colors truncate"
              />
              <div className="flex items-center gap-1.5 text-xs text-studio-400 mt-0.5 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0 text-studio-500" />
                <span className="truncate">{stop.canonicalName || 'Ubicación en el mapa'}</span>
              </div>
            </div>
          </div>

          {/* Right Action Icons (Visibility & Delete) */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
            <button
              onClick={e => {
                e.stopPropagation();
                onUpdate({ visible: !stop.visible });
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                stop.visible
                  ? 'hover:bg-studio-800 text-studio-400 hover:text-studio-200'
                  : 'bg-studio-800/80 text-studio-500 hover:text-studio-300'
              }`}
              title={stop.visible ? 'Ocultar parada de la animación' : 'Hacer visible la parada'}
            >
              {stop.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-studio-500" />}
            </button>

            <button
              onClick={e => {
                e.stopPropagation();
                onRemove();
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-950/50 text-studio-400 hover:text-rose-400 transition-colors"
              title="Eliminar parada del itinerario"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Footer: Behavior Badge & Quick Configure Pill */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-studio-800/60 text-xs">
          <div className="flex items-center gap-1.5">
            {stop.behavior === 'highlight' && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Resaltar parada</span>
              </span>
            )}
            {stop.behavior === 'pause' && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-300 bg-blue-950/50 border border-blue-800/50 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Pausa de {stop.pauseDuration}s</span>
              </span>
            )}
            {stop.behavior === 'passThrough' && (
              <span className="flex items-center gap-1 text-[11px] text-studio-400 bg-studio-800/80 px-2 py-0.5 rounded-full">
                <Navigation className="w-3 h-3 text-studio-500" />
                <span>Paso fluido</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setSelectedStopId(stop.id);
              setActiveTab('stops');
              setMobileTab('inspector');
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300 transition-colors py-0.5 px-2 rounded-lg hover:bg-studio-800"
          >
            <span>Configurar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Travel Segment Connector to Next Stop */}
      {!isLast && outgoingSegment && (
        <div className="relative py-2 pl-9 sm:pl-10 flex items-center">
          {/* Vertical Connecting Line */}
          <div className="absolute left-[26px] sm:left-[30px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-studio-700 via-studio-800 to-studio-700" />

          {/* Segment Chip / Badge */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('route');
              setMobileTab('inspector');
            }}
            className="relative z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-studio-950 border border-studio-800 hover:border-accent-500/50 hover:bg-studio-900 transition-all text-xs font-mono shadow-sm group"
            title="Cambiar vehículo o tipo de ruta para este trayecto"
          >
            <span className="text-sm select-none">{vehicle.emoji}</span>
            <span className="text-studio-300 font-semibold text-[11px]">{vehicle.label}</span>
            <span className="text-studio-500 font-normal text-[10px]">•</span>
            <span className="text-accent-400 font-bold text-[11px]">{distanceKm} km</span>
          </button>
        </div>
      )}
    </div>
  );
};
