import { create } from 'zustand';
import {
  ProjectData,
  RouteStop,
  RouteSegment,
  CameraSettings,
  RouteLineStyle,
  TextureEffectsConfig,
  VideoSettings,
} from '../core/types/project';
import { createRoute66Project } from '../core/project/route66Demo';
import { createEuropeDemoProject } from '../core/project/europeDemo';
import { saveActiveProject, loadActiveProject, getInitialProject, loadProjectById } from '../core/project/storage';
import { geodesicDistance } from '../core/math/geo';
import { DirectRoutingProvider, ArcRoutingProvider, OsrmRoutingProvider } from '../core/providers/routing/routingProviders';
import { getStandardDimensionsForAspect } from '../core/project/video';

const MAX_HISTORY = 30;

import { applyThemeToProject } from '../core/providers/masterThemes';

interface ProjectState {
  project: ProjectData;
  past: ProjectData[];
  future: ProjectData[];
  isSaved: boolean;

  // Persistence & Initialization
  initProject: () => Promise<void>;
  createNewProject: (name?: string) => void;
  applyMasterTheme: (themeId: string) => void;

  // Undo / Redo
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;

  // Setters
  setProject: (project: ProjectData, recordHistory?: boolean) => void;
  openProjectById: (id: string) => Promise<boolean>;
  loadDemoProject: (demo: 'route66' | 'europe') => void;

  // Stops
  addStop: (stop: RouteStop, index?: number) => Promise<void>;
  updateStop: (stopId: string, updates: Partial<RouteStop>) => void;
  removeStop: (stopId: string) => void;
  reorderStops: (activeId: string, overId: string) => void;

  // Segments
  updateSegment: (segmentId: string, updates: Partial<RouteSegment>) => void;
  recalculateSegmentRoute: (segmentId: string) => Promise<void>;
  recalculateAllRoutes: (targetMode?: import('../core/types/geo').RouteMode) => Promise<void>;

  // Components
  updateCamera: (updates: Partial<CameraSettings>) => void;
  updateRouteSettings: (updates: Partial<ProjectData['route']>) => void;
  updateDefaultLineStyle: (updates: Partial<RouteLineStyle>) => void;
  updateEffects: (updates: Partial<TextureEffectsConfig>) => void;
  updateVideo: (updates: Partial<VideoSettings>) => void;
  updateMapSettings: (updates: Partial<ProjectData['map']>) => void;
  updateOverlays: (updates: Partial<ProjectData['overlays']>) => void;
  updateAudio: (updates: Partial<import('../core/types/project').ProjectAudioConfig>) => void;
}

const osrmProvider = new OsrmRoutingProvider();
const arcProvider = new ArcRoutingProvider();
const directProvider = new DirectRoutingProvider();

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: getInitialProject(),
  past: [],
  future: [],
  isSaved: true,

  initProject: async () => {
    try {
      const saved = await loadActiveProject();
      if (saved && saved.route && Array.isArray(saved.route.stops)) {
        set({ project: saved, isSaved: true });
      }
    } catch (err) {
      console.error('Failed to hydrate saved project:', err);
    }
  },

  applyMasterTheme: (themeId: string) => {
    const { project, setProject } = get();
    const updated = applyThemeToProject(project, themeId);
    setProject(updated, true);
  },

  createNewProject: (name?: string) => {
    const base = createRoute66Project();
    const newProject: ProjectData = {
      ...base,
      metadata: {
        ...base.metadata,
        id: crypto.randomUUID(),
        name: name || 'New Trip',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      route: {
        ...base.route,
        stops: [],
        segments: [],
      },
    };
    get().setProject(newProject, true);
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  undo: () => {
    const { past, project, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      project: previous,
      past: newPast,
      future: [project, ...future],
      isSaved: true,
    });
    saveActiveProject(previous);
  },

  redo: () => {
    const { past, project, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      project: next,
      past: [...past, project],
      future: newFuture,
      isSaved: true,
    });
    saveActiveProject(next);
  },

  setProject: (newProject, recordHistory = true) => {
    const { project, past } = get();
    if (recordHistory) {
      const newPast = [...past, project].slice(-MAX_HISTORY);
      set({ project: newProject, past: newPast, future: [], isSaved: true });
    } else {
      set({ project: newProject, isSaved: true });
    }
    saveActiveProject(newProject);
  },

  openProjectById: async (id: string) => {
    const loaded = await loadProjectById(id);
    if (loaded) {
      get().setProject(loaded, true);
      return true;
    }
    return false;
  },

  loadDemoProject: (demo) => {
    const p = demo === 'europe' ? createEuropeDemoProject() : createRoute66Project();
    get().setProject(p, true);
  },

  addStop: async (newStop, index) => {
    const { project, past } = get();
    const currentStops = [...project.route.stops];
    const insertIdx = index !== undefined ? index : currentStops.length;
    currentStops.splice(insertIdx, 0, newStop);

    // Rebuild segments
    const newSegments: RouteSegment[] = [];
    for (let i = 0; i < currentStops.length - 1; i++) {
      const s1 = currentStops[i];
      const s2 = currentStops[i + 1];
      const p1: [number, number] = [s1.coordinates.lng, s1.coordinates.lat];
      const p2: [number, number] = [s2.coordinates.lng, s2.coordinates.lat];

      // Check if existing segment geometry matches
      const existing = project.route.segments.find(
        s => s.startStopId === s1.id && s.endStopId === s2.id
      );

      if (existing) {
        newSegments.push(existing);
      } else {
        const dist = geodesicDistance(s1.coordinates, s2.coordinates);

        newSegments.push({
          id: `seg_${s1.id}_to_${s2.id}`,
          startStopId: s1.id,
          endStopId: s2.id,
          travelMode: 'car',
          routeMode: 'realRoad',
          geometry: [p1, p2],
          distanceMeters: dist,
          color: project.route.defaultLineStyle.color,
          width: project.route.defaultLineStyle.width,
          vehicle: {
            enabled: true,
            icon: 'vintageCar',
            size: 24,
            color: '#F7F3E8',
          },
        });
      }
    }

    const updatedProject: ProjectData = {
      ...project,
      route: {
        ...project.route,
        stops: currentStops,
        segments: newSegments,
      },
    };

    set({
      project: updatedProject,
      past: [...past, project].slice(-MAX_HISTORY),
      future: [],
    });
    saveActiveProject(updatedProject);

    // Asynchronously resolve real road geometry for new segments
    for (const seg of newSegments) {
      if (seg.geometry.length <= 2) {
        get().recalculateSegmentRoute(seg.id);
      }
    }
  },

  updateStop: (stopId, updates) => {
    const { project, past } = get();
    const updatedStops = project.route.stops.map(s => (s.id === stopId ? { ...s, ...updates } : s));

    const updatedProject: ProjectData = {
      ...project,
      route: {
        ...project.route,
        stops: updatedStops,
      },
    };

    set({
      project: updatedProject,
      past: [...past, project].slice(-MAX_HISTORY),
      future: [],
    });
    saveActiveProject(updatedProject);
  },

  removeStop: (stopId) => {
    const { project, past } = get();
    const updatedStops = project.route.stops.filter(s => s.id !== stopId);

    // Rebuild segments
    const newSegments: RouteSegment[] = [];
    for (let i = 0; i < updatedStops.length - 1; i++) {
      const s1 = updatedStops[i];
      const s2 = updatedStops[i + 1];
      const existing = project.route.segments.find(
        s => s.startStopId === s1.id && s.endStopId === s2.id
      );

      if (existing) {
        newSegments.push(existing);
      } else {
        const p1: [number, number] = [s1.coordinates.lng, s1.coordinates.lat];
        const p2: [number, number] = [s2.coordinates.lng, s2.coordinates.lat];
        newSegments.push({
          id: `seg_${s1.id}_to_${s2.id}`,
          startStopId: s1.id,
          endStopId: s2.id,
          travelMode: 'car',
          routeMode: 'realRoad',
          geometry: [p1, p2],
          distanceMeters: geodesicDistance(s1.coordinates, s2.coordinates),
          color: project.route.defaultLineStyle.color,
          width: project.route.defaultLineStyle.width,
        });
      }
    }

    const updatedProject: ProjectData = {
      ...project,
      route: {
        ...project.route,
        stops: updatedStops,
        segments: newSegments,
      },
    };

    set({
      project: updatedProject,
      past: [...past, project].slice(-MAX_HISTORY),
      future: [],
    });
    saveActiveProject(updatedProject);
  },

  reorderStops: (activeId, overId) => {
    const { project, past } = get();
    const oldStops = project.route.stops;
    const oldIndex = oldStops.findIndex(s => s.id === activeId);
    const newIndex = oldStops.findIndex(s => s.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = [...oldStops];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Rebuild segments
    const newSegments: RouteSegment[] = [];
    for (let i = 0; i < reordered.length - 1; i++) {
      const s1 = reordered[i];
      const s2 = reordered[i + 1];
      const existing = project.route.segments.find(
        s => s.startStopId === s1.id && s.endStopId === s2.id
      );

      if (existing) {
        newSegments.push(existing);
      } else {
        const p1: [number, number] = [s1.coordinates.lng, s1.coordinates.lat];
        const p2: [number, number] = [s2.coordinates.lng, s2.coordinates.lat];
        newSegments.push({
          id: `seg_${s1.id}_to_${s2.id}`,
          startStopId: s1.id,
          endStopId: s2.id,
          travelMode: 'car',
          routeMode: 'realRoad',
          geometry: [p1, p2],
          distanceMeters: geodesicDistance(s1.coordinates, s2.coordinates),
          color: project.route.defaultLineStyle.color,
          width: project.route.defaultLineStyle.width,
        });
      }
    }

    const updatedProject: ProjectData = {
      ...project,
      route: {
        ...project.route,
        stops: reordered,
        segments: newSegments,
      },
    };

    set({
      project: updatedProject,
      past: [...past, project].slice(-MAX_HISTORY),
      future: [],
    });
    saveActiveProject(updatedProject);
  },

  updateSegment: (segmentId, updates) => {
    const { project, past } = get();
    const updatedSegments = project.route.segments.map(s =>
      s.id === segmentId ? { ...s, ...updates } : s
    );

    const updatedProject: ProjectData = {
      ...project,
      route: {
        ...project.route,
        segments: updatedSegments,
      },
    };

    set({
      project: updatedProject,
      past: [...past, project].slice(-MAX_HISTORY),
      future: [],
    });
    saveActiveProject(updatedProject);
  },

  recalculateSegmentRoute: async (segmentId) => {
    const { project } = get();
    const seg = project.route.segments.find(s => s.id === segmentId);
    if (!seg) return;

    const s1 = project.route.stops.find(s => s.id === seg.startStopId);
    const s2 = project.route.stops.find(s => s.id === seg.endStopId);
    if (!s1 || !s2) return;

    let res;
    if (seg.routeMode === 'direct') {
      res = await directProvider.calculateRoute(s1.coordinates, s2.coordinates, seg.travelMode);
    } else if (seg.routeMode === 'arc') {
      res = await arcProvider.calculateRoute(s1.coordinates, s2.coordinates, seg.travelMode);
    } else {
      res = await osrmProvider.calculateRoute(s1.coordinates, s2.coordinates, seg.travelMode);
    }

    get().updateSegment(segmentId, {
      geometry: res.geometry,
      distanceMeters: res.distanceMeters,
    });
  },

  recalculateAllRoutes: async (targetMode?: import('../core/types/geo').RouteMode) => {
    const { project } = get();
    const updatedSegments = await Promise.all(
      project.route.segments.map(async (seg) => {
        const s1 = project.route.stops.find(s => s.id === seg.startStopId);
        const s2 = project.route.stops.find(s => s.id === seg.endStopId);
        if (!s1 || !s2) return seg;

        const mode = targetMode || seg.routeMode || 'realRoad';
        let res;
        try {
          if (mode === 'direct') {
            res = await directProvider.calculateRoute(s1.coordinates, s2.coordinates, seg.travelMode);
          } else if (mode === 'arc') {
            res = await arcProvider.calculateRoute(s1.coordinates, s2.coordinates, seg.travelMode);
          } else {
            res = await osrmProvider.calculateRoute(s1.coordinates, s2.coordinates, seg.travelMode);
          }
        } catch {
          res = await arcProvider.calculateRoute(s1.coordinates, s2.coordinates, seg.travelMode);
        }

        return {
          ...seg,
          routeMode: mode,
          geometry: res.geometry,
          distanceMeters: res.distanceMeters,
        };
      })
    );

    const updatedProject: ProjectData = {
      ...project,
      route: {
        ...project.route,
        segments: updatedSegments,
      },
    };

    set({ project: updatedProject });
    saveActiveProject(updatedProject);
  },

  updateCamera: (updates) => {
    const { project, past } = get();
    const updatedProject: ProjectData = {
      ...project,
      camera: { ...project.camera, ...updates },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },

  updateRouteSettings: (updates) => {
    const { project, past } = get();
    const updatedProject: ProjectData = {
      ...project,
      route: { ...project.route, ...updates },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },

  updateDefaultLineStyle: (updates) => {
    const { project, past } = get();
    const updatedProject: ProjectData = {
      ...project,
      route: {
        ...project.route,
        defaultLineStyle: { ...project.route.defaultLineStyle, ...updates },
        segments: project.route.segments.map(segment => ({
          ...segment,
          ...(updates.color !== undefined ? { color: updates.color } : {}),
          ...(updates.width !== undefined ? { width: updates.width } : {}),
        })),
      },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },

  updateEffects: (updates) => {
    const { project, past } = get();
    const updatedProject: ProjectData = {
      ...project,
      effects: { ...project.effects, ...updates },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },

  updateVideo: (updates) => {
    const { project, past } = get();
    let width = updates.width ?? project.video.width;
    let height = updates.height ?? project.video.height;

    // When aspect ratio changes without explicit width & height, calculate proportional dimensions
    if (updates.aspectRatio && (!updates.width || !updates.height)) {
      const currentShort = Math.min(project.video.width, project.video.height);
      const baseShort = currentShort >= 2000 ? 2160 : currentShort <= 800 ? 720 : 1080;
      const dims = getStandardDimensionsForAspect(updates.aspectRatio, baseShort);
      width = dims.width;
      height = dims.height;
    }

    const newDuration = updates.duration ?? project.video.duration;
    let updatedTitles = project.overlays?.titles || [];
    if (updates.duration !== undefined && updates.duration !== project.video.duration) {
      updatedTitles = updatedTitles.map(t => {
        if (t.id === 'title_outro' || t.id.toLowerCase().includes('outro') || t.id.toLowerCase().includes('closing')) {
          return {
            ...t,
            startTime: Math.max(0, newDuration - t.duration),
          };
        }
        return t;
      });
    }

    const updatedProject: ProjectData = {
      ...project,
      video: { ...project.video, ...updates, width, height },
      overlays: {
        ...project.overlays,
        titles: updatedTitles,
      },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },

  updateMapSettings: (updates) => {
    const { project, past } = get();
    const updatedProject: ProjectData = {
      ...project,
      map: { ...project.map, ...updates },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },

  updateOverlays: (updates) => {
    const { project, past } = get();
    const updatedProject: ProjectData = {
      ...project,
      overlays: { ...project.overlays, ...updates },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },

  updateAudio: (updates) => {
    const { project, past } = get();
    const currentAudio = project.audio || {
      enabled: false,
      volume: 0.7,
      fadeIn: 1,
      fadeOut: 1,
      sfxEnabled: true,
      sfxVolume: 0.7,
    };
    const updatedProject: ProjectData = {
      ...project,
      audio: { ...currentAudio, ...updates },
    };
    set({ project: updatedProject, past: [...past, project].slice(-MAX_HISTORY), future: [] });
    saveActiveProject(updatedProject);
  },
}));
