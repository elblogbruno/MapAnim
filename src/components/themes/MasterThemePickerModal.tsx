import React from 'react';
import { X, Sparkles, Check, Globe, Video, Route } from 'lucide-react';
import { MASTER_THEMES, MasterTheme } from '../../core/providers/masterThemes';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';

export const MasterThemePickerModal: React.FC = () => {
  const { isThemePickerOpen, setIsThemePickerOpen } = useEditorStore();
  const { project, applyMasterTheme } = useProjectStore();

  if (!isThemePickerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-studio-900 border border-studio-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-studio-800 flex items-center justify-between bg-studio-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-accent-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Visual Master Themes
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
                  1-Click Styles
                </span>
              </h2>
              <p className="text-xs text-studio-400">
                Instantly transform the entire cartography, 3D camera motion, vehicle, and route aesthetic.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsThemePickerOpen(false)}
            className="p-2 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {MASTER_THEMES.map((theme: MasterTheme) => {
            const isCurrent =
              project.map.stylePreset === theme.mapStyleId &&
              project.route.defaultLineStyle.color.toLowerCase() === theme.routeColor.toLowerCase();

            return (
              <div
                key={theme.id}
                onClick={() => {
                  applyMasterTheme(theme.id);
                  setIsThemePickerOpen(false);
                }}
                className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isCurrent
                    ? 'border-accent-500 bg-studio-850 shadow-xl ring-2 ring-accent-500/40'
                    : 'border-studio-800 bg-studio-950/70 hover:border-studio-600 hover:bg-studio-850/80 hover:shadow-lg'
                }`}
              >
                {/* Background ambient gradient */}
                <div
                  className={`absolute -right-10 -top-10 w-36 h-36 rounded-full bg-gradient-to-br ${theme.gradient} opacity-20 blur-2xl group-hover:opacity-35 transition-opacity`}
                />

                <div>
                  {/* Badge & Check */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-studio-800/80 text-studio-300 border border-studio-700/60 flex items-center gap-1">
                      <span>{theme.iconEmoji}</span>
                      <span>{theme.badge}</span>
                    </span>
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-accent-400 bg-accent-500/15 px-2 py-0.5 rounded-full border border-accent-500/30">
                        <Check className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-studio-500 group-hover:text-accent-400 font-semibold transition-colors">
                        Click to apply →
                      </span>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-sm font-bold text-white group-hover:text-accent-300 transition-colors">
                    {theme.name}
                  </h3>
                  <p className="text-xs text-studio-400 mt-1 line-clamp-2 leading-relaxed">
                    {theme.tagline}
                  </p>
                </div>

                {/* Specs Chips */}
                <div className="mt-4 pt-3 border-t border-studio-800/80 grid grid-cols-3 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 text-studio-400">
                    <Route className="w-3 h-3 flex-shrink-0" style={{ color: theme.routeColor }} />
                    <span className="truncate">{theme.dashPattern ? 'Dashed' : 'Solid Glow'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-studio-400">
                    <Globe className="w-3 h-3 text-studio-400 flex-shrink-0" />
                    <span className="truncate capitalize">{theme.projection} 3D</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-studio-400">
                    <Video className="w-3 h-3 text-studio-400 flex-shrink-0" />
                    <span className="truncate">{theme.cameraPitch}° Tilt</span>
                  </div>
                </div>

                {/* Visual Color Preview Bar */}
                <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden bg-studio-800 flex">
                  <div className="h-full flex-1" style={{ backgroundColor: theme.routeColor }} />
                  <div className="h-full w-8" style={{ backgroundColor: theme.labelBg }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-studio-950 border-t border-studio-800/80 flex items-center justify-between text-xs text-studio-400">
          <span>You can still fine-tune all individual parameters in the right sidebar.</span>
          <button
            onClick={() => setIsThemePickerOpen(false)}
            className="px-4 py-1.5 bg-studio-800 hover:bg-studio-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
