import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { ProjectData, AspectRatio } from '../types/project';
import { ProjectSummary, extractProjectSummary, getProjectsRegistry, loadProjectById, saveActiveProject } from './storage';
import { migrateProject } from './migrations';
import { useSyncStore } from '../../store/useSyncStore';
import { createRoute66Project } from './route66Demo';
import { createEuropeDemoProject } from './europeDemo';

export interface CloudProjectRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  aspect_ratio: string;
  duration_seconds: number;
  stops_count: number;
  origin_name?: string | null;
  destination_name?: string | null;
  total_distance_km: number;
  transport_icons: string[];
  style_preset: string;
  is_public: boolean;
  share_slug?: string | null;
  thumbnail_url?: string | null;
  project_data: ProjectData;
  created_at: string;
  updated_at: string;
}

/**
 * Checks if the current user is authenticated and Supabase is configured.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Ensures a project has a globally unique identifier before saving to cloud.
 * Replaces static demo template IDs (e.g. 'route_66_demo_project') with unique UUIDs.
 */
export function ensureValidProjectId(project: ProjectData): string {
  const currentId = project.metadata?.id;
  const isDemo = currentId === 'route_66_demo_project' || currentId === 'europe_demo_project';
  const isUuid = Boolean(currentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId));

  if (!currentId || isDemo || !isUuid) {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`;
    if (project.metadata) {
      project.metadata.id = newId;
    }
    return newId;
  }
  return currentId;
}

/**
 * Saves or updates a project in Supabase PostgreSQL database with live sync tracking.
 */
export async function saveProjectToCloud(project: ProjectData): Promise<{ id?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    useSyncStore.getState().markLocal();
    return { error: 'Supabase no está configurado.' };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    useSyncStore.getState().markLocal();
    return { error: 'Debes iniciar sesión para guardar en la nube.' };
  }

  useSyncStore.getState().markSyncing();

  try {
    const id = ensureValidProjectId(project);
    const summary = extractProjectSummary(project);

    const payload: Partial<CloudProjectRecord> = {
      id,
      user_id: userId,
      name: summary.name,
      description: summary.description || null,
      aspect_ratio: summary.aspectRatio,
      duration_seconds: summary.durationSeconds,
      stops_count: summary.stopsCount,
      origin_name: summary.originName || null,
      destination_name: summary.destinationName || null,
      total_distance_km: summary.totalDistanceKm || 0,
      transport_icons: summary.transportIcons,
      style_preset: summary.stylePreset || 'vintageAmericana',
      project_data: {
        ...project,
        metadata: {
          ...project.metadata,
          id,
          updatedAt: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('projects')
      .upsert(payload, { onConflict: 'id' })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase cloud save error:', error);
      useSyncStore.getState().markError(error.message);
      return { error: error.message };
    }

    useSyncStore.getState().markSynced();
    return { id: data.id };
  } catch (err: any) {
    console.error('saveProjectToCloud exception:', err);
    useSyncStore.getState().markError(err.message || 'Error de conexión');
    return { error: err.message || 'Error al guardar en la nube' };
  }
}

/**
 * Fetches all projects belonging to the authenticated user from Supabase.
 */
export async function fetchCloudProjects(): Promise<{ projects: ProjectSummary[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { projects: [], error: 'Supabase no está configurado.' };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { projects: [], error: 'No autenticado.' };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, aspect_ratio, duration_seconds, stops_count, origin_name, destination_name, total_distance_km, transport_icons, style_preset, is_public, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      return { projects: [], error: error.message };
    }

    const summaries: ProjectSummary[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stopsCount: row.stops_count,
      originName: row.origin_name,
      destinationName: row.destination_name,
      durationSeconds: Number(row.duration_seconds),
      fps: 30,
      aspectRatio: row.aspect_ratio || '16:9',
      totalDistanceKm: Number(row.total_distance_km),
      transportIcons: row.transport_icons || ['vintageCar'],
      stylePreset: row.style_preset,
      isTemplate: false,
    }));

    return { projects: summaries };
  } catch (err: any) {
    return { projects: [], error: err.message || 'Error al cargar proyectos de la nube' };
  }
}

/**
 * Loads the full project JSON from Supabase.
 */
export async function loadCloudProject(id: string): Promise<{ project: ProjectData | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { project: null, error: 'Supabase no configurado.' };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('project_data')
      .eq('id', id)
      .single();

    if (error || !data?.project_data) {
      return { project: null, error: error?.message || 'Proyecto no encontrado' };
    }

    const migrated = migrateProject(data.project_data);
    return { project: migrated };
  } catch (err: any) {
    return { project: null, error: err.message || 'Error cargando proyecto' };
  }
}

/**
 * Deletes a project from Supabase.
 */
export async function deleteCloudProject(id: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase no configurado.' };
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message || 'Error al eliminar de la nube' };
  }
}

/**
 * Sychronizes all local projects stored in IndexedDB to the user's Supabase cloud account.
 */
export async function syncAllLocalProjectsToCloud(): Promise<{ total: number; synced: number; errors: number }> {
  const localList = await getProjectsRegistry();
  let synced = 0;
  let errors = 0;

  for (const item of localList) {
    if (item.isTemplate) continue;
    try {
      const full = await loadProjectById(item.id);
      if (full) {
        const result = await saveProjectToCloud(full);
        if (result.error) {
          errors++;
        } else {
          synced++;
        }
      }
    } catch {
      errors++;
    }
  }

  return { total: localList.length, synced, errors };
}

/**
 * Generates or retrieves the public share link for a project.
 */
export async function generateOrGetProjectShareInfo(
  project: ProjectData
): Promise<{ shareUrl?: string; shareSlug?: string; isPublic: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { isPublic: false, error: 'La nube de Supabase no está configurada.' };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { isPublic: false, error: 'Inicia sesión para generar un enlace permanente de tu ruta.' };
  }

  // Ensure project is saved to cloud first
  const saveRes = await saveProjectToCloud(project);
  if (saveRes.error && !saveRes.id) {
    return { isPublic: false, error: saveRes.error };
  }

  const projectId = saveRes.id || project.metadata.id;

  try {
    // Check if project already has a share_slug and is_public status
    const { data: existing, error: fetchErr } = await supabase
      .from('projects')
      .select('share_slug, is_public')
      .eq('id', projectId)
      .maybeSingle();

    if (fetchErr) {
      return { isPublic: false, error: fetchErr.message };
    }

    let slug = existing?.share_slug;
    if (!slug) {
      const baseName = (project.metadata?.name || 'ruta')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'ruta';
      const randomPart = Math.random().toString(36).substring(2, 7);
      slug = `${baseName}-${randomPart}`;
    }

    // Ensure it is marked public
    const { error: updateErr } = await supabase
      .from('projects')
      .update({
        is_public: true,
        share_slug: slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateErr) {
      return { isPublic: false, error: updateErr.message };
    }

    const shareUrl = `${window.location.origin}/?share=${slug}`;
    return { shareUrl, shareSlug: slug, isPublic: true };
  } catch (err: any) {
    return { isPublic: false, error: err.message || 'Error al generar el enlace' };
  }
}

/**
 * Toggles a project's public visibility.
 */
export async function toggleProjectPublicStatus(
  projectId: string,
  isPublic: boolean
): Promise<{ isPublic: boolean; shareUrl?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { isPublic: false, error: 'Supabase no configurado' };

  try {
    const { data: existing } = await supabase
      .from('projects')
      .select('share_slug, name')
      .eq('id', projectId)
      .maybeSingle();

    let slug = existing?.share_slug;
    if (isPublic && !slug) {
      const baseName = (existing?.name || 'ruta')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'ruta';
      slug = `${baseName}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const { error } = await supabase
      .from('projects')
      .update({
        is_public: isPublic,
        share_slug: isPublic ? slug : existing?.share_slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (error) return { isPublic: !isPublic, error: error.message };

    const shareUrl = isPublic && slug
      ? `${window.location.origin}/?share=${slug}`
      : undefined;

    return { isPublic, shareUrl };
  } catch (err: any) {
    return { isPublic: !isPublic, error: err.message };
  }
}

/**
 * Fetches a public project by its share slug or public ID.
 * Works without requiring authentication (uses the public RLS policy).
 */
export async function getProjectByShareSlug(
  slugOrId: string
): Promise<{ project: ProjectData | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { project: null, error: 'Supabase no configurado.' };
  }

  try {
    // 1. Search by share_slug
    let { data, error } = await supabase
      .from('projects')
      .select('project_data, is_public')
      .eq('share_slug', slugOrId)
      .eq('is_public', true)
      .maybeSingle();

    // 2. Fallback search by ID if it's a UUID
    if (!data) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      if (isUuid) {
        const res = await supabase
          .from('projects')
          .select('project_data, is_public')
          .eq('id', slugOrId)
          .eq('is_public', true)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }
    }

    if (error || !data?.project_data) {
      return { project: null, error: error?.message || 'Esta ruta no existe o es privada.' };
    }

    const migrated = migrateProject(data.project_data);
    return { project: migrated };
  } catch (err: any) {
    return { project: null, error: err.message || 'Error al obtener la ruta' };
  }
}

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Reduces 10MB phone camera shots to crisp ~250KB WebP/JPEG files in ~50ms.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Supabase Storage object URL to an optimized image transformation CDN URL.
 */
export function getOptimizedStorageUrl(url: string, width = 800, quality = 80): string {
  if (!url || !url.includes('/storage/v1/object/public/')) {
    return url;
  }
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=${quality}&format=webp`;
}

/**
 * Uploads a stop photo to Supabase Storage bucket 'project-assets' with client-side auto-compression.
 * If offline or unauthenticated, falls back to a base64 Data URL so the user is never blocked.
 */
export async function uploadStopPhoto(
  file: File,
  stopId: string
): Promise<{ url?: string; isCloud?: boolean; error?: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'El archivo debe ser una imagen válida (PNG, JPG, WebP).' };
  }

  // Client-side auto compression for faster upload and mobile data savings
  let uploadBlob: Blob = file;
  try {
    uploadBlob = await compressImageFile(file, 1600, 0.85);
  } catch (compErr) {
    console.warn('Image compression fallback to raw file:', compErr);
  }

  if (uploadBlob.size > 10 * 1024 * 1024) {
    return { error: 'La imagen no debe superar los 10 MB.' };
  }

  if (!isSupabaseConfigured()) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, isCloud: false });
      reader.onerror = () => resolve({ error: 'Error al procesar la imagen local' });
      reader.readAsDataURL(uploadBlob);
    });
  }

  try {
    const userId = await getCurrentUserId();
    const cleanExt = 'webp';
    const filePath = `${userId || 'public'}/stops/${stopId}_${Date.now()}.${cleanExt}`;

    const { data, error } = await supabase.storage
      .from('project-assets')
      .upload(filePath, uploadBlob, {
        cacheControl: '31536000',
        upsert: true,
        contentType: 'image/webp',
      });

    if (error) {
      console.warn('Supabase storage upload error, falling back to data URL:', error);
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string, isCloud: false });
        reader.onerror = () => resolve({ error: error.message });
        reader.readAsDataURL(uploadBlob);
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-assets')
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, isCloud: true };
  } catch (err: any) {
    return { error: err.message || 'Error al subir la imagen a la nube' };
  }
}

/**
 * Uploads a custom audio track (MP3/WAV/OGG) to Supabase Storage bucket 'project-assets'.
 */
export async function uploadAudioTrack(
  file: File
): Promise<{ url?: string; name?: string; error?: string }> {
  if (!file.type.startsWith('audio/')) {
    return { error: 'El archivo debe ser de audio (MP3, WAV, AAC o OGG).' };
  }

  // Max 25 MB for audio
  if (file.size > 25 * 1024 * 1024) {
    return { error: 'El audio excede el límite máximo de 25 MB.' };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  if (!isSupabaseConfigured()) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, name: file.name });
      reader.onerror = () => resolve({ error: 'Error al leer el audio localmente' });
      reader.readAsDataURL(file);
    });
  }

  try {
    const userId = await getCurrentUserId();
    const filePath = `${userId || 'public'}/audio/${Date.now()}_${cleanName}`;

    const { data, error } = await supabase.storage
      .from('project-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('Supabase audio upload error, falling back to data URL:', error);
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string, name: file.name });
        reader.onerror = () => resolve({ error: error.message });
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('project-assets')
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, name: file.name };
  } catch (err: any) {
    return { error: err.message || 'Error al subir audio a la nube' };
  }
}

export interface CommunityProjectItem {
  id: string;
  name: string;
  description?: string;
  authorName: string;
  authorAvatar?: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  stopsCount: number;
  originName?: string;
  destinationName?: string;
  totalDistanceKm?: number;
  transportIcons: string[];
  stylePreset: string;
  shareSlug?: string;
  updatedAt: string;
  isOfficial?: boolean;
  projectData?: ProjectData;
  likesCount?: number;
  viewsCount?: number;
  forksCount?: number;
  userHasLiked?: boolean;
}

const LOCAL_LIKES_KEY = 'mapanim_user_liked_projects';

export function getLocalLikedProjectIds(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function setLocalProjectLiked(projectId: string, liked: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const set = getLocalLikedProjectIds();
    if (liked) set.add(projectId);
    else set.delete(projectId);
    localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Toggles a like for a community project.
 * Uses Supabase project_likes table if configured & authenticated,
 * and maintains local state so it is instantaneous and works offline/guest too.
 */
export async function toggleProjectLike(
  projectId: string,
  currentCount = 0
): Promise<{ liked: boolean; newCount: number }> {
  const localLikes = getLocalLikedProjectIds();
  const willLike = !localLikes.has(projectId);

  // Update local state immediately
  setLocalProjectLiked(projectId, willLike);
  const newCount = willLike ? currentCount + 1 : Math.max(0, currentCount - 1);

  if (!isSupabaseConfigured()) {
    return { liked: willLike, newCount };
  }

  try {
    const userId = await getCurrentUserId();
    if (userId) {
      if (willLike) {
        await supabase
          .from('project_likes')
          .insert({ project_id: projectId, user_id: userId });
      } else {
        await supabase
          .from('project_likes')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId);
      }
    }
  } catch (err) {
    console.warn('Supabase like sync error:', err);
  }

  return { liked: willLike, newCount };
}

/**
 * Records a view for a community route (atomically increments views_count via Postgres RPC).
 */
export async function recordProjectView(projectId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.rpc('increment_project_views', { target_project_id: projectId });
  } catch {
    // Non-critical, ignore
  }
}

/**
 * Records a fork for a community route (atomically increments forks_count via Postgres RPC).
 */
export async function recordProjectFork(projectId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.rpc('increment_project_forks', { target_project_id: projectId });
  } catch {
    // Non-critical, ignore
  }
}

/**
 * Curated iconic community routes to guarantee a rich, inspiring gallery out of the box.
 */
function getCuratedCommunityProjects(): CommunityProjectItem[] {
  const route66 = createRoute66Project();
  const europe = createEuropeDemoProject();
  const localLikes = getLocalLikedProjectIds();

  return [
    {
      id: 'community_route_66',
      name: 'Ruta 66: The Mother Road',
      description: 'El viaje por carretera más legendario del mundo. Desde Chicago hasta el muelle de Santa Mónica atravesando 8 estados.',
      authorName: 'MapAnim Studio',
      aspectRatio: route66.video.aspectRatio,
      durationSeconds: route66.video.duration,
      stopsCount: route66.route.stops.length,
      originName: 'Chicago, IL',
      destinationName: 'Santa Mónica, CA',
      totalDistanceKm: 3940,
      transportIcons: ['🚗'],
      stylePreset: route66.map.stylePreset,
      updatedAt: '2026-09-01T12:00:00Z',
      isOfficial: true,
      projectData: route66,
      likesCount: 342,
      viewsCount: 1250,
      forksCount: 89,
      userHasLiked: localLikes.has('community_route_66'),
    },
    {
      id: 'community_gran_tour_europe',
      name: 'Gran Tour de Europa Central',
      description: 'Un recorrido cinematográfico por las capitales del arte y los Alpes Suizos en tren de alta velocidad y carretera.',
      authorName: 'Exploradores sin Fronteras',
      aspectRatio: europe.video.aspectRatio,
      durationSeconds: europe.video.duration,
      stopsCount: europe.route.stops.length,
      originName: 'París, Francia',
      destinationName: 'Roma, Italia',
      totalDistanceKm: 1480,
      transportIcons: ['🚂', '🚗', '✈️'],
      stylePreset: europe.map.stylePreset,
      updatedAt: '2026-09-03T16:30:00Z',
      isOfficial: true,
      projectData: europe,
      likesCount: 218,
      viewsCount: 890,
      forksCount: 64,
      userHasLiked: localLikes.has('community_gran_tour_europe'),
    },
    {
      id: 'community_pacific_coast_highway',
      name: 'California Highway 1: Big Sur Coastal',
      description: 'Acantilados salvajes sobre el Océano Pacífico, puentes emblemáticos y atardeceres dorados desde San Francisco hasta Los Ángeles.',
      authorName: 'Pacific Riders',
      aspectRatio: '9:16',
      durationSeconds: 15,
      stopsCount: 5,
      originName: 'San Francisco, CA',
      destinationName: 'Los Ángeles, CA',
      totalDistanceKm: 685,
      transportIcons: ['🚗'],
      stylePreset: 'darkCinema',
      updatedAt: '2026-09-05T09:15:00Z',
      isOfficial: false,
      likesCount: 164,
      viewsCount: 610,
      forksCount: 42,
      userHasLiked: localLikes.has('community_pacific_coast_highway'),
    },
    {
      id: 'community_nordic_fjords',
      name: 'Ruta de los Fiordos Noruegos',
      description: 'Cascadas imposibles, valles glaciares y transbordadores entre Oslo, el tren panorámico de Flåm y el fiordo de Geiranger.',
      authorName: 'Nordic Wanderer',
      aspectRatio: '16:9',
      durationSeconds: 16,
      stopsCount: 4,
      originName: 'Oslo, Noruega',
      destinationName: 'Geiranger, Noruega',
      totalDistanceKm: 550,
      transportIcons: ['🚂', '🚗'],
      stylePreset: 'cleanLight',
      updatedAt: '2026-09-04T18:40:00Z',
      isOfficial: false,
      likesCount: 129,
      viewsCount: 470,
      forksCount: 31,
      userHasLiked: localLikes.has('community_nordic_fjords'),
    },
  ];
}

/**
 * Fetches all public projects shared by the community from Supabase, combined with curated showcases.
 */
export async function fetchCommunityProjects(): Promise<{
  projects: CommunityProjectItem[];
  error?: string;
}> {
  const curated = getCuratedCommunityProjects();
  const localLikes = getLocalLikedProjectIds();

  if (!isSupabaseConfigured()) {
    return { projects: curated };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, aspect_ratio, duration_seconds, stops_count, origin_name, destination_name, total_distance_km, transport_icons, style_preset, share_slug, updated_at, project_data, user_id, likes_count, views_count, forks_count')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(40);

    if (error) {
      console.warn('Error fetching community projects from Supabase:', error);
      return { projects: curated, error: error.message };
    }

    if (!data || data.length === 0) {
      return { projects: curated };
    }

    // Try fetching author profiles for public projects
    const userIds = Array.from(new Set(data.map(p => p.user_id).filter(Boolean)));
    const profilesMap = new Map<string, { full_name?: string; avatar_url?: string }>();

    if (userIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        profiles?.forEach(prof => {
          profilesMap.set(prof.id, prof);
        });
      } catch {
        // Profiles lookup optional
      }
    }

    // Check user's cloud likes if logged in
    const currentUserId = await getCurrentUserId();
    const cloudLikesSet = new Set<string>();
    if (currentUserId) {
      try {
        const { data: userLikes } = await supabase
          .from('project_likes')
          .select('project_id')
          .eq('user_id', currentUserId);
        userLikes?.forEach(l => cloudLikesSet.add(l.project_id));
      } catch {
        // Optional
      }
    }

    const cloudCommunity: CommunityProjectItem[] = data.map(item => {
      const prof = profilesMap.get(item.user_id);
      const isLiked = cloudLikesSet.has(item.id) || localLikes.has(item.id);
      return {
        id: item.id,
        name: item.name || 'Ruta sin título',
        description: item.description || undefined,
        authorName: prof?.full_name || 'Comunidad MapAnim',
        authorAvatar: prof?.avatar_url || undefined,
        aspectRatio: (item.aspect_ratio || '16:9') as AspectRatio,
        durationSeconds: Number(item.duration_seconds || 12),
        stopsCount: Number(item.stops_count || 0),
        originName: item.origin_name || undefined,
        destinationName: item.destination_name || undefined,
        totalDistanceKm: Number(item.total_distance_km || 0),
        transportIcons: Array.isArray(item.transport_icons) && item.transport_icons.length > 0 ? item.transport_icons : ['🚗'],
        stylePreset: item.style_preset || 'vintageAmericana',
        shareSlug: item.share_slug || undefined,
        updatedAt: item.updated_at,
        isOfficial: false,
        projectData: item.project_data ? migrateProject(item.project_data) : undefined,
        likesCount: Number(item.likes_count || 0),
        viewsCount: Number(item.views_count || 0),
        forksCount: Number(item.forks_count || 0),
        userHasLiked: isLiked,
      };
    });

    // Merge: cloud items first (deduped by id), followed by curated official items
    const map = new Map<string, CommunityProjectItem>();
    cloudCommunity.forEach(p => map.set(p.id, p));
    curated.forEach(p => {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    });

    return { projects: Array.from(map.values()) };
  } catch (err: any) {
    console.error('Community projects fetch error:', err);
    return { projects: curated, error: err.message };
  }
}

/**
 * 1-Click Fork / Clone of a community project into the user's workspace.
 */
export async function forkCommunityProject(
  item: CommunityProjectItem
): Promise<{ project: ProjectData | null; error?: string }> {
  try {
    // Record the fork in Supabase metrics
    recordProjectFork(item.id).catch(() => {});

    let sourceProject: ProjectData | null = item.projectData || null;

    // If projectData wasn't embedded, fetch it directly
    if (!sourceProject) {
      if (item.id === 'community_route_66') {
        sourceProject = createRoute66Project();
      } else if (item.id === 'community_gran_tour_europe') {
        sourceProject = createEuropeDemoProject();
      } else {
        const cloud = await loadCloudProject(item.id);
        sourceProject = cloud.project;
      }
    }

    if (!sourceProject) {
      return { project: null, error: 'No se pudieron cargar los datos de la ruta para clonar.' };
    }

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}`;
    const cloned: ProjectData = {
      ...sourceProject,
      metadata: {
        ...sourceProject.metadata,
        id: newId,
        name: `${item.name} (Mi Copia)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Save locally
    await saveActiveProject(cloned);

    // If authenticated, also back up to cloud
    const userId = await getCurrentUserId();
    if (userId) {
      saveProjectToCloud(cloned).catch(e => console.warn('Cloud fork save error:', e));
    }

    return { project: cloned };
  } catch (err: any) {
    return { project: null, error: err.message || 'Error al clonar el proyecto' };
  }
}


