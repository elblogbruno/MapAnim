import React, { useEffect, useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import { MapCanvas } from '../map/MapCanvas';
import { useProjectStore } from '../../store/useProjectStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { getProjectByShareSlug } from '../../core/project/cloudStorage';
import { BrandLogo } from '../common/BrandLogo';

export const EmbedPlayer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { project, setProject } = useProjectStore();
  const {
    currentTime,
    duration,
    isPlaying,
    togglePlay,
    seek,
    restart,
    setDuration,
    setFps,
  } = usePlaybackStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Synchronize duration and fps
  useEffect(() => {
    setDuration(project.video.duration);
    setFps(project.video.fps);
  }, [project.video.duration, project.video.fps, setDuration, setFps]);

  // Load project from share slug if present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareSlug = params.get('share');

    if (shareSlug) {
      setIsLoading(true);
      getProjectByShareSlug(shareSlug).then(({ project: loaded }) => {
        setIsLoading(false);
        if (loaded) {
          setProject(loaded, false);
          setDuration(loaded.video.duration);
          setFps(loaded.video.fps);
        }
      });
    } else {
      setIsLoading(false);
    }
  }, [setProject, setDuration, setFps]);

  // Handle Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcut: Space for togglePlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  // Auto-hide controls when playing
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const stopsCount = project.route?.stops?.length || 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[100dvh] bg-black text-white overflow-hidden select-none flex items-center justify-center font-sans"
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 text-studio-400">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Cargando viaje...</p>
        </div>
      ) : (
        <>
          {/* Map Surface */}
          <div className="absolute inset-0 w-full h-full">
            <MapCanvas
              project={project}
              currentTime={currentTime}
              selectedStopId={null}
              onSelectStop={() => {}}
              onUpdateLabelOffset={() => {}}
              showSafeArea={false}
            />
          </div>

          {/* Top Bar Header Overlay */}
          <div
            className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 pointer-events-auto ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandLogo size="sm" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate drop-shadow">
                  {project.metadata?.name || 'Ruta Animada'}
                </p>
                <p className="text-[10px] text-white/75 truncate">
                  {stopsCount} paradas • {Math.round(project.video.duration)}s de viaje
                </p>
              </div>
            </div>

            <a
              href={`${window.location.origin}/?share=${new URLSearchParams(window.location.search).get('share') || ''}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 border border-white/20 text-[11px] font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
            >
              <span>Abrir en MapAnim</span>
              <ExternalLink className="w-3 h-3 text-accent-400" />
            </a>
          </div>

          {/* Bottom Floating Video Player Controls */}
          <div
            className={`absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 z-30 transition-opacity duration-300 pointer-events-auto ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="bg-studio-950/85 backdrop-blur-xl border border-white/15 rounded-2xl p-2 sm:p-3 shadow-2xl flex flex-col gap-2">
              {/* Scrubber Timeline */}
              <div className="relative flex items-center group w-full cursor-pointer">
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-accent-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Player Button Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-xl bg-accent-600 hover:bg-accent-500 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
                    title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={restart}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                    title="Reiniciar viaje"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <span className="text-[11px] font-mono text-white/90 font-semibold ml-1">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={cycleSpeed}
                    className="px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] font-mono font-bold text-white/80 hover:text-white transition-colors"
                    title="Velocidad de reproducción"
                  >
                    {playbackSpeed}x
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                    title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
