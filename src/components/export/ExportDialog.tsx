import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Download, Loader2, Sparkles, Video, Share2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { BrandLogo } from '../common/BrandLogo';
import { getRenderDimensions } from '../../core/project/video';
import { haptics } from '../../utils/haptics';
import { nativeShare, canNativeShare } from '../../utils/nativeShare';
import { useTouchDragToDismiss } from '../../hooks/useTouchDragToDismiss';

export const ExportDialog: React.FC = () => {
  const { isExportDialogOpen, setIsExportDialogOpen } = useEditorStore();
  const { project } = useProjectStore();

  const { dragProps, sheetStyle } = useTouchDragToDismiss({
    onDismiss: () => setIsExportDialogOpen(false),
  });

  const [preset, setPreset] = useState<'h264' | 'prores' | 'overlay'>('h264');
  const [resolution, setResolution] = useState<'1080p' | '4k' | '720p'>('1080p');
  const [fps, setFps] = useState<number>(project.video.fps);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [completedUrl, setCompletedUrl] = useState<string | null>(null);
  const [completedBlob, setCompletedBlob] = useState<Blob | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const pollIntervalRef = React.useRef<any>(null);

  useEffect(() => {
    if (isExportDialogOpen) setFps(project.video.fps);
  }, [isExportDialogOpen, project.video.fps]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!isExportDialogOpen) return null;

  const totalFrames = Math.round(project.video.duration * fps);
  const renderDimensions = getRenderDimensions(project.video.width, project.video.height, resolution, project.video.aspectRatio);

  const resetCompletedExport = () => {
    if (completedUrl) URL.revokeObjectURL(completedUrl);
    setCompletedUrl(null);
    setCompletedBlob(null);
    setProgress(0);
  };

  const handleCancelExport = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    try {
      await fetch('/api/render/cancel', { method: 'POST' });
    } catch {}
    setIsExporting(false);
    setProgress(0);
    setStatusMessage('Export cancelled.');
  };

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(2);
    setStatusMessage(`Preparing ${resolution.toUpperCase()} render (${totalFrames} frames)...`);

    if (completedUrl) URL.revokeObjectURL(completedUrl);
    setCompletedUrl(null);
    setCompletedBlob(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Start polling render progress from backend every 400ms
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/render/status');
        if (res.ok) {
          const data = await res.json();
          if (data.rendering) {
            setProgress(data.percent || 2);
            if (data.message) setStatusMessage(data.message);
          }
        }
      } catch {}
    }, 400);

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, preset, resolution, fps }),
        signal: abortController.signal,
      });
      if (!response.ok) throw new Error(await response.text());

      const blob = await response.blob();
      setCompletedUrl(URL.createObjectURL(blob));
      setCompletedBlob(blob);
      setProgress(100);
      setStatusMessage('Export completed successfully!');
      haptics.success();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatusMessage('Export was cancelled.');
        setProgress(0);
      } else {
        console.error(err);
        setStatusMessage('Export error: ' + (err.message || 'Unknown error'));
      }
    } finally {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      abortControllerRef.current = null;
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!completedBlob) return;
    haptics.medium();
    const extension = preset === 'h264' ? 'mp4' : 'mov';
    const mimeType = preset === 'h264' ? 'video/mp4' : 'video/quicktime';
    const filename = `${project.metadata.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${resolution}_${project.video.aspectRatio.replace(':', 'x')}.${extension}`;
    const file = new File([completedBlob], filename, { type: mimeType });

    await nativeShare({
      title: project.metadata.name || 'Mi ruta animada',
      text: '¡Mira mi animación de viaje creada con Route Motion Studio!',
      files: [file],
    });
  };

  const handleDownload = () => {
    if (!completedUrl) return;
    haptics.light();
    const a = document.createElement('a');
    a.href = completedUrl;
    const extension = preset === 'h264' ? 'mp4' : 'mov';
    a.download = `${project.metadata.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${resolution}_${project.video.aspectRatio.replace(':', 'x')}.${extension}`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-fade-in pointer-events-auto">
      <div
        style={!isExporting ? sheetStyle : undefined}
        className="bg-studio-950 border border-white/[0.12] rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92dvh] pb-safe"
      >
        {/* Mobile Drag Indicator and Header (Touch Drag Zone) */}
        <div
          {...(!isExporting ? dragProps : {})}
          className="touch-none select-none cursor-grab active:cursor-grabbing bg-studio-900/60 flex-shrink-0"
        >
          <div className="py-2.5 flex items-center justify-center sm:hidden">
            <div className="w-12 h-1.5 bg-studio-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-3.5 pb-3 md:p-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <BrandLogo size="sm" />
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-tight font-display">
                  Estudio de Exportación de Video
                </h3>
                <p className="text-[9px] sm:text-[10px] text-studio-400 font-mono uppercase tracking-wider">
                  Sintetizador de Fotogramas Determinista
                </p>
              </div>
            </div>
            {!isExporting && (
              <button
                type="button"
                onClick={() => setIsExportDialogOpen(false)}
                className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div
          data-scrollable="true"
          className="p-4 md:p-5 space-y-4 text-xs overflow-y-auto flex-1 touch-pan-y overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          {/* Project Summary Banner */}
          <div className="bg-studio-900/90 border border-studio-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-600/20 border border-accent-500/30 flex items-center justify-center text-accent-400">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">{project.metadata.name}</span>
                <span className="text-[10px] text-studio-400 font-mono">
                  {project.route.stops.length} Stops • {project.video.duration}s Duration
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-studio-800 text-studio-200 font-mono text-[10px] font-bold border border-studio-700">
                {project.video.aspectRatio}
              </span>
              <span className="px-2 py-0.5 rounded bg-accent-950 text-accent-300 font-mono text-[10px] font-bold border border-accent-800/60">
                {renderDimensions.width}×{renderDimensions.height}
              </span>
            </div>
          </div>

          {/* DaVinci Resolve / NLE Presets */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300 mb-2">
              Encoding Profile & Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { resetCompletedExport(); setPreset('h264'); }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  preset === 'h264'
                    ? 'bg-gradient-to-br from-accent-600/20 to-rose-600/10 border-accent-500 text-white shadow-md shadow-accent-600/10'
                    : 'bg-studio-900/60 border-studio-800 text-studio-400 hover:bg-studio-850'
                }`}
              >
                <span className="font-bold text-xs text-white">DaVinci H.264</span>
                <span className="text-[10px] text-studio-400 mt-1">MP4 High yuv420p</span>
              </button>

              <button
                type="button"
                onClick={() => { resetCompletedExport(); setPreset('prores'); }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  preset === 'prores'
                    ? 'bg-gradient-to-br from-accent-600/20 to-rose-600/10 border-accent-500 text-white shadow-md shadow-accent-600/10'
                    : 'bg-studio-900/60 border-studio-800 text-studio-400 hover:bg-studio-850'
                }`}
              >
                <span className="font-bold text-xs text-white">Master ProRes</span>
                <span className="text-[10px] text-studio-400 mt-1">ProRes 422 HQ</span>
              </button>

              <button
                type="button"
                onClick={() => { resetCompletedExport(); setPreset('overlay'); }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  preset === 'overlay'
                    ? 'bg-gradient-to-br from-accent-600/20 to-rose-600/10 border-accent-500 text-white shadow-md shadow-accent-600/10'
                    : 'bg-studio-900/60 border-studio-800 text-studio-400 hover:bg-studio-850'
                }`}
              >
                <span className="font-bold text-xs text-white">Alpha Overlay</span>
                <span className="text-[10px] text-studio-400 mt-1">Transparent Layer</span>
              </button>
            </div>
          </div>

          {/* Resolution & Framerate Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300 mb-1.5">
                Output Resolution
              </label>
              <select
                value={resolution}
                onChange={e => { resetCompletedExport(); setResolution(e.target.value as any); }}
                className="w-full bg-studio-900 border border-studio-700/80 rounded-lg px-2.5 py-2 text-xs font-semibold text-studio-100 focus:outline-none focus:border-accent-500"
              >
                <option value="1080p">1080p Full HD (1920×1080)</option>
                <option value="4k">4K Ultra HD (3840×2160)</option>
                <option value="720p">720p HD (1280×720)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-studio-300 mb-1.5">
                Frame Rate (FPS)
              </label>
              <select
                value={fps}
                onChange={e => { resetCompletedExport(); setFps(parseInt(e.target.value, 10)); }}
                className="w-full bg-studio-900 border border-studio-700/80 rounded-lg px-2.5 py-2 text-xs font-semibold text-studio-100 focus:outline-none focus:border-accent-500"
              >
                <option value="60">60 FPS (Ultra Smooth Cinema)</option>
                <option value="30">30 FPS (Standard Web)</option>
                <option value="24">24 FPS (Film Cadence)</option>
                <option value="25">25 FPS (PAL Broadcast)</option>
              </select>
            </div>
          </div>

          {/* Performance Estimate Hint */}
          <div className="text-[11px] rounded-lg p-2.5 border font-mono">
            {resolution === '4k' ? (
              <div className="text-amber-300/90 bg-amber-950/30 border-amber-800/40 -m-2.5 p-2.5 rounded-lg flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <div>
                  <strong>4K Ultra HD ({renderDimensions.width}×{renderDimensions.height})</strong>: {totalFrames} frames.
                  <span className="text-amber-400/80 block text-[10px]">Estimated render: ~{fps === 60 ? '1.5–2.5' : '1'} min. Live frame-by-frame progress updates below.</span>
                </div>
              </div>
            ) : (
              <div className="text-blue-300/90 bg-blue-950/30 border-blue-800/40 -m-2.5 p-2.5 rounded-lg flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <div>
                  <strong>{resolution.toUpperCase()} ({renderDimensions.width}×{renderDimensions.height})</strong>: {totalFrames} frames.
                  <span className="text-blue-400/80 block text-[10px]">Estimated render: ~20–40 seconds.</span>
                </div>
              </div>
            )}
          </div>

          {/* Export Progress State */}
          {isExporting && (
            <div className="bg-studio-900/90 border border-studio-750 rounded-xl p-3.5 space-y-2.5 animate-fade-in">
              <div className="flex justify-between items-center text-xs">
                <span className="text-studio-300 font-semibold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-500" />
                  <span>Synthesizing Video...</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-accent-400 font-bold">{progress}%</span>
                  <button
                    type="button"
                    onClick={handleCancelExport}
                    className="px-2 py-0.5 rounded bg-red-950/70 border border-red-800/60 text-red-300 hover:bg-red-900 text-[10px] font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <div className="w-full bg-studio-950 rounded-full h-2 overflow-hidden p-0.5 border border-studio-800">
                <div
                  className="bg-gradient-to-r from-accent-600 via-rose-500 to-amber-500 h-full rounded-full transition-all duration-150 shadow-sm shadow-accent-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-studio-300 font-mono truncate">{statusMessage}</p>
            </div>
          )}

          {/* Success State */}
          {completedUrl && !isExporting && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 space-y-3 text-emerald-300 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs block text-white">Video Renderizado con Éxito</span>
                  <span className="text-[11px] text-emerald-400/90 font-mono truncate block">
                    Listo para compartir en redes o guardar en tu carrete
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                {canNativeShare() && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-600 via-rose-600 to-amber-500 hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-lg shadow-accent-600/30 transition-all min-h-[44px] active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartir en el Teléfono</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownload}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2.5 bg-studio-900 hover:bg-studio-800 text-studio-200 border border-studio-700/80 rounded-xl text-xs font-bold shadow transition-colors min-h-[44px] active:scale-95 ${
                    canNativeShare() ? 'sm:flex-initial' : 'w-full'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-studio-900/60 flex items-center justify-end gap-2 flex-shrink-0">
          {isExporting ? (
            <button
              type="button"
              onClick={handleCancelExport}
              className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white text-xs font-semibold border border-red-800/60 transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <X className="w-4 h-4" />
              <span>Cancelar Render</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsExportDialogOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-studio-900 hover:bg-studio-800 text-studio-300 hover:text-white text-xs font-semibold border border-studio-750 transition-colors min-h-[44px]"
            >
              Cerrar
            </button>
          )}

          {!completedUrl && (
            <button
              type="button"
              disabled={isExporting}
              onClick={handleStartExport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-600 via-rose-600 to-amber-600 hover:brightness-110 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-accent-600/30 border border-white/20 transition-all active:scale-95 min-h-[44px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Renderizando ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Iniciar Exportación</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
