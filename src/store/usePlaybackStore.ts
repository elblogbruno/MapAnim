import { create } from 'zustand';

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  duration: number;
  fps: number;

  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setLooping: (loop: boolean) => void;
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  stepFrame: (frames: number) => void;
  restart: () => void;
}

let animFrameId: number | null = null;
let startRealTime = 0;
let startTimelineTime = 0;

export const usePlaybackStore = create<PlaybackState>((set, get) => {
  const loopPlayback = () => {
    const { isPlaying, duration, isLooping } = get();
    if (!isPlaying) return;

    const now = performance.now();
    const elapsedSeconds = (now - startRealTime) / 1000;
    let nextTime = startTimelineTime + elapsedSeconds;

    if (nextTime >= duration) {
      if (isLooping) {
        startRealTime = performance.now();
        startTimelineTime = 0;
        nextTime = 0;
        set({ currentTime: 0 });
      } else {
        set({ currentTime: duration, isPlaying: false });
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameId = null;
        return;
      }
    } else {
      set({ currentTime: nextTime });
    }

    animFrameId = requestAnimationFrame(loopPlayback);
  };

  return {
    currentTime: 0,
    isPlaying: false,
    isLooping: true,
    duration: 12.0,
    fps: 30,

    play: () => {
      const { currentTime, duration } = get();
      startRealTime = performance.now();
      startTimelineTime = currentTime >= duration ? 0 : currentTime;

      set({ isPlaying: true, currentTime: startTimelineTime });
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(loopPlayback);
    },

    pause: () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      set({ isPlaying: false });
    },

    togglePlay: () => {
      const { isPlaying, play, pause } = get();
      if (isPlaying) pause();
      else play();
    },

    seek: (time: number) => {
      const { duration, isPlaying } = get();
      const clamped = Math.max(0, Math.min(duration, time));
      startRealTime = performance.now();
      startTimelineTime = clamped;
      set({ currentTime: clamped });

      if (!isPlaying && animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    },

    setLooping: (loop: boolean) => set({ isLooping: loop }),
    setDuration: (duration: number) => set({ duration }),
    setFps: (fps: number) => set({ fps }),

    stepFrame: (frames: number) => {
      const { currentTime, fps, duration, pause, seek } = get();
      pause();
      const frameDuration = 1 / (fps || 30);
      const targetTime = Math.max(0, Math.min(duration, currentTime + frames * frameDuration));
      seek(targetTime);
    },

    restart: () => {
      get().seek(0);
      get().play();
    },
  };
});

if (typeof window !== 'undefined') {
  (window as any).__playbackStore = usePlaybackStore.getState();
  usePlaybackStore.subscribe(state => {
    (window as any).__playbackStore = state;
  });
}
