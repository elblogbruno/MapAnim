import { create } from 'zustand';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'local';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;

  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  markSyncing: () => void;
  markSynced: () => void;
  markError: (error: string) => void;
  markLocal: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'local',
  lastSyncedAt: null,
  errorMessage: null,

  setSyncStatus: (status, error = null) => {
    set({
      status,
      errorMessage: error,
      lastSyncedAt: status === 'synced' ? new Date() : undefined,
    });
  },

  markSyncing: () => {
    set({ status: 'syncing', errorMessage: null });
  },

  markSynced: () => {
    set({ status: 'synced', lastSyncedAt: new Date(), errorMessage: null });
  },

  markError: (error: string) => {
    set({ status: 'error', errorMessage: error });
  },

  markLocal: () => {
    set({ status: 'local', errorMessage: null });
  },
}));
