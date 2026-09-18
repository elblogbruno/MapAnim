import React from 'react';
import { Play, Pause, RotateCcw, StepBack, StepForward, Repeat, Clock } from 'lucide-react';
import { usePlaybackStore } from '../../store/usePlaybackStore';
import { useProjectStore } from '../../store/useProjectStore';
import { haptics } from '../../utils/haptics';

export const PlaybackControls: React.FC = () => {
  const {
    currentTime,
    duration,
    isPlaying,
    isLooping,
    play,
    pause,
    restart,
    stepFrame,
    setLooping,
  } = usePlaybackStore();

  const { project, updateVideo } = useProjectStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins > 0 ? `${mins}:` : ''}${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDur = parseFloat(e.target.value);
    updateVideo({ duration: newDur });
  };

  return (
    <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-1.5 md:py-2 border-b border-white/[0.08] bg-studio-950/95 select-none gap-1">
      {/* Time display */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0 flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[11px] sm:text-xs md:text-sm font-bold text-studio-100 bg-studio-900/90 border border-studio-800 px-1.5 sm:px-2 py-1 rounded-lg shadow-inner">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPlaying ? 'bg-rose-500 animate-pulse shadow-sm shadow-rose-500' : 'bg-studio-600'}`} />
          <span className="text-accent-400 font-black">{formatTime(currentTime)}</span>
          <span className="text-studio-600 font-normal">/</span>
          <span className="text-studio-400">{formatTime(duration)}</span>
        </div>

        {/* FPS Badge */}
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] md:text-[11px] font-mono font-semibold text-studio-400 bg-studio-900 px-2 py-1 rounded-lg border border-studio-800">
          <Clock className="w-3 h-3 text-studio-500" />
          <span>{project.video.fps} FPS</span>
        </span>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
        <button
          onClick={() => {
            haptics.medium();
            restart();
          }}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg hover:bg-studio-800 text-studio-400 hover:text-studio-100 active:scale-95 transition-all"
          title="Reiniciar animación"
        >
          <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>

        <button
          onClick={() => {
            haptics.light();
            stepFrame(-1);
          }}
          className="hidden sm:flex min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] items-center justify-center rounded-lg hover:bg-studio-800 text-studio-400 hover:text-studio-100 active:scale-95 transition-all"
          title="Fotograma anterior"
        >
          <StepBack className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>

        <button
          onClick={() => {
            haptics.medium();
            if (isPlaying) {
              pause();
            } else {
              play();
            }
          }}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-accent-600 via-rose-600 to-amber-500 hover:brightness-110 text-white shadow-lg shadow-accent-600/30 border border-white/20 active:scale-90 transition-all flex items-center justify-center mx-1"
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          ) : (
            <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={() => {
            haptics.light();
            stepFrame(1);
          }}
          className="hidden sm:flex min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] items-center justify-center rounded-lg hover:bg-studio-800 text-studio-400 hover:text-studio-100 active:scale-95 transition-all"
          title="Siguiente fotograma"
        >
          <StepForward className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>

        <button
          onClick={() => {
            haptics.light();
            setLooping(!isLooping);
          }}
          className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 ${
            isLooping
              ? 'text-accent-400 bg-accent-950/60 border border-accent-800/40'
              : 'text-studio-500 hover:text-studio-300 hover:bg-studio-800'
          }`}
          title={isLooping ? 'Bucle activado' : 'Bucle desactivado'}
        >
          <Repeat className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Duration Selector */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        <span className="hidden sm:inline text-[10px] md:text-[11px] text-studio-400 font-bold uppercase tracking-wider font-mono">
          Duración:
        </span>
        <select
          value={project.video.duration}
          onChange={handleDurationChange}
          className="bg-studio-900 border border-studio-750 text-studio-200 text-[11px] md:text-xs font-mono font-bold rounded-lg px-2 py-1 min-h-[36px] focus:outline-none focus:border-accent-500"
        >
          <option value="8">8s</option>
          <option value="10">10s</option>
          <option value="12">12s</option>
          <option value="15">15s</option>
          <option value="20">20s</option>
          <option value="30">30s</option>
        </select>
      </div>
    </div>
  );
};
