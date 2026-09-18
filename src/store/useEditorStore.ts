import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import { usePlaybackStore } from './usePlaybackStore';
import { calculateTimelineSchedule } from '../core/engine/timingEngine';

export type EditorTab = 'stops' | 'route' | 'camera' | 'style' | 'effects' | 'overlays';
export type MobileTab = 'preview' | 'itinerary' | 'inspector';
export type InspectorMode = 'visual' | 'pro';

interface EditorState {
  activeTab: EditorTab;
  mobileTab: MobileTab;
  inspectorMode: InspectorMode;
  selectedStopId: string | null;
  selectedSegmentId: string | null;
  focusStopCounter: number;
  resetCameraCounter: number;
  fitRouteCounter: number;
  isAddStopModalOpen: boolean;
  isGpxModalOpen: boolean;
  isExportDialogOpen: boolean;
  isAiChatOpen: boolean;
  isProjectsManagerOpen: boolean;
  isThemePickerOpen: boolean;
  isShareModalOpen: boolean;
  isAudioModalOpen: boolean;
  showSafeArea: boolean;
  showDebugOverlay: boolean;
  previewQuality: 'draft' | 'high';
  isMapInteracting: boolean;

  setActiveTab: (tab: EditorTab) => void;
  setMobileTab: (tab: MobileTab) => void;
  setInspectorMode: (mode: InspectorMode) => void;
  setSelectedStopId: (id: string | null) => void;
  focusStop: (id: string) => void;
  resetCameraPosition: () => void;
  fitRouteOverview: () => void;
  setSelectedSegmentId: (id: string | null) => void;
  setIsAddStopModalOpen: (open: boolean) => void;
  setIsGpxModalOpen: (open: boolean) => void;
  setIsExportDialogOpen: (open: boolean) => void;
  setIsAiChatOpen: (open: boolean) => void;
  setIsProjectsManagerOpen: (open: boolean) => void;
  setIsThemePickerOpen: (open: boolean) => void;
  setIsShareModalOpen: (open: boolean) => void;
  setIsAudioModalOpen: (open: boolean) => void;
  setShowSafeArea: (show: boolean) => void;
  setShowDebugOverlay: (show: boolean) => void;
  setPreviewQuality: (quality: 'draft' | 'high') => void;
  setIsMapInteracting: (interacting: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  activeTab: 'stops',
  mobileTab: 'preview',
  inspectorMode: 'visual',
  selectedStopId: null,
  selectedSegmentId: null,
  focusStopCounter: 0,
  resetCameraCounter: 0,
  fitRouteCounter: 0,
  isAddStopModalOpen: false,
  isGpxModalOpen: false,
  isExportDialogOpen: false,
  isAiChatOpen: false,
  isProjectsManagerOpen: true,
  isThemePickerOpen: false,
  isShareModalOpen: false,
  isAudioModalOpen: false,
  showSafeArea: false,
  showDebugOverlay: false,
  previewQuality: 'high',
  isMapInteracting: false,

  setActiveTab: (activeTab) => set({ activeTab }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
  setInspectorMode: (inspectorMode) => set({ inspectorMode }),
  focusStop: (selectedStopId) => {
    set((state) => ({
      selectedStopId,
      selectedSegmentId: null,
      focusStopCounter: state.focusStopCounter + 1,
    }));
    try {
      const project = useProjectStore.getState().project;
      const playback = usePlaybackStore.getState();
      if (playback.isPlaying) {
        playback.pause();
      }
      const schedule = calculateTimelineSchedule(project);
      const stopSlot = schedule.stops.find(s => s.stopId === selectedStopId);
      if (stopSlot) {
        playback.seek(stopSlot.arrivalTime);
      }
    } catch (err) {
      console.warn('Auto-seek to stop error:', err);
    }
  },
  setSelectedStopId: (selectedStopId) => {
    if (selectedStopId) {
      get().focusStop(selectedStopId);
    } else {
      set({ selectedStopId: null, selectedSegmentId: null });
    }
  },
  resetCameraPosition: () => {
    set((state) => ({
      selectedStopId: null,
      selectedSegmentId: null,
      resetCameraCounter: state.resetCameraCounter + 1,
    }));
  },
  fitRouteOverview: () => {
    set((state) => ({
      selectedStopId: null,
      selectedSegmentId: null,
      fitRouteCounter: state.fitRouteCounter + 1,
    }));
  },
  setSelectedSegmentId: (selectedSegmentId) => set({ selectedSegmentId, selectedStopId: null }),
  setIsAddStopModalOpen: (isAddStopModalOpen) => set({ isAddStopModalOpen }),
  setIsGpxModalOpen: (isGpxModalOpen) => set({ isGpxModalOpen }),
  setIsExportDialogOpen: (isExportDialogOpen) => set({ isExportDialogOpen }),
  setIsAiChatOpen: (isAiChatOpen) => set({ isAiChatOpen }),
  setIsProjectsManagerOpen: (isProjectsManagerOpen) => set({ isProjectsManagerOpen }),
  setIsThemePickerOpen: (isThemePickerOpen) => set({ isThemePickerOpen }),
  setIsShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),
  setIsAudioModalOpen: (isAudioModalOpen) => set({ isAudioModalOpen }),
  setShowSafeArea: (showSafeArea) => set({ showSafeArea }),
  setShowDebugOverlay: (showDebugOverlay) => set({ showDebugOverlay }),
  setPreviewQuality: (previewQuality) => set({ previewQuality }),
  setIsMapInteracting: (isMapInteracting) => set({ isMapInteracting }),
}));
