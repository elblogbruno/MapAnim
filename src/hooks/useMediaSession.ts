import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useEditorStore } from '../store/useEditorStore';
import {
  updateMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setupMediaSessionHandlers,
  isMediaSessionSupported,
} from '../utils/mediaSession';
import { haptics } from '../utils/haptics';

export const useMediaSession = () => {
  const project = useProjectStore(state => state.project);
  const isPlaying = usePlaybackStore(state => state.isPlaying);

  // Update Media Metadata when project route changes
  useEffect(() => {
    if (!isMediaSessionSupported()) return;

    const stopCount = project.route.stops.length;
    const totalKm = (
      project.route.segments.reduce((acc, s) => acc + (s.distanceMeters || 0), 0) / 1000
    ).toFixed(0);

    updateMediaSessionMetadata({
      title: project.metadata.name || 'Mi Ruta de Viaje',
      artist: 'Route Motion Studio',
      album: `${stopCount} ${stopCount === 1 ? 'parada' : 'paradas'} • ${totalKm} km`,
      artworkUrl: '/logo.svg',
    });
  }, [project.metadata.name, project.route.stops.length, project.route.segments]);

  // Sync playback state (playing vs paused)
  useEffect(() => {
    if (!isMediaSessionSupported()) return;
    setMediaSessionPlaybackState(isPlaying ? 'playing' : 'paused');
  }, [isPlaying]);

  // Register native media action controls
  useEffect(() => {
    if (!isMediaSessionSupported()) return;

    setupMediaSessionHandlers({
      onPlay: () => {
        haptics.medium();
        usePlaybackStore.getState().play();
      },
      onPause: () => {
        haptics.medium();
        usePlaybackStore.getState().pause();
      },
      onSeekTo: (targetTime: number) => {
        haptics.selection();
        usePlaybackStore.getState().seek(targetTime);
      },
      onNext: () => {
        const stops = useProjectStore.getState().project.route.stops;
        const currentStopId = useEditorStore.getState().selectedStopId;
        const currentIndex = stops.findIndex(s => s.id === currentStopId);
        if (currentIndex < stops.length - 1) {
          haptics.light();
          useEditorStore.getState().focusStop(stops[currentIndex + 1].id);
        }
      },
      onPrevious: () => {
        const stops = useProjectStore.getState().project.route.stops;
        const currentStopId = useEditorStore.getState().selectedStopId;
        const currentIndex = stops.findIndex(s => s.id === currentStopId);
        if (currentIndex > 0) {
          haptics.light();
          useEditorStore.getState().focusStop(stops[currentIndex - 1].id);
        }
      },
    });
  }, []);
};
