import { usePlaybackStore } from '../../store/usePlaybackStore';
import { useProjectStore } from '../../store/useProjectStore';
import { calculateTimelineSchedule } from '../engine/timingEngine';
import {
  playCameraShutter,
  playTakeoffWhoosh,
  playArrivalChime,
  playDepartureClick,
} from './sfxGenerator';

class AudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrackUrl: string | null = null;
  private isMuted: boolean = false;
  private lastTriggeredTimes = new Set<string>();
  private unsubscribePlayback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    this.audioElement = new Audio();
    this.audioElement.loop = true;
    this.audioElement.preload = 'auto';

    // Subscribe to playback store
    this.unsubscribePlayback = usePlaybackStore.subscribe((state, prevState) => {
      this.syncWithPlayback(state, prevState);
    });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
  }

  public getIsMuted() {
    return this.isMuted;
  }

  private syncWithPlayback(state: any, prevState: any) {
    const project = useProjectStore.getState().project;
    const audioConfig = project.audio;

    if (!audioConfig?.enabled || this.isMuted) {
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause();
      }
      return;
    }

    const musicUrl = audioConfig.url;
    if (!musicUrl) {
      if (this.audioElement && !this.audioElement.paused) {
        this.audioElement.pause();
      }
      return;
    }

    // Switch track if URL changed
    if (this.currentTrackUrl !== musicUrl) {
      this.currentTrackUrl = musicUrl;
      if (this.audioElement) {
        this.audioElement.src = musicUrl;
        this.audioElement.load();
      }
    }

    if (!this.audioElement) return;

    this.audioElement.volume = Math.max(0, Math.min(1, audioConfig.volume ?? 0.7));

    // Handle Play / Pause state
    if (state.isPlaying && !prevState.isPlaying) {
      // Seek to current time modulo duration if needed
      try {
        const audioCurrent = state.currentTime % (this.audioElement.duration || project.video.duration || 12);
        this.audioElement.currentTime = audioCurrent;
        this.audioElement.play().catch(() => {});
      } catch {
        // Autoplay policy fallback
      }
    } else if (!state.isPlaying && prevState.isPlaying) {
      this.audioElement.pause();
    }

    // When scrubbing or resetting
    if (Math.abs(state.currentTime - prevState.currentTime) > 0.4) {
      try {
        const audioCurrent = state.currentTime % (this.audioElement.duration || project.video.duration || 12);
        this.audioElement.currentTime = audioCurrent;
      } catch {
        // Ignore seek error
      }
      // Clear triggered SFX cache if seeking backwards
      if (state.currentTime < prevState.currentTime) {
        this.lastTriggeredTimes.clear();
      }
    }

    // Check for SFX milestones
    if (audioConfig.sfxEnabled !== false && state.isPlaying) {
      this.checkSfxMilestones(project, state.currentTime);
    }
  }

  private checkSfxMilestones(project: any, currentTime: number) {
    const schedule = calculateTimelineSchedule(project);
    const sfxVol = project.audio?.sfxVolume ?? 0.7;

    // 1. Departure Click (at t ~ 0.05)
    if (currentTime >= 0.05 && currentTime <= 0.25 && !this.lastTriggeredTimes.has('departure')) {
      this.lastTriggeredTimes.add('departure');
      playDepartureClick(sfxVol * 0.7);
    }

    // 2. Stops and Photos
    for (let i = 0; i < schedule.stops.length; i++) {
      const slot = schedule.stops[i];
      const stop = project.route.stops[i];
      const arrival = slot.arrivalTime;

      // Stop arrival
      const arrivalKey = `stop_arr_${i}`;
      if (currentTime >= arrival && currentTime <= arrival + 0.2 && !this.lastTriggeredTimes.has(arrivalKey)) {
        this.lastTriggeredTimes.add(arrivalKey);
        if (i === schedule.stops.length - 1) {
          playArrivalChime(sfxVol * 0.9);
        }
      }

      // Photo shutter click (when photo card appears)
      if (stop?.photo && stop.photo.displayMode !== 'disabled') {
        const photoKey = `photo_${i}`;
        if (currentTime >= arrival && currentTime <= arrival + 0.25 && !this.lastTriggeredTimes.has(photoKey)) {
          this.lastTriggeredTimes.add(photoKey);
          playCameraShutter(sfxVol * 0.8);
        }
      }
    }

    // 3. Flight takeoff whoosh
    for (let i = 0; i < schedule.segments.length; i++) {
      const segSlot = schedule.segments[i];
      const seg = project.route.segments[i];
      if (seg?.travelMode === 'airplane' || seg?.routeMode === 'arc') {
        const flightKey = `flight_${i}`;
        if (currentTime >= segSlot.startTime && currentTime <= segSlot.startTime + 0.3 && !this.lastTriggeredTimes.has(flightKey)) {
          this.lastTriggeredTimes.add(flightKey);
          playTakeoffWhoosh(sfxVol * 0.85);
        }
      }
    }
  }

  public cleanup() {
    if (this.unsubscribePlayback) {
      this.unsubscribePlayback();
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }
}

export const audioEngine = new AudioEngine();
