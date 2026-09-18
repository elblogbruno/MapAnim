import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Upload,
  Sparkles,
  Check,
  Disc,
  Sliders,
  Camera,
  Plane,
  Bell,
  Gauge,
  Loader2,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { CURATED_TRACKS, MusicTrack } from '../../core/audio/audioLibrary';
import {
  playCameraShutter,
  playTakeoffWhoosh,
  playArrivalChime,
  playDepartureClick,
} from '../../core/audio/sfxGenerator';
import { uploadAudioTrack } from '../../core/project/cloudStorage';

export const AudioStudioModal: React.FC = () => {
  const isAudioModalOpen = useEditorStore(s => s.isAudioModalOpen);
  const setIsAudioModalOpen = useEditorStore(s => s.setIsAudioModalOpen);

  const project = useProjectStore(s => s.project);
  const updateAudio = useProjectStore(s => s.updateAudio);

  const audioConfig = project.audio || {
    enabled: false,
    volume: 0.7,
    fadeIn: 1,
    fadeOut: 1,
    sfxEnabled: true,
    sfxVolume: 0.7,
  };

  // Preview audio state
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop preview on unmount or modal close
  useEffect(() => {
    if (!isAudioModalOpen && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingTrackId(null);
    }
  }, [isAudioModalOpen]);

  if (!isAudioModalOpen) return null;

  const handleTogglePreview = (track: MusicTrack) => {
    if (previewingTrackId === track.id) {
      // Pause
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingTrackId(null);
    } else {
      // Play new track
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(track.url);
      audio.volume = audioConfig.volume ?? 0.7;
      audio.play().catch(e => console.warn('Preview error:', e));
      previewAudioRef.current = audio;
      setPreviewingTrackId(track.id);

      audio.onended = () => {
        setPreviewingTrackId(null);
      };
    }
  };

  const handleSelectCuratedTrack = (track: MusicTrack) => {
    updateAudio({
      enabled: true,
      trackId: track.id,
      trackName: track.title,
      url: track.url,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('audio/')) {
      setUploadError('Por favor selecciona un archivo de audio válido (.mp3, .wav, .m4a).');
      return;
    }

    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande (máximo 25MB).');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const res = await uploadAudioTrack(file);

      if (res.error || !res.url) {
        setUploadError(res.error || 'Error al subir la pista de audio.');
        return;
      }

      updateAudio({
        enabled: true,
        trackId: 'custom',
        trackName: res.name || file.name.replace(/\.[^/.]+$/, ''),
        url: res.url,
      });
    } catch (err: any) {
      console.error('Audio upload error:', err);
      setUploadError(err?.message || 'Error al subir la pista de audio.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingTrackId(null);
    }
    setIsAudioModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-studio-900/95 border border-studio-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-studio-800 flex items-center justify-between bg-studio-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 text-pink-400">
              <Disc className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Estudio de Audio & Banda Sonora
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Cinematic
                </span>
              </h2>
              <p className="text-xs text-studio-400">
                Música libre de derechos y efectos sonoros sincronizados con tu recorrido
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-studio-400 hover:text-white rounded-lg hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-sm">
          {/* Master Music Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-studio-950/70 border border-studio-800 hover:border-studio-700 transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  audioConfig.enabled
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                    : 'bg-studio-800 text-studio-400'
                }`}
              >
                {audioConfig.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-semibold text-white block">Música de Fondo</span>
                <span className="text-xs text-studio-400">
                  {audioConfig.enabled
                    ? `Pista activa: ${audioConfig.trackName || 'Seleccionada'}`
                    : 'La animación se reproducirá sin música'}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={audioConfig.enabled}
                onChange={e => updateAudio({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-studio-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          {/* Section: Curated Tracks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-studio-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Colección Exclusiva para Rutas
              </span>
              <span className="text-[11px] text-studio-400 font-mono">Royalty-Free 100%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CURATED_TRACKS.map(track => {
                const isSelected = audioConfig.enabled && audioConfig.trackId === track.id;
                const isPreviewing = previewingTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    className={`relative flex flex-col p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-pink-950/20 border-pink-500/60 shadow-lg shadow-pink-950/30'
                        : 'bg-studio-950/50 border-studio-800 hover:border-studio-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">{track.title}</span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-pink-500/30 text-pink-300 border border-pink-500/40">
                              <Check className="w-3 h-3" /> En uso
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-pink-400/90 font-medium">{track.genre}</span>
                      </div>

                      {/* Play Preview Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePreview(track)}
                        className={`p-2 rounded-lg border transition-all ${
                          isPreviewing
                            ? 'bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-500/30 scale-105'
                            : 'bg-studio-850 hover:bg-studio-800 text-studio-300 border-studio-700'
                        }`}
                        title={isPreviewing ? 'Detener muestra' : 'Escuchar muestra'}
                      >
                        {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-studio-400 line-clamp-2 mb-3 flex-1">
                      {track.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-studio-800/80">
                      <span className="text-[10px] text-studio-400 font-medium">
                        {track.vibeTag}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSelectCuratedTrack(track)}
                        disabled={isSelected}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? 'text-studio-500 cursor-default'
                            : 'bg-studio-800 hover:bg-pink-600 hover:text-white text-studio-200 border border-studio-700 hover:border-pink-500 shadow-sm'
                        }`}
                      >
                        {isSelected ? 'Seleccionada' : 'Usar en viaje'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Custom Upload */}
          <div className="p-4 rounded-xl bg-studio-950/50 border border-studio-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-studio-300 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Tu Propia Música (MP3 / WAV / M4A)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 border border-studio-700 hover:border-cyan-500/50 text-cyan-300 hover:text-white text-xs font-semibold shadow-sm transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Cargar archivo de audio</span>
                  </>
                )}
              </button>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/50">
                {uploadError}
              </p>
            )}

            {audioConfig.trackId === 'custom' && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-700/40 text-xs">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-white">{audioConfig.trackName}</span>
                </div>
                <span className="text-[10px] text-cyan-300 font-mono">Pista personalizada activa</span>
              </div>
            )}
          </div>

          {/* Section: Volumes & Timing */}
          {audioConfig.enabled && (
            <div className="p-4 rounded-xl bg-studio-950/50 border border-studio-800 space-y-4">
              <span className="text-xs font-bold text-studio-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-accent-400" />
                Mezclador de Volumen
              </span>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-studio-300">Volumen de Música</span>
                  <span className="font-mono text-pink-400 font-bold">
                    {Math.round((audioConfig.volume ?? 0.7) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioConfig.volume ?? 0.7}
                  onChange={e => updateAudio({ volume: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 bg-studio-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Section: Procedural SFX */}
          <div className="p-4 rounded-xl bg-studio-950/60 border border-purple-900/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white text-xs block">
                    Efectos Sonoros Cinemáticos (SFX)
                  </span>
                  <span className="text-[11px] text-studio-400">
                    Sintetizados en tiempo real con Web Audio API (0ms lag, offline)
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioConfig.sfxEnabled !== false}
                  onChange={e => updateAudio({ sfxEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-studio-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {audioConfig.sfxEnabled !== false && (
              <>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-studio-400 text-[11px]">Volumen de Efectos</span>
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      {Math.round((audioConfig.sfxVolume ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioConfig.sfxVolume ?? 0.7}
                    onChange={e => updateAudio({ sfxVolume: parseFloat(e.target.value) })}
                    className="w-full accent-purple-500 bg-studio-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Soundboard Test Buttons */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] uppercase font-bold text-studio-400 tracking-wider block">
                    Botonera de Prueba (Escucha directa)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => playCameraShutter((audioConfig.sfxVolume ?? 0.7) * 0.9)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-studio-900 hover:bg-studio-800 border border-studio-800 hover:border-purple-500/50 text-studio-200 hover:text-white transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4 text-purple-400" />
                      <span className="text-[10px] font-semibold">Foto Réflex</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playTakeoffWhoosh((audioConfig.sfxVolume ?? 0.7) * 0.9)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-studio-900 hover:bg-studio-800 border border-studio-800 hover:border-cyan-500/50 text-studio-200 hover:text-white transition-all active:scale-95"
                    >
                      <Plane className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-semibold">Despegue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playArrivalChime((audioConfig.sfxVolume ?? 0.7) * 0.9)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-studio-900 hover:bg-studio-800 border border-studio-800 hover:border-emerald-500/50 text-studio-200 hover:text-white transition-all active:scale-95"
                    >
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-semibold">Llegada</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playDepartureClick((audioConfig.sfxVolume ?? 0.7) * 0.9)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg bg-studio-900 hover:bg-studio-800 border border-studio-800 hover:border-amber-500/50 text-studio-200 hover:text-white transition-all active:scale-95"
                    >
                      <Play className="w-4 h-4 text-amber-400 fill-current" />
                      <span className="text-[10px] font-semibold">Arranque</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-studio-800 flex items-center justify-end bg-studio-950/60">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs shadow-lg shadow-pink-600/30 transition-all active:scale-95"
          >
            Guardar y Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
