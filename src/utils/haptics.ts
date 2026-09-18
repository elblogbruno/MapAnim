/**
 * Haptic feedback utility using Web Vibration API.
 * Provides subtle tactile feedback on mobile devices for native-like touch response.
 * Safely degrades on unsupported platforms (e.g. desktop or iOS Safari where vibrate is a no-op).
 */

class Haptics {
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  /**
   * Ultra-light tap feedback (e.g. chip click, menu navigation, stop stepper)
   */
  light(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(8);
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Medium feedback (e.g. play/pause, toggle switch, modal open)
   */
  medium(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(15);
    } catch {
      // Ignore
    }
  }

  /**
   * Selection tick (e.g. tab switch, timeline scrubbing, stop reordering drag)
   */
  selection(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(6);
    } catch {
      // Ignore
    }
  }

  /**
   * Heavy impact (e.g. delete stop, reset camera)
   */
  heavy(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(28);
    } catch {
      // Ignore
    }
  }

  /**
   * Success notification pattern (e.g. export finished, route saved)
   */
  success(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate([12, 40, 18]);
    } catch {
      // Ignore
    }
  }

  /**
   * Error / Warning pattern
   */
  error(): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate([20, 40, 20, 40]);
    } catch {
      // Ignore
    }
  }
}

export const haptics = new Haptics();
