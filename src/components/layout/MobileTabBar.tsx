import React from 'react';
import { Map, Route, Sliders, Plus, Sparkles } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { haptics } from '../../utils/haptics';

export const MobileTabBar: React.FC = () => {
  const {
    mobileTab,
    setMobileTab,
    setIsAddStopModalOpen,
    setIsAiChatOpen,
  } = useEditorStore();
  const { project } = useProjectStore();

  const stopCount = project.route.stops.length;

  return (
    <nav className="lg:hidden flex-shrink-0 w-full h-16 min-h-[60px] bg-studio-950/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-around px-2 z-50 select-none pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
      {/* 1. Mapa */}
      <button
        type="button"
        onClick={() => {
          haptics.selection();
          setMobileTab('preview');
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all duration-200 active:scale-95 ${
          mobileTab === 'preview'
            ? 'text-accent-400 font-bold'
            : 'text-studio-400 hover:text-studio-200'
        }`}
      >
        {mobileTab === 'preview' && (
          <div className="absolute top-0 inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-accent-500 to-transparent shadow-sm shadow-accent-500" />
        )}
        <Map
          className={`w-5 h-5 transition-transform duration-200 ${
            mobileTab === 'preview'
              ? 'text-accent-400 stroke-[2.5] scale-110 drop-shadow-sm'
              : 'text-studio-400'
          }`}
        />
        <span
          className={`text-[10px] mt-1 tracking-tight uppercase ${
            mobileTab === 'preview' ? 'font-black text-accent-400' : 'font-semibold text-studio-400'
          }`}
        >
          Mapa
        </span>
      </button>

      {/* 2. Itinerario (con contador de paradas) */}
      <button
        type="button"
        onClick={() => {
          haptics.selection();
          setMobileTab('itinerary');
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all duration-200 active:scale-95 ${
          mobileTab === 'itinerary'
            ? 'text-accent-400 font-bold'
            : 'text-studio-400 hover:text-studio-200'
        }`}
      >
        {mobileTab === 'itinerary' && (
          <div className="absolute top-0 inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-accent-500 to-transparent shadow-sm shadow-accent-500" />
        )}
        <div className="relative flex items-center justify-center">
          <Route
            className={`w-5 h-5 transition-transform duration-200 ${
              mobileTab === 'itinerary'
                ? 'text-accent-400 stroke-[2.5] scale-110 drop-shadow-sm'
                : 'text-studio-400'
            }`}
          />
          {stopCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-accent-600 to-rose-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-studio-950 shadow-md">
              {stopCount}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] mt-1 tracking-tight uppercase ${
            mobileTab === 'itinerary' ? 'font-black text-accent-400' : 'font-semibold text-studio-400'
          }`}
        >
          Itinerario
        </span>
      </button>

      {/* 3. Botón Hero Central: + Parada */}
      <div className="flex flex-col items-center justify-center px-1">
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            setIsAddStopModalOpen(true);
          }}
          className="w-11 h-11 -mt-3.5 rounded-full bg-gradient-to-tr from-accent-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-accent-600/40 border-2 border-studio-950 active:scale-90 hover:brightness-110 transition-all cursor-pointer"
          title="Añadir nueva parada"
          aria-label="Añadir nueva parada"
        >
          <Plus className="w-6 h-6 text-white stroke-[2.5]" />
        </button>
        <span className="text-[9px] font-bold text-studio-300 mt-0.5 tracking-tight uppercase">
          + Parada
        </span>
      </div>

      {/* 4. Copiloto IA (Generador Mágico) */}
      <button
        type="button"
        onClick={() => {
          haptics.medium();
          setIsAiChatOpen(true);
        }}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all duration-200 text-purple-400 hover:text-purple-300 active:scale-95 group"
        title="Abrir Copiloto IA de Rutas"
      >
        <div className="relative flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform animate-pulse" />
          <span className="absolute -top-1 -right-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[8px] font-black rounded-full px-1 py-0.2 border border-studio-950 shadow-sm leading-none">
            IA
          </span>
        </div>
        <span className="text-[10px] mt-1 tracking-tight uppercase font-bold text-purple-300">
          Copiloto
        </span>
      </button>

      {/* 5. Ajustes (Inspector) */}
      <button
        type="button"
        onClick={() => {
          haptics.selection();
          setMobileTab('inspector');
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full py-1 relative transition-all duration-200 active:scale-95 ${
          mobileTab === 'inspector'
            ? 'text-accent-400 font-bold'
            : 'text-studio-400 hover:text-studio-200'
        }`}
      >
        {mobileTab === 'inspector' && (
          <div className="absolute top-0 inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-accent-500 to-transparent shadow-sm shadow-accent-500" />
        )}
        <Sliders
          className={`w-5 h-5 transition-transform duration-200 ${
            mobileTab === 'inspector'
              ? 'text-accent-400 stroke-[2.5] scale-110 drop-shadow-sm'
              : 'text-studio-400'
          }`}
        />
        <span
          className={`text-[10px] mt-1 tracking-tight uppercase ${
            mobileTab === 'inspector' ? 'font-black text-accent-400' : 'font-semibold text-studio-400'
          }`}
        >
          Ajustes
        </span>
      </button>
    </nav>
  );
};
