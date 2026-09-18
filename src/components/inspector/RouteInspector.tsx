import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

export const RouteInspector: React.FC = () => {
  const { project, updateDefaultLineStyle, updateRouteSettings, recalculateAllRoutes } = useProjectStore();
  const lineStyle = project.route.defaultLineStyle;
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState(false);

  return (
    <div className="space-y-4 p-3.5 sm:p-4 text-xs">
      {/* 1. Route Polyline Appearance Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Apariencia del Trazo de Ruta
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-medium text-studio-400 mb-1.5">Color del Trazo</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={lineStyle.color}
                onChange={e => updateDefaultLineStyle({ color: e.target.value })}
                className="w-8 h-8 rounded-lg border border-studio-700 bg-studio-950 cursor-pointer p-0.5"
              />
              <span className="font-mono text-studio-300 font-semibold uppercase">{lineStyle.color}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-studio-400 mb-1.5">Grosor ({lineStyle.width}px)</label>
            <input
              type="range"
              min="2"
              max="12"
              step="0.5"
              value={lineStyle.width}
              onChange={e => updateDefaultLineStyle({ width: parseFloat(e.target.value) })}
              className="w-full accent-accent-500 mt-2 h-2 bg-studio-800 rounded-lg"
            />
          </div>
        </div>

        {/* Route Outline */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-studio-800/60">
          <div>
            <label className="block text-[10px] font-medium text-studio-400 mb-1.5">Color de Borde</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={lineStyle.outlineColor || '#ffffff'}
                onChange={e => updateDefaultLineStyle({ outlineColor: e.target.value })}
                className="w-8 h-8 rounded-lg border border-studio-700 bg-studio-950 cursor-pointer p-0.5"
              />
              <span className="font-mono text-studio-300 font-semibold uppercase">{lineStyle.outlineColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-studio-400 mb-1.5">Grosor de Borde ({lineStyle.outlineWidth}px)</label>
            <input
              type="range"
              min="0"
              max="4"
              step="0.5"
              value={lineStyle.outlineWidth}
              onChange={e => updateDefaultLineStyle({ outlineWidth: parseFloat(e.target.value) })}
              className="w-full accent-accent-500 mt-2 h-2 bg-studio-800 rounded-lg"
            />
          </div>
        </div>

        {/* Glow and Future Route */}
        <div className="pt-2 space-y-2 border-t border-studio-800/60">
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-studio-300 font-medium">Brillo Cinematográfico</span>
            <input
              type="checkbox"
              checked={lineStyle.glow}
              onChange={e => updateDefaultLineStyle({ glow: e.target.checked })}
              className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-studio-300 font-medium">Mostrar Ruta Futura Translúcida</span>
            <input
              type="checkbox"
              checked={lineStyle.futureVisibility}
              onChange={e => updateDefaultLineStyle({ futureVisibility: e.target.checked })}
              className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 2. Animation & Labels Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
          Animación y Etiquetas
        </h4>

        <div>
          <label className="block text-[10px] font-medium text-studio-400 mb-1.5">
            Curva de Aceleración del Trazo
          </label>
          <select
            value={project.route.routeEasing || 'cinematic'}
            onChange={e => updateRouteSettings({ routeEasing: e.target.value as any })}
            className="w-full bg-studio-900 border border-studio-700/80 rounded-xl px-3 py-2 text-studio-200 text-xs font-medium"
          >
            <option value="cinematic">Cinemático (Suave al inicio y fin)</option>
            <option value="easeInOut">Suave Fluido (Ease In-Out)</option>
            <option value="linear">Velocidad Constante (Lineal)</option>
            <option value="easeIn">Aceleración Progresiva</option>
            <option value="easeOut">Desaceleración Progresiva</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-studio-400 mb-1.5">
            Modo de Etiquetas de Destinos
          </label>
          <select
            value={project.route.labelDisplayMode}
            onChange={e => updateRouteSettings({ labelDisplayMode: e.target.value as any })}
            className="w-full bg-studio-900 border border-studio-700/80 rounded-xl px-3 py-2 text-studio-200 text-xs font-medium"
          >
            <option value="cinematic">Cinemático (Destinos activos y vista panorámica)</option>
            <option value="visited">Mantener Ciudades Visitadas Visibles</option>
            <option value="current">Solo Ciudad Actual</option>
            <option value="all">Mostrar Siempre Todas las Ciudades</option>
          </select>
        </div>
      </div>

      {/* 3. Trajectory & Road Details Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-studio-300">
            Geometría de Carreteras
          </h4>
          <span className="text-[10px] text-accent-400 font-mono bg-accent-950/60 px-2 py-0.5 rounded-full border border-accent-800/40">
            OSRM / OpenStreetMap
          </span>
        </div>

        <p className="text-[11px] text-studio-400 leading-relaxed">
          Elige si la ruta sigue carreteras reales con curvas GPS auténticas o arcos de vuelo parabólicos.
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={async () => {
              await recalculateAllRoutes('realRoad');
            }}
            className={`py-2.5 px-2 rounded-xl border text-center font-medium transition-all flex flex-col items-center gap-1.5 min-h-[52px] justify-center ${
              (project.route.segments[0]?.routeMode ?? 'realRoad') === 'realRoad'
                ? 'bg-accent-600/25 border-accent-500 text-accent-200 shadow-sm font-bold ring-1 ring-accent-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <span className="text-base">🚗</span>
            <span className="text-[10px] font-medium">Carretera Real</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await recalculateAllRoutes('arc');
            }}
            className={`py-2.5 px-2 rounded-xl border text-center font-medium transition-all flex flex-col items-center gap-1.5 min-h-[52px] justify-center ${
              project.route.segments[0]?.routeMode === 'arc'
                ? 'bg-accent-600/25 border-accent-500 text-accent-200 shadow-sm font-bold ring-1 ring-accent-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <span className="text-base">✈️</span>
            <span className="text-[10px] font-medium">Arco de Vuelo</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await recalculateAllRoutes('direct');
            }}
            className={`py-2.5 px-2 rounded-xl border text-center font-medium transition-all flex flex-col items-center gap-1.5 min-h-[52px] justify-center ${
              project.route.segments[0]?.routeMode === 'direct'
                ? 'bg-accent-600/25 border-accent-500 text-accent-200 shadow-sm font-bold ring-1 ring-accent-500/30'
                : 'bg-studio-900/80 border-studio-800 text-studio-400 hover:bg-studio-850 hover:text-studio-200'
            }`}
          >
            <span className="text-base">📏</span>
            <span className="text-[10px] font-medium">Línea Directa</span>
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            setIsCalculating(true);
            try {
              await recalculateAllRoutes('realRoad');
              setCalcSuccess(true);
              setTimeout(() => setCalcSuccess(false), 3000);
            } finally {
              setIsCalculating(false);
            }
          }}
          disabled={isCalculating}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-studio-900 hover:bg-studio-850 text-studio-200 border border-studio-750 font-bold text-xs transition-all hover:border-accent-500/50 active:scale-95 shadow-sm"
        >
          {isCalculating ? (
            <span className="flex items-center gap-2 text-accent-400">
              <span className="animate-spin">⏳</span> Calculando carreteras reales...
            </span>
          ) : calcSuccess ? (
            <span className="flex items-center gap-2 text-emerald-400 font-bold">
              ✓ ¡Carreteras OSRM generadas con éxito!
            </span>
          ) : (
            <span className="flex items-center gap-2">
              🔄 Recalcular Carreteras Reales (OSRM)
            </span>
          )}
        </button>

        <div className="p-3 bg-studio-900/70 rounded-xl border border-studio-800 text-[11px] text-studio-400 leading-relaxed">
          <span className="font-bold text-studio-300">💡 Consejo:</span> Para rutas de senderismo o grabaciones GPS exactas, usa el botón <strong className="text-studio-200">Importar GPX</strong> en el panel de Itinerario.
        </div>
      </div>
    </div>
  );
};
