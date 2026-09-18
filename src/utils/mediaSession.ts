/**
 * MediaSession API utility for lock screen controls, smartwatch integration,
 * notification player and bluetooth headset buttons.
 */

export interface MediaMetadataOptions {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
}

export interface MediaActionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onSeekTo?: (time: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export const isMediaSessionSupported = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'mediaSession' in navigator;
};

export const updateMediaSessionMetadata = (options: MediaMetadataOptions): void => {
  if (!isMediaSessionSupported()) return;

  try {
    const artwork = options.artworkUrl
      ? [
          { src: options.artworkUrl, sizes: '96x96', type: 'image/svg+xml' },
          { src: options.artworkUrl, sizes: '192x192', type: 'image/svg+xml' },
        ]
      : [{ src: '/logo.svg', sizes: '192x192', type: 'image/svg+xml' }];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: options.title || 'Route Motion Studio',
      artist: options.artist || 'MapAnim',
      album: options.album || 'Cinematic Travel Animation',
      artwork,
    });
  } catch {
    // Ignore any MediaSession errors
  }
};

export const setMediaSessionPlaybackState = (state: 'playing' | 'paused' | 'none'): void => {
  if (!isMediaSessionSupported()) return;
  try {
    navigator.mediaSession.playbackState = state;
  } catch {
    // Ignore
  }
};

export const setupMediaSessionHandlers = (handlers: MediaActionHandlers): void => {
  if (!isMediaSessionSupported()) return;

  try {
    if (handlers.onPlay) {
      navigator.mediaSession.setActionHandler('play', () => {
        handlers.onPlay?.();
      });
    }

    if (handlers.onPause) {
      navigator.mediaSession.setActionHandler('pause', () => {
        handlers.onPause?.();
      });
    }

    if (handlers.onSeekTo) {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && handlers.onSeekTo) {
          handlers.onSeekTo(details.seekTime);
        }
      });
    }

    if (handlers.onNext) {
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handlers.onNext?.();
      });
    }

    if (handlers.onPrevious) {
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlers.onPrevious?.();
      });
    }
  } catch {
    // Ignore unsupported action types
  }
};
