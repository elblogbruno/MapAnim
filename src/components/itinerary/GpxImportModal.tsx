import React, { useState } from 'react';
import { Upload, CheckCircle2, X } from 'lucide-react';
import { parseGpx, parseGeoJson, ParsedGpsData } from '../../core/providers/routing/gpxGeojsonProvider';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';
import { RouteStop } from '../../core/types/project';
import { useTouchDragToDismiss } from '../../hooks/useTouchDragToDismiss';

export const GpxImportModal: React.FC = () => {
  const { isGpxModalOpen, setIsGpxModalOpen } = useEditorStore();
  const { addStop } = useProjectStore();

  const { dragProps, sheetStyle } = useTouchDragToDismiss({
    onDismiss: () => setIsGpxModalOpen(false),
  });

  const [parsedData, setParsedData] = useState<ParsedGpsData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isGpxModalOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      let data: ParsedGpsData;

      if (file.name.endsWith('.gpx')) {
        data = parseGpx(text);
      } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
        data = parseGeoJson(text);
      } else {
        throw new Error('Unsupported format. Please provide a .gpx or .geojson file.');
      }

      if (data.waypoints.length === 0 && data.tracks.length === 0) {
        throw new Error('No valid track or waypoint coordinates found in file.');
      }

      setParsedData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse GPS file.');
    }
  };

  const handleImportWaypoints = async () => {
    if (!parsedData) return;

    // If waypoints exist, add them
    if (parsedData.waypoints.length > 0) {
      for (const wpt of parsedData.waypoints) {
        const stopId = `stop_gpx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const newStop: RouteStop = {
          id: stopId,
          canonicalName: wpt.name,
          displayName: wpt.name.toUpperCase(),
          coordinates: { lng: wpt.coordinates[0], lat: wpt.coordinates[1] },
          visible: true,
          behavior: 'highlight',
          pauseDuration: 0.3,
          cameraPriority: 2,
          labelPriority: 2,
        };
        await addStop(newStop);
      }
    } else if (parsedData.tracks.length > 0) {
      // Subsample track points as stops
      const track = parsedData.tracks[0];
      const coords = track.coordinates;
      const step = Math.max(1, Math.floor(coords.length / 8));

      for (let i = 0; i < coords.length; i += step) {
        const pt = coords[i];
        const stopId = `stop_trk_${i}_${Date.now()}`;
        const name = i === 0 ? 'START' : i + step >= coords.length ? 'DESTINATION' : `WAYPOINT ${Math.floor(i / step) + 1}`;
        const newStop: RouteStop = {
          id: stopId,
          canonicalName: `${name} [${pt[1].toFixed(3)}, ${pt[0].toFixed(3)}]`,
          displayName: name,
          coordinates: { lng: pt[0], lat: pt[1] },
          visible: true,
          behavior: i === 0 || i + step >= coords.length ? 'highlight' : 'passThrough',
          pauseDuration: 0.3,
          cameraPriority: 2,
          labelPriority: 2,
        };
        await addStop(newStop);
      }
    }

    setIsGpxModalOpen(false);
    setParsedData(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in pointer-events-auto">
      <div
        style={sheetStyle}
        className="bg-studio-900 border border-studio-750 rounded-t-3xl sm:rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] pb-safe"
      >
        {/* Mobile Drag Indicator and Header (Touch Drag Zone) */}
        <div {...dragProps} className="touch-none select-none cursor-grab active:cursor-grabbing bg-studio-900 flex-shrink-0">
          <div className="py-2.5 flex items-center justify-center sm:hidden">
            <div className="w-12 h-1.5 bg-studio-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-3.5 pb-3 md:p-4 border-b border-studio-800">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 md:w-5 md:h-5 text-accent-500" />
              <h3 className="font-bold text-xs md:text-sm text-studio-100 uppercase tracking-wide">
                Importar Ruta GPS (GPX / GeoJSON)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsGpxModalOpen(false)}
              className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          data-scrollable="true"
          className="p-4 space-y-3.5 overflow-y-auto flex-1 touch-pan-y overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          <label className="border-2 border-dashed border-studio-700 hover:border-accent-500/80 rounded-2xl p-6 md:p-7 flex flex-col items-center justify-center cursor-pointer transition-colors bg-studio-950/40 active:bg-studio-950/70">
            <Upload className="w-8 h-8 md:w-9 md:h-9 text-studio-400 mb-2.5" />
            <span className="text-xs font-bold text-studio-200 text-center">
              Toca para seleccionar archivo .GPX o .GeoJSON
            </span>
            <span className="text-[11px] text-studio-500 mt-1 text-center">
              Compatible con Garmin, Strava, Wikiloc y rutas GPS
            </span>
            <input
              type="file"
              accept=".gpx,.geojson,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {parsedData && (
            <div className="p-3.5 bg-studio-950 border border-studio-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Leído: {fileName}</span>
              </div>
              <div className="text-[11px] text-studio-400 space-y-1 font-mono">
                <div>Trazados detectados: {parsedData.tracks.length}</div>
                <div>Waypoints encontrados: {parsedData.waypoints.length}</div>
                {parsedData.tracks[0] && (
                  <div>Puntos de coordenadas: {parsedData.tracks[0].coordinates.length}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 md:p-4 border-t border-studio-800 bg-studio-950 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={() => setIsGpxModalOpen(false)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-studio-400 hover:text-white transition-colors min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            disabled={!parsedData}
            onClick={handleImportWaypoints}
            className="px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shadow-md min-h-[44px] active:scale-95"
          >
            Importar Puntos
          </button>
        </div>
      </div>
    </div>
  );
};
