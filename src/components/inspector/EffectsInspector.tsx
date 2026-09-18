import React from 'react';
import { Type, Sparkles, Gauge } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { OverlayTitle, DistanceHudConfig, HudPosition, HudTheme } from '../../core/types/project';

export const EffectsInspector: React.FC = () => {
  const { project, updateEffects, updateOverlays } = useProjectStore();
  const effects = project.effects;
  const overlays = project.overlays;
  const titles = overlays.titles;

  const introTitle = titles.find(t => t.id === 'title_intro' || t.id.includes('intro'));
  const outroTitle = titles.find(t => t.id === 'title_outro' || t.id.includes('outro'));

  const hudConfig: DistanceHudConfig = overlays.distanceHud || {
    enabled: overlays.showDistanceIndicator ?? true,
    unit: overlays.distanceUnit === 'miles' ? 'miles' : 'km',
    position: 'bottomLeft',
    theme: 'glassDark',
    customLabel: overlays.distanceUnit === 'miles' ? 'TOTAL DISTANCE' : 'TOTAL KM',
    showProgressBar: true,
    decimals: 1,
  };

  const updateHud = (updates: Partial<DistanceHudConfig>) => {
    const nextHud: DistanceHudConfig = { ...hudConfig, ...updates };
    updateOverlays({
      distanceHud: nextHud,
      showDistanceIndicator: nextHud.enabled,
      distanceUnit: nextHud.unit,
    });
  };

  const updateTitle = (id: string, updates: Partial<OverlayTitle>) => {
    const nextTitles = titles.map(t => (t.id === id ? { ...t, ...updates } : t));
    updateOverlays({ titles: nextTitles });
  };

  const removeTitle = (id: string) => {
    updateOverlays({ titles: titles.filter(t => t.id !== id) });
  };

  const toggleIntroTitle = (enabled: boolean) => {
    if (enabled) {
      if (!introTitle) {
        const newIntro: OverlayTitle = {
          id: 'title_intro',
          text: 'MY TRAVEL ROUTE',
          subtitle: 'ROAD TRIP ADVENTURE',
          startTime: 0.1,
          duration: 2.2,
          position: 'top',
          fontFamily: 'Cinzel, serif',
          fontSize: 36,
          color: '#2B2724',
          animation: 'fade',
        };
        updateOverlays({ titles: [...titles, newIntro] });
      }
    } else {
      if (introTitle) {
        removeTitle(introTitle.id);
      }
    }
  };

  const toggleOutroTitle = (enabled: boolean) => {
    if (enabled) {
      if (!outroTitle) {
        const newOutro: OverlayTitle = {
          id: 'title_outro',
          text: 'DESTINATION REACHED',
          subtitle: 'ROUTE COMPLETED',
          startTime: Math.max(0, project.video.duration - 2.2),
          duration: 2.0,
          position: 'bottom',
          fontFamily: 'Cinzel, serif',
          fontSize: 32,
          color: '#2B2724',
          animation: 'slideUp',
        };
        updateOverlays({ titles: [...titles, newOutro] });
      }
    } else {
      if (outroTitle) {
        removeTitle(outroTitle.id);
      }
    }
  };

  return (
    <div className="space-y-4 p-3.5 sm:p-4 text-xs">
      {/* 1. Video Title Overlays Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-studio-800/60">
          <Type className="w-4 h-4 text-accent-500" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-studio-200">
            Títulos del Vídeo (Intro y Despedida)
          </h3>
        </div>

        {/* 1.1 Intro Opening Title */}
        <div className="bg-studio-900/80 border border-studio-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-studio-100 text-xs">Título de Apertura (Intro)</span>
            <label className="flex items-center gap-2 cursor-pointer text-studio-400 hover:text-studio-200">
              <input
                type="checkbox"
                checked={!!introTitle}
                onChange={e => toggleIntroTitle(e.target.checked)}
                className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-studio-300">
                {introTitle ? 'Activado' : 'Desactivado'}
              </span>
            </label>
          </div>

          {introTitle && (
            <div className="space-y-2.5 pt-1 border-t border-studio-800/60">
              <div>
                <label className="block text-[10px] font-medium text-studio-400 mb-1">Título Principal</label>
                <input
                  type="text"
                  value={introTitle.text}
                  onChange={e => updateTitle(introTitle.id, { text: e.target.value })}
                  placeholder="Ej. RUTA 66"
                  className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-3 py-2 text-xs text-studio-100 font-bold focus:outline-none focus:border-accent-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-studio-400 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={introTitle.subtitle || ''}
                  onChange={e => updateTitle(introTitle.id, { subtitle: e.target.value })}
                  placeholder="Ej. GRAN VIAJE DE COSTA A COSTA"
                  className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-3 py-2 text-xs text-studio-200 focus:outline-none focus:border-accent-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-studio-400 mb-1">Tipografía</label>
                  <select
                    value={introTitle.fontFamily}
                    onChange={e => updateTitle(introTitle.id, { fontFamily: e.target.value })}
                    className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-2.5 py-1.5 text-xs text-studio-200"
                  >
                    <option value="Cinzel, serif">Cinzel (Serifa Clásica)</option>
                    <option value="Montserrat, sans-serif">Montserrat (Moderna)</option>
                    <option value="serif">Serif Tradicional</option>
                    <option value="sans-serif">Sans-Serif Limpia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-studio-400 mb-1">Posición</label>
                  <select
                    value={introTitle.position}
                    onChange={e => updateTitle(introTitle.id, { position: e.target.value as any })}
                    className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-2.5 py-1.5 text-xs text-studio-200"
                  >
                    <option value="top">Superior Centrado</option>
                    <option value="center">Centro de Pantalla</option>
                    <option value="bottom">Inferior Centrado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="flex justify-between text-[10px] font-medium text-studio-400 mb-1">
                    <span>Duración</span>
                    <span className="font-mono text-accent-400 font-bold">{introTitle.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.2"
                    value={introTitle.duration}
                    onChange={e => updateTitle(introTitle.id, { duration: parseFloat(e.target.value) })}
                    className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-studio-400 mb-1">Animación</label>
                  <select
                    value={introTitle.animation}
                    onChange={e => updateTitle(introTitle.id, { animation: e.target.value as any })}
                    className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-2.5 py-1.5 text-xs text-studio-200"
                  >
                    <option value="fade">Desvanecimiento Suave</option>
                    <option value="slideUp">Deslizar hacia arriba</option>
                    <option value="scale">Zoom Sutil</option>
                    <option value="none">Instantáneo</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 1.2 Outro Final Summary Title */}
        <div className="bg-studio-900/80 border border-studio-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-studio-100 text-xs">Título de Cierre (Despedida)</span>
            <label className="flex items-center gap-2 cursor-pointer text-studio-400 hover:text-studio-200">
              <input
                type="checkbox"
                checked={!!outroTitle}
                onChange={e => toggleOutroTitle(e.target.checked)}
                className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-studio-300">
                {outroTitle ? 'Activado' : 'Desactivado'}
              </span>
            </label>
          </div>

          {outroTitle && (
            <div className="space-y-2.5 pt-1 border-t border-studio-800/60">
              <div>
                <label className="block text-[10px] font-medium text-studio-400 mb-1">Título de Cierre</label>
                <input
                  type="text"
                  value={outroTitle.text}
                  onChange={e => updateTitle(outroTitle.id, { text: e.target.value })}
                  placeholder="Ej. CHICAGO → SANTA MÓNICA"
                  className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-3 py-2 text-xs text-studio-100 font-bold focus:outline-none focus:border-accent-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-studio-400 mb-1">Subtítulo Resumen</label>
                <input
                  type="text"
                  value={outroTitle.subtitle || ''}
                  onChange={e => updateTitle(outroTitle.id, { subtitle: e.target.value })}
                  placeholder="Ej. 3.940 KM COMPLETADOS"
                  className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-3 py-2 text-xs text-studio-200 focus:outline-none focus:border-accent-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-studio-400 mb-1">Posición</label>
                  <select
                    value={outroTitle.position}
                    onChange={e => updateTitle(outroTitle.id, { position: e.target.value as any })}
                    className="w-full bg-studio-950 border border-studio-700/80 rounded-lg px-2.5 py-1.5 text-xs text-studio-200"
                  >
                    <option value="bottom">Inferior Centrado</option>
                    <option value="center">Centro de Pantalla</option>
                    <option value="top">Superior Centrado</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-medium text-studio-400 mb-1">
                    <span>Duración</span>
                    <span className="font-mono text-accent-400 font-bold">{outroTitle.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.2"
                    value={outroTitle.duration}
                    onChange={e => {
                      const dur = parseFloat(e.target.value);
                      updateTitle(outroTitle.id, {
                        duration: dur,
                        startTime: Math.max(0, project.video.duration - dur),
                      });
                    }}
                    className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-studio-400 pt-1 border-t border-studio-800/60">
                <span>Aparición:</span>
                <span className="font-mono text-accent-400 font-semibold">
                  Al final (~{Math.max(0, project.video.duration - (outroTitle.duration || 2.0)).toFixed(1)}s - {project.video.duration.toFixed(1)}s)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Real-time Distance / Odometer HUD Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-studio-800/60">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-studio-200">
              Odómetro de Distancia en Vivo (HUD)
            </h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-studio-400 hover:text-studio-200">
            <input
              type="checkbox"
              checked={hudConfig.enabled}
              onChange={e => updateHud({ enabled: e.target.checked })}
              className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-studio-200">
              {hudConfig.enabled ? 'Visible' : 'Oculto'}
            </span>
          </label>
        </div>

        {hudConfig.enabled && (
          <div className="space-y-3 pt-1">
            {/* Unit & Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-studio-400 mb-1">Unidad de Medida</label>
                <select
                  value={hudConfig.unit}
                  onChange={e => updateHud({
                    unit: e.target.value as 'km' | 'miles',
                    customLabel: e.target.value === 'km' ? 'TOTAL KM' : 'TOTAL DISTANCIA',
                  })}
                  className="w-full bg-studio-900 border border-studio-700/80 rounded-lg px-2.5 py-1.5 text-xs font-bold text-accent-400"
                >
                  <option value="km">Kilómetros (km)</option>
                  <option value="miles">Millas (mi)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-studio-400 mb-1">Posición en Pantalla</label>
                <select
                  value={hudConfig.position}
                  onChange={e => updateHud({ position: e.target.value as HudPosition })}
                  className="w-full bg-studio-900 border border-studio-700/80 rounded-lg px-2.5 py-1.5 text-xs text-studio-200"
                >
                  <option value="bottomLeft">Abajo Izquierda</option>
                  <option value="bottomRight">Abajo Derecha</option>
                  <option value="topLeft">Arriba Izquierda</option>
                  <option value="topRight">Arriba Derecha</option>
                  <option value="topCenter">Arriba Centro</option>
                  <option value="bottomCenter">Abajo Centro</option>
                </select>
              </div>
            </div>

            {/* HUD Theme */}
            <div>
              <label className="block text-[10px] font-medium text-studio-400 mb-1">Tema Estético del HUD</label>
              <select
                value={hudConfig.theme}
                onChange={e => updateHud({ theme: e.target.value as HudTheme })}
                className="w-full bg-studio-900 border border-studio-700/80 rounded-lg px-2.5 py-1.5 text-xs text-studio-200"
              >
                <option value="glassDark">Cristal Oscuro Translúcido (Neón)</option>
                <option value="vintageBadge">Emblema Vintage Americana (Papel Cálido)</option>
                <option value="minimalClean">Editorial Minimalista (Monocromo)</option>
                <option value="techSport">Cyber Deportivo (Cyan HUD)</option>
              </select>
            </div>

            {/* Progress Bar Toggle */}
            <div className="pt-2 border-t border-studio-800/60">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-studio-300 text-[11px] font-medium">Mostrar % del Viaje y Barra de Progreso</span>
                <input
                  type="checkbox"
                  checked={hudConfig.showProgressBar ?? true}
                  onChange={e => updateHud({ showProgressBar: e.target.checked })}
                  className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 3. Cinematic Effects & Color Grading Card */}
      <div className="bg-studio-950/60 p-3.5 sm:p-4 rounded-2xl border border-studio-800/80 space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-studio-800/60">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-studio-200">
            Textura y Atmósfera Cinemática
          </h3>
        </div>

        {/* Paper Texture */}
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-studio-200 font-semibold text-xs">Textura de Grano de Papel</span>
            <input
              type="checkbox"
              checked={effects.paperTexture}
              onChange={e => updateEffects({ paperTexture: e.target.checked })}
              className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>
          {effects.paperTexture && (
            <div>
              <div className="flex justify-between text-[11px] text-studio-400 mb-1">
                <span>Intensidad de Textura</span>
                <span className="font-mono text-studio-200 font-bold">{(effects.paperOpacity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.20"
                step="0.01"
                value={effects.paperOpacity}
                onChange={e => updateEffects({ paperOpacity: parseFloat(e.target.value) })}
                className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Cinematic Vignette */}
        <div className="pt-2 border-t border-studio-800/60 space-y-2">
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-studio-200 font-semibold text-xs">Viñeta Cinemática (Bordes Oscuros)</span>
            <input
              type="checkbox"
              checked={effects.vignette}
              onChange={e => updateEffects({ vignette: e.target.checked })}
              className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>
          {effects.vignette && (
            <div>
              <div className="flex justify-between text-[11px] text-studio-400 mb-1">
                <span>Oscuridad de la Viñeta</span>
                <span className="font-mono text-studio-200 font-bold">{(effects.vignetteStrength * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.05"
                value={effects.vignetteStrength}
                onChange={e => updateEffects({ vignetteStrength: parseFloat(e.target.value) })}
                className="w-full accent-accent-500 cursor-pointer h-2 bg-studio-800 rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Film Grain */}
        <div className="pt-2 border-t border-studio-800/60 space-y-2">
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-studio-200 font-semibold text-xs">Grano de Película 35mm Vintage</span>
            <input
              type="checkbox"
              checked={effects.filmGrain}
              onChange={e => updateEffects({ filmGrain: e.target.checked })}
              className="accent-accent-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Color Grading */}
        <div className="pt-2 border-t border-studio-800/60 space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300">
            Gradación de Color (LUT)
          </label>
          <select
            value={effects.colorGrade}
            onChange={e => updateEffects({ colorGrade: e.target.value as any })}
            className="w-full bg-studio-900 border border-studio-700/80 rounded-xl px-3 py-2 text-studio-200 text-xs font-medium"
          >
            <option value="vintageWarm">Cálido Vintage (Golden Age Americana)</option>
            <option value="cinematicCold">Frío Cinemático (Película Contemporánea)</option>
            <option value="none">Neutro (Sin filtro)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
