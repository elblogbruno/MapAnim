import { get, set, del } from 'idb-keyval';
import { ProjectData, AspectRatio } from '../types/project';
import { migrateProject } from './migrations';
import { createRoute66Project } from './route66Demo';
import { createEuropeDemoProject } from './europeDemo';
import { geodesicDistance } from '../math/geo';
import { getStandardDimensionsForAspect } from './video';

const CURRENT_PROJECT_KEY = 'route_motion_studio_active_project';
const PROJECTS_REGISTRY_KEY = 'route_motion_studio_projects_registry';
const PROJECT_PREFIX = 'route_motion_project_';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  stopsCount: number;
  originName?: string;
  destinationName?: string;
  durationSeconds: number;
  fps: number;
  aspectRatio: AspectRatio;
  totalDistanceKm?: number;
  transportIcons: string[];
  stylePreset?: string;
  isTemplate?: boolean;
}

/**
 * Extracts a lightweight summary from a full ProjectData object for registry and fast list view.
 */
export function extractProjectSummary(project: ProjectData, isTemplate = false): ProjectSummary {
  const stops = project.route?.stops || [];
  const segments = project.route?.segments || [];
  const transportIcons: string[] = Array.from(
    new Set(
      segments
        .map(s => s.vehicle?.icon)
        .filter((icon): icon is NonNullable<typeof icon> => Boolean(icon))
    )
  );

  let totalDistanceKm = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    totalDistanceKm += geodesicDistance(stops[i].coordinates, stops[i + 1].coordinates) / 1000;
  }

  const id = project.metadata?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`);

  return {
    id,
    name: project.metadata?.name || 'Sin título',
    description: project.metadata?.description,
    createdAt: project.metadata?.createdAt || new Date().toISOString(),
    updatedAt: project.metadata?.updatedAt || new Date().toISOString(),
    stopsCount: stops.length,
    originName: stops[0]?.displayName || stops[0]?.canonicalName,
    destinationName: stops[stops.length - 1]?.displayName || stops[stops.length - 1]?.canonicalName,
    durationSeconds: project.video?.duration || 12,
    fps: project.video?.fps || 30,
    aspectRatio: project.video?.aspectRatio || '16:9',
    totalDistanceKm: Math.round(totalDistanceKm),
    transportIcons: transportIcons.length > 0 ? transportIcons : ['vintageCar'],
    stylePreset: project.map?.stylePreset || 'vintageAmericana',
    isTemplate,
  };
}

/**
 * Synchronously retrieves the active project from localStorage for immediate,
 * zero-flicker hydration on initial page render.
 */
export function getInitialProject(): ProjectData {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(CURRENT_PROJECT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.route?.stops && Array.isArray(parsed.route.stops)) {
          return migrateProject(parsed);
        }
      }
    }
  } catch (err) {
    console.warn('Could not read project from localStorage:', err);
  }
  return createRoute66Project();
}

/**
 * Persists the active project to localStorage (instant sync), IndexedDB active key,
 * dedicated project key, and updates the multi-project registry.
 */
export async function saveActiveProject(project: ProjectData): Promise<void> {
  try {
    const id = project.metadata?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`);
    const updated: ProjectData = {
      ...project,
      metadata: {
        ...project.metadata,
        id,
        updatedAt: new Date().toISOString(),
      },
    };

    // 1. Instant sync active project to localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(updated));
      }
    } catch (lsErr) {
      console.warn('LocalStorage save skipped (using IndexedDB):', lsErr);
    }

    // 2. Full persistence to IndexedDB
    await set(CURRENT_PROJECT_KEY, updated);

    // 3. Save to individual project slot
    await set(`${PROJECT_PREFIX}${id}`, updated);

    // 4. Update multi-project registry
    await updateProjectInRegistry(updated);

    // 5. Trigger background cloud sync if logged in
    triggerDebouncedCloudSync(updated);
  } catch (err) {
    console.error('Failed to autosave project to IndexedDB:', err);
  }
}

let cloudSyncTimer: any = null;

/**
 * Triggers a debounced background sync to Supabase when user is authenticated.
 */
export function triggerDebouncedCloudSync(project: ProjectData): void {
  if (typeof window === 'undefined') return;

  import('../../store/useAuthStore').then(({ useAuthStore }) => {
    const user = useAuthStore.getState().user;
    import('../../store/useSyncStore').then(({ useSyncStore }) => {
      if (!user) {
        useSyncStore.getState().markLocal();
        return;
      }
      useSyncStore.getState().markSyncing();

      if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
      cloudSyncTimer = setTimeout(async () => {
        try {
          const { saveProjectToCloud } = await import('./cloudStorage');
          await saveProjectToCloud(project);
        } catch {
          useSyncStore.getState().markLocal();
        }
      }, 1500);
    });
  });
}

/**
 * Asynchronously loads the active project, prioritizing IndexedDB with fallback to localStorage.
 */
export async function loadActiveProject(): Promise<ProjectData> {
  try {
    const saved = await get<ProjectData>(CURRENT_PROJECT_KEY);
    if (saved && saved.route && Array.isArray(saved.route.stops)) {
      return migrateProject(saved);
    }
  } catch (err) {
    console.error('Failed to load project from IndexedDB:', err);
  }

  return getInitialProject();
}

/**
 * Updates a project's summary entry in the global projects registry.
 */
export async function updateProjectInRegistry(project: ProjectData): Promise<void> {
  try {
    const summary = extractProjectSummary(project);
    const list = await getProjectsRegistry();
    const existingIndex = list.findIndex(p => p.id === summary.id);

    let updatedList: ProjectSummary[];
    if (existingIndex >= 0) {
      updatedList = [...list];
      updatedList[existingIndex] = summary;
    } else {
      updatedList = [summary, ...list];
    }

    // Persist registry to localStorage and IndexedDB
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PROJECTS_REGISTRY_KEY, JSON.stringify(updatedList));
      }
    } catch {}

    await set(PROJECTS_REGISTRY_KEY, updatedList);
  } catch (err) {
    console.warn('Could not update project in registry:', err);
  }
}

/**
 * Returns all saved project summaries, pre-populating with active and template projects if empty.
 */
export async function getProjectsRegistry(): Promise<ProjectSummary[]> {
  try {
    let saved = await get<ProjectSummary[]>(PROJECTS_REGISTRY_KEY);
    if (!saved || !Array.isArray(saved) || saved.length === 0) {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(PROJECTS_REGISTRY_KEY);
        if (raw) saved = JSON.parse(raw);
      }
    }

    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
  } catch (err) {
    console.warn('Failed reading projects registry:', err);
  }

  // Pre-populate initial projects list
  const active = getInitialProject();
  const europe = createEuropeDemoProject();

  const defaultList: ProjectSummary[] = [
    extractProjectSummary(active),
  ];

  if (active.metadata.name !== europe.metadata.name) {
    defaultList.push({
      ...extractProjectSummary(europe, true),
      id: 'template_europe',
      name: 'Grand Tour Europa (París a Roma)',
      description: 'Ruta cinemática por 5 capitales y ciudades emblemáticas de Europa.',
    });
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROJECTS_REGISTRY_KEY, JSON.stringify(defaultList));
    }
    await set(PROJECTS_REGISTRY_KEY, defaultList);
  } catch {}

  return defaultList;
}

/**
 * Loads a full project by its unique ID. Supports demo templates.
 */
export async function loadProjectById(id: string): Promise<ProjectData | null> {
  if (id === 'template_route66') {
    return createRoute66Project();
  }
  if (id === 'template_europe') {
    return createEuropeDemoProject();
  }

  try {
    const direct = await get<ProjectData>(`${PROJECT_PREFIX}${id}`);
    if (direct && direct.route && Array.isArray(direct.route.stops)) {
      return migrateProject(direct);
    }

    // Fallback: check active project if ID matches
    const active = await loadActiveProject();
    if (active && active.metadata?.id === id) {
      return active;
    }
  } catch (err) {
    console.error(`Failed to load project with ID ${id}:`, err);
  }

  return null;
}

/**
 * Deletes a project from the registry and IndexedDB.
 */
export async function deleteProjectById(id: string): Promise<ProjectSummary[]> {
  try {
    await del(`${PROJECT_PREFIX}${id}`);
  } catch {}

  const currentList = await getProjectsRegistry();
  const updatedList = currentList.filter(p => p.id !== id);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROJECTS_REGISTRY_KEY, JSON.stringify(updatedList));
    }
    await set(PROJECTS_REGISTRY_KEY, updatedList);
  } catch {}

  return updatedList;
}

/**
 * Duplicates an existing project, assigning a fresh ID and updated title.
 */
export async function duplicateProjectById(id: string): Promise<ProjectData | null> {
  const original = await loadProjectById(id);
  if (!original) return null;

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`;
  const duplicated: ProjectData = {
    ...original,
    metadata: {
      ...original.metadata,
      id: newId,
      name: `${original.metadata.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  await set(`${PROJECT_PREFIX}${newId}`, duplicated);
  await updateProjectInRegistry(duplicated);
  return duplicated;
}

/**
 * Creates and persists a new project from scratch or template.
 */
export async function createNewProjectRecord(
  name: string,
  templateType: 'blank' | 'route66' | 'europe' = 'blank',
  aspectRatio: AspectRatio = '16:9'
): Promise<ProjectData> {
  const base = templateType === 'europe'
    ? createEuropeDemoProject()
    : createRoute66Project();

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`;
  const dims = getStandardDimensionsForAspect(aspectRatio);

  const newProject: ProjectData = {
    ...base,
    metadata: {
      ...base.metadata,
      id: newId,
      name: name.trim() || 'Nuevo Viaje',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    video: {
      ...base.video,
      aspectRatio,
      width: dims.width,
      height: dims.height,
    },
    route: templateType === 'blank'
      ? {
          ...base.route,
          stops: [],
          segments: [],
        }
      : base.route,
  };

  await saveActiveProject(newProject);
  return newProject;
}

/**
 * Clears the active saved project from both storage layers.
 */
export async function clearActiveProject(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  } catch {}
  try {
    await del(CURRENT_PROJECT_KEY);
  } catch {}
}

export function exportProjectToJson(project: ProjectData): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.metadata.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `${safeName}.routevideo.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProjectFromJson(file: File): Promise<ProjectData> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed?.video || !Array.isArray(parsed?.route?.stops) || !Array.isArray(parsed?.route?.segments)) {
    throw new Error('Invalid Route Motion project file.');
  }
  const migrated = migrateProject(parsed);
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`;
  migrated.metadata = {
    ...migrated.metadata,
    id: migrated.metadata?.id || id,
    updatedAt: new Date().toISOString(),
  };

  await saveActiveProject(migrated);
  return migrated;
}
