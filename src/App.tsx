import React, { useEffect, useState } from 'react';
import { TopHeader } from './components/layout/TopHeader';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { MobileQuickControls } from './components/layout/MobileQuickControls';
import { ItineraryList } from './components/itinerary/ItineraryList';
import { MapCanvas } from './components/map/MapCanvas';
import { RightInspector } from './components/inspector/RightInspector';
import { BottomTimeline } from './components/timeline/BottomTimeline';
import { AddStopModal } from './components/itinerary/AddStopModal';
import { GpxImportModal } from './components/itinerary/GpxImportModal';
import { ExportDialog } from './components/export/ExportDialog';
import { AiChatDrawer } from './components/ai/AiChatDrawer';
import { ProjectsManagerModal } from './components/projects/ProjectsManagerModal';
import { MasterThemePickerModal } from './components/themes/MasterThemePickerModal';
import { AuthModal } from './components/auth/AuthModal';
import { ShareModal } from './components/share/ShareModal';
import { AudioStudioModal } from './components/audio/AudioStudioModal';
import { CanvasFloatingControls } from './components/map/CanvasFloatingControls';
import { RouteRenderer } from './renderer/RouteRenderer';
import { EmbedPlayer } from './components/embed/EmbedPlayer';
import { useProjectStore } from './store/useProjectStore';
import { usePlaybackStore } from './store/usePlaybackStore';
import { useEditorStore } from './store/useEditorStore';
import { useAuthStore } from './store/useAuthStore';
import { getSceneAtTime } from './core/engine/animationEngine';
import { getProjectByShareSlug } from './core/project/cloudStorage';
import { useMediaSession } from './hooks/useMediaSession';
import './core/audio/audioEngine';

type MapPreviewProps = Omit<React.ComponentProps<typeof MapCanvas>, 'currentTime'> & {
  showDebugOverlay: boolean;
};

const useDesktopLayout = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isDesktop;
};

const MapPreview: React.FC<MapPreviewProps> = ({ project, showDebugOverlay, ...props }) => {
  const currentTime = usePlaybackStore(state => state.currentTime);
  const scene = showDebugOverlay ? getSceneAtTime(project, currentTime) : null;

  return (
    <>
      <MapCanvas project={project} currentTime={currentTime} {...props} />
      <CanvasFloatingControls />
      {scene && (
        <div className="absolute top-4 left-4 z-40 bg-studio-950/90 border border-purple-800/80 rounded-lg p-3 font-mono text-[11px] text-purple-200 shadow-2xl space-y-1 pointer-events-none backdrop-blur-sm">
          <div className="font-bold text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Render Engine Diagnostics
          </div>
          <div>Time: {currentTime.toFixed(3)}s / {project.video.duration}s</div>
          <div>Active Segment: {scene.debug?.activeSegmentName || 'None'}</div>
          <div>Segment Progress: {(scene.route.segmentProgress * 100).toFixed(1)}%</div>
          <div>Camera Center: [{scene.camera.center[0].toFixed(3)}, {scene.camera.center[1].toFixed(3)}]</div>
          <div>Camera Zoom: {scene.camera.zoom.toFixed(2)} | Pitch: {scene.camera.pitch.toFixed(1)}°</div>
          <div>Visible Labels: {scene.labels.filter(label => label.visible).length}</div>
          <div>Distance Travelled: {(scene.route.totalDistanceTravelledMeters / 1609.344).toFixed(1)} miles</div>
        </div>
      )}
    </>
  );
};

export const App: React.FC = () => {
  // Check if we are in headless renderer mode
  const isRenderMode = window.location.pathname.startsWith('/render') || window.location.search.includes('mode=render');
  if (isRenderMode) {
    return <RouteRenderer />;
  }

  // Check if we are in clean embed player mode (for iframes on blogs/websites)
  const isEmbedMode = window.location.search.includes('embed=1') || window.location.search.includes('embed=true');
  if (isEmbedMode) {
    return <EmbedPlayer />;
  }

  const { project, updateStop, undo, redo, canUndo, canRedo } = useProjectStore();
  const togglePlay = usePlaybackStore(state => state.togglePlay);
  const stepFrame = usePlaybackStore(state => state.stepFrame);
  const restart = usePlaybackStore(state => state.restart);
  const setDuration = usePlaybackStore(state => state.setDuration);
  const setFps = usePlaybackStore(state => state.setFps);
  const isDesktop = useDesktopLayout();
  const {
    mobileTab,
    selectedStopId,
    setSelectedStopId,
    showSafeArea,
    showDebugOverlay,
  } = useEditorStore();

  useMediaSession();

  // Resize map when returning to preview tab to ensure perfect viewport fit
  useEffect(() => {
    if (mobileTab === 'preview') {
      const timer = setTimeout(() => {
        (window as any).__mapInstance?.resize();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [mobileTab]);

  const initProject = useProjectStore(state => state.initProject);

  const [sharedRouteInfo, setSharedRouteInfo] = useState<{ isShared: boolean; name: string } | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(false);

  // Initialize and hydrate project from storage on mount
  useEffect(() => {
    useAuthStore.getState().initialize();

    const params = new URLSearchParams(window.location.search);
    const shareSlug = params.get('share');

    if (shareSlug) {
      setIsLoadingShared(true);
      getProjectByShareSlug(shareSlug).then(({ project: sharedProject, error }) => {
        setIsLoadingShared(false);
        if (sharedProject) {
          useProjectStore.getState().setProject(sharedProject, false);
          setSharedRouteInfo({
            isShared: true,
            name: sharedProject.metadata?.name || 'Ruta compartida',
          });
        } else {
          console.warn('Error loading shared project:', error);
          initProject();
        }
      });
    } else {
      initProject();
    }
  }, [initProject]);

  const handleCloneSharedProject = () => {
    const current = useProjectStore.getState().project;
    const cloned = {
      ...current,
      metadata: {
        ...current.metadata,
        id: crypto.randomUUID(),
        name: `${current.metadata?.name || 'Ruta'} (Copia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    useProjectStore.getState().setProject(cloned, true);

    // Remove ?share= from URL cleanly without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    setSharedRouteInfo(null);
  };

  const handleExitSharedView = async () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    setSharedRouteInfo(null);
    await initProject();
  };

  // Keep duration synchronized with project video settings
  useEffect(() => {
    setDuration(project.video.duration);
    setFps(project.video.fps);
  }, [project.video.duration, project.video.fps, setDuration, setFps]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in text inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        restart();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo()) redo();
        } else {
          if (canUndo()) undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepFrame, restart, undo, redo, canUndo, canRedo]);

  const handleUpdateLabelOffset = (stopId: string, offsetX: number, offsetY: number) => {
    const stop = project.route.stops.find(s => s.id === stopId);
    if (!stop) return;
    updateStop(stopId, {
      labelStyle: {
        ...(stop.labelStyle || {}),
        offsetX,
        offsetY,
      },
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-screen bg-studio-950 text-studio-100 overflow-hidden select-none touch-manipulation">
      {/* Top Header */}
      <TopHeader />

      {/* Shared Route Alert Banner */}
      {sharedRouteInfo?.isShared && (
        <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-purple-900/90 border-b border-blue-500/30 px-4 py-2 flex items-center justify-between z-30 shadow-lg text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-200">
              Estás viendo la ruta pública compartida: <strong className="text-white font-medium">{sharedRouteInfo.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCloneSharedProject}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium shadow-sm transition-colors flex items-center gap-1.5"
            >
              Hacer una copia para editar
            </button>
            <button
              onClick={handleExitSharedView}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-blue-200 rounded font-medium transition-colors"
            >
              Volver a mis rutas
            </button>
          </div>
        </div>
      )}

      {/* Loading Shared Route Pill */}
      {isLoadingShared && (
        <div className="bg-studio-900 border-b border-studio-800 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-studio-300 z-30">
          <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Cargando ruta compartida desde la nube...</span>
        </div>
      )}

      {isDesktop ? (
        <>
          <div className="flex flex-1 overflow-hidden min-h-0">
            <aside className="w-80 flex-shrink-0 h-full">
              <ItineraryList />
            </aside>
            <main className="flex-1 relative flex items-center justify-center bg-studio-950 p-2 overflow-hidden min-h-0">
              <MapPreview
                project={project}
                selectedStopId={selectedStopId}
                onSelectStop={setSelectedStopId}
                onUpdateLabelOffset={handleUpdateLabelOffset}
                showSafeArea={showSafeArea}
                showDebugOverlay={showDebugOverlay}
              />
            </main>
            <aside className="w-80 flex-shrink-0 h-full">
              <RightInspector />
            </aside>
          </div>
          <div className="flex-shrink-0">
            <BottomTimeline />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-1 overflow-hidden flex-col relative min-h-0">
            {/* Base Persistent Map Layer (0ms tab switches, preserves WebGL memory & tile cache) */}
            <div
              className={`flex-1 flex-col overflow-hidden relative min-h-0 ${
                mobileTab === 'preview' ? 'flex' : 'hidden'
              }`}
            >
              <div className="flex-1 relative flex items-center justify-center bg-studio-950 p-0 overflow-hidden min-h-0">
                <MapPreview
                  project={project}
                  selectedStopId={selectedStopId}
                  onSelectStop={setSelectedStopId}
                  onUpdateLabelOffset={handleUpdateLabelOffset}
                  showSafeArea={showSafeArea}
                  showDebugOverlay={showDebugOverlay}
                />
                <MobileQuickControls />
              </div>
              <BottomTimeline />
            </div>

            {/* Itinerary Tab Layer with smooth fade/slide in */}
            {mobileTab === 'itinerary' && (
              <div className="flex-1 overflow-hidden min-h-0 animate-fade-in bg-studio-950">
                <ItineraryList />
              </div>
            )}

            {/* Inspector Tab Layer with smooth fade/slide in */}
            {mobileTab === 'inspector' && (
              <div className="flex-1 overflow-hidden min-h-0 animate-fade-in bg-studio-950">
                <RightInspector />
              </div>
            )}
          </div>
          <MobileTabBar />
        </>
      )}

      {/* Modals & AI Drawer */}
      <AddStopModal />
      <GpxImportModal />
      <ExportDialog />
      <AiChatDrawer />
      <ProjectsManagerModal />
      <MasterThemePickerModal />
      <AuthModal />
      <ShareModal />
      <AudioStudioModal />
    </div>
  );
};
