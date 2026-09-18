import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Upload,
  Download,
  Copy,
  Trash2,
  X,
  Search,
  Sparkles,
  Clock,
  Compass,
  MapPin,
  Smartphone,
  Monitor,
  Square,
  ArrowRight,
  FolderOpen,
  Cloud,
  UploadCloud,
  Globe2,
} from 'lucide-react';
import { CommunityGalleryTab } from './CommunityGalleryTab';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AspectRatio } from '../../core/types/project';
import { BrandLogo } from '../common/BrandLogo';
import {
  ProjectSummary,
  getProjectsRegistry,
  loadProjectById,
  deleteProjectById,
  duplicateProjectById,
  createNewProjectRecord,
  exportProjectToJson,
  importProjectFromJson,
} from '../../core/project/storage';
import {
  fetchCloudProjects,
  loadCloudProject,
  deleteCloudProject,
  syncAllLocalProjectsToCloud,
} from '../../core/project/cloudStorage';
import { useTouchDragToDismiss } from '../../hooks/useTouchDragToDismiss';

export const ProjectsManagerModal: React.FC = () => {
  const { isProjectsManagerOpen, setIsProjectsManagerOpen } = useEditorStore();
  const { project: activeProject, setProject } = useProjectStore();

  const { dragProps, sheetStyle } = useTouchDragToDismiss({
    onDismiss: () => setIsProjectsManagerOpen(false),
  });

  const [managerTab, setManagerTab] = useState<'my_projects' | 'community'>('my_projects');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | '9:16' | '16:9' | 'templates' | 'cloud'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'stops'>('recent');

  const { user, setIsAuthModalOpen } = useAuthStore();
  const [cloudProjectIds, setCloudProjectIds] = useState<Set<string>>(new Set());
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // New Project creation modal state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAspect, setNewProjectAspect] = useState<AspectRatio>('16:9');
  const [newProjectTemplate, setNewProjectTemplate] = useState<'blank' | 'route66' | 'europe'>('blank');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects list (combines local and Supabase cloud projects)
  const refreshProjectsList = async () => {
    setIsLoading(true);
    try {
      const list = await getProjectsRegistry();
      const combined = new Map<string, ProjectSummary>();
      list.forEach(p => combined.set(p.id, p));

      if (user) {
        const cloudRes = await fetchCloudProjects();
        if (cloudRes.projects && cloudRes.projects.length > 0) {
          const ids = new Set<string>();
          cloudRes.projects.forEach(cp => {
            ids.add(cp.id);
            if (!combined.has(cp.id)) {
              combined.set(cp.id, cp);
            }
          });
          setCloudProjectIds(ids);
        }
      }
      setProjects(Array.from(combined.values()));
    } catch (err) {
      console.error('Error loading projects list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isProjectsManagerOpen) {
      refreshProjectsList();
      setConfirmDeleteId(null);
      setIsCreatingNew(false);
    }
  }, [isProjectsManagerOpen, user]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProjectsManagerOpen) {
        if (isCreatingNew) {
          setIsCreatingNew(false);
        } else if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          setIsProjectsManagerOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectsManagerOpen, isCreatingNew, confirmDeleteId, setIsProjectsManagerOpen]);

  // Open Project (checks local first, falls back to Supabase cloud)
  const handleOpenProject = async (id: string) => {
    let loaded = await loadProjectById(id);
    if (!loaded && user) {
      const cloudRes = await loadCloudProject(id);
      if (cloudRes.project) {
        loaded = cloudRes.project;
      }
    }
    if (loaded) {
      setProject(loaded, true);
      setIsProjectsManagerOpen(false);
    } else {
      alert('No se pudo cargar el proyecto seleccionado.');
    }
  };

  // Duplicate Project
  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicated = await duplicateProjectById(id);
    if (duplicated) {
      await refreshProjectsList();
    }
  };

  // Delete Project (local + cloud)
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    const updated = await deleteProjectById(id);
    if (user) {
      await deleteCloudProject(id);
    }
    setProjects(updated);
    setConfirmDeleteId(null);
  };

  const handleSyncCloud = async () => {
    if (!user) {
      setIsAuthModalOpen(true, 'signin');
      return;
    }
    setIsSyncingCloud(true);
    try {
      await syncAllLocalProjectsToCloud();
      await refreshProjectsList();
    } catch (err) {
      console.error('Failed to sync to cloud:', err);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Export Project JSON
  const handleExportJson = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = await loadProjectById(id);
    if (target) {
      exportProjectToJson(target);
    }
  };

  // Import Project File
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importProjectFromJson(file);
      setProject(imported, true);
      await refreshProjectsList();
      setIsProjectsManagerOpen(false);
    } catch (err: any) {
      alert(`Error al importar proyecto: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm Create New Project
  const handleCreateNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createNewProjectRecord(
      newProjectName || 'Nuevo Viaje',
      newProjectTemplate,
      newProjectAspect
    );
    setProject(created, true);
    setIsCreatingNew(false);
    setIsProjectsManagerOpen(false);
  };

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchOrigin = p.originName?.toLowerCase().includes(q);
          const matchDest = p.destinationName?.toLowerCase().includes(q);
          if (!matchName && !matchOrigin && !matchDest) return false;
        }

        // Format filter
        if (formatFilter === '9:16' && p.aspectRatio !== '9:16') return false;
        if (formatFilter === '16:9' && p.aspectRatio !== '16:9') return false;
        if (formatFilter === 'templates' && !p.isTemplate) return false;
        if (formatFilter === 'cloud' && !cloudProjectIds.has(p.id)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stops') return b.stopsCount - a.stopsCount;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [projects, searchQuery, formatFilter, sortBy, cloudProjectIds]);

  if (!isProjectsManagerOpen) return null;

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMin < 2) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 md:p-6 animate-fade-in">
      {/* Hidden File Input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.routevideo"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Modal Container */}
      <div
        style={sheetStyle}
        className="bg-studio-950 border-0 sm:border border-white/[0.12] rounded-none sm:rounded-2xl w-full max-w-5xl h-full sm:h-[90vh] sm:max-h-[820px] shadow-2xl shadow-black/80 flex flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pointer-events-auto"
      >
        {/* Mobile Pull Down Handle */}
        <div
          {...dragProps}
          className="sm:hidden py-2.5 flex items-center justify-center bg-studio-900 cursor-grab active:cursor-grabbing touch-none select-none border-b border-white/[0.04] flex-shrink-0"
        >
          <div className="w-12 h-1.5 bg-studio-600 rounded-full" />
        </div>

        {/* Mobile Top Header (< sm) */}
        <div className="sm:hidden p-3.5 border-b border-white/[0.08] bg-studio-900/90 flex flex-col gap-2.5 flex-shrink-0">
          {/* Row 1: Brand & Primary Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-black text-white tracking-tight font-display truncate">
                    Proyectos
                  </h2>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-accent-950/80 text-accent-300 border border-accent-800/60">
                    {projects.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewProjectName('Nuevo Itinerario');
                  setIsCreatingNew(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-accent-600 to-rose-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-accent-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProjectsManagerOpen(false)}
                className="w-8 h-8 rounded-xl bg-studio-900 active:bg-studio-800 border border-studio-800 text-studio-400 hover:text-white flex items-center justify-center transition-colors"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Tabs & Secondary Utilities */}
          <div className="flex items-center gap-2">
            <div className="flex-1 grid grid-cols-2 bg-studio-950 p-1 rounded-xl border border-white/[0.08] shadow-inner">
              <button
                type="button"
                onClick={() => setManagerTab('my_projects')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  managerTab === 'my_projects'
                    ? 'bg-studio-800 text-white shadow-sm'
                    : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-accent-400" />
                <span>Mis Rutas</span>
                <span className="text-[10px] px-1 rounded-full bg-studio-900 text-studio-400 font-mono">
                  {projects.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setManagerTab('community')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  managerTab === 'community'
                    ? 'bg-gradient-to-r from-accent-600/30 to-purple-600/30 text-white border border-accent-500/40 shadow-sm'
                    : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5 text-accent-400" />
                <span>Comunidad</span>
                <span className="text-[9px] px-1 rounded-full bg-accent-950 text-accent-300 font-mono font-bold">
                  ✨
                </span>
              </button>
            </div>

            {/* Quick Mobile Utilities: Import JSON & Sync */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-xl bg-studio-900 active:bg-studio-800 border border-studio-750 text-studio-300 flex items-center justify-center transition-all"
                title="Importar JSON"
                aria-label="Importar JSON"
              >
                <Upload className="w-3.5 h-3.5 text-studio-400" />
              </button>

              {user && (
                <button
                  type="button"
                  onClick={handleSyncCloud}
                  disabled={isSyncingCloud}
                  className="w-8 h-8 rounded-xl bg-studio-900 active:bg-studio-800 border border-studio-750 text-emerald-400 flex items-center justify-center transition-all disabled:opacity-50"
                  title="Sincronizar proyectos con la nube"
                  aria-label="Sincronizar proyectos con la nube"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Top Header (sm+) */}
        <div className="hidden sm:flex p-4 sm:p-5 border-b border-white/[0.08] bg-studio-900/80 items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <BrandLogo size="md" showSubtitle />
            <div className="h-8 w-px bg-white/[0.1]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight font-display">
                  Biblioteca de Proyectos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-950/80 text-accent-300 border border-accent-800/60">
                  {projects.length} guardados
                </span>
              </div>
              <p className="text-[11px] text-studio-400 font-sans">
                Tus itinerarios cinemáticos, animaciones de viaje y plantillas
              </p>
            </div>
          </div>

          {/* Tab Switcher: Mis Proyectos vs Comunidad */}
          <div className="flex items-center bg-studio-950 p-1 rounded-xl border border-white/[0.08] shadow-inner">
            <button
              type="button"
              onClick={() => setManagerTab('my_projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                managerTab === 'my_projects'
                  ? 'bg-studio-800 text-white shadow-sm'
                  : 'text-studio-400 hover:text-studio-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-accent-400" />
              <span>Mis Proyectos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-studio-900 text-studio-400 font-mono">
                {projects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setManagerTab('community')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                managerTab === 'community'
                  ? 'bg-gradient-to-r from-accent-600/30 to-purple-600/30 text-white border border-accent-500/40 shadow-sm'
                  : 'text-studio-400 hover:text-studio-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-accent-400" />
              <span>Comunidad</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-accent-950 text-accent-300 font-mono font-bold">
                Rutas ✨
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewProjectName('Nuevo Itinerario');
                setIsCreatingNew(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-accent-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-accent-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Proyecto</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-studio-900 hover:bg-studio-800 border border-studio-750 text-studio-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
              title="Importar archivo .routevideo.json"
            >
              <Upload className="w-3.5 h-3.5 text-studio-400" />
              <span>Importar JSON</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={handleSyncCloud}
                disabled={isSyncingCloud}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-studio-900 hover:bg-studio-800 border border-studio-750 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title="Sincronizar proyectos locales con tu cuenta"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
                <span>{isSyncingCloud ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsProjectsManagerOpen(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-studio-900 hover:bg-studio-800 border border-studio-750 text-studio-200 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 ml-1"
              title="Continuar editando el proyecto activo en el editor"
            >
              <span>Ir al Editor</span>
              <ArrowRight className="w-3.5 h-3.5 text-studio-400" />
            </button>

            <button
              type="button"
              onClick={() => setIsProjectsManagerOpen(false)}
              className="p-2 rounded-xl bg-studio-900 hover:bg-studio-800 border border-studio-800 text-studio-400 hover:text-white transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {managerTab === 'community' ? (
          <CommunityGalleryTab
            onProjectLoaded={(cloned) => {
              setProject(cloned, true);
              setIsProjectsManagerOpen(false);
            }}
          />
        ) : (
          <>
            {/* Search & Filter Bar */}
            <div className="p-3 sm:p-4 border-b border-white/[0.08] bg-studio-900/40 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between flex-shrink-0">
              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-studio-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o parada..."
                  className="w-full bg-studio-950 border border-studio-750 rounded-xl pl-9 pr-8 py-2 sm:py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-accent-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-studio-500 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills & Sort Selector */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFormatFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[34px] flex items-center gap-1.5 ${
                    formatFilter === 'all'
                      ? 'bg-studio-800 text-white border border-studio-700 shadow-sm'
                      : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
                  }`}
                >
                  <span>Todos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('9:16')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[34px] flex items-center gap-1.5 ${
                    formatFilter === '9:16'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800 shadow-sm'
                      : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Vertical (9:16)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('16:9')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[34px] flex items-center gap-1.5 ${
                    formatFilter === '16:9'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800 shadow-sm'
                      : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-purple-400" />
                  <span>Panorámico (16:9)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormatFilter('templates')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[34px] flex items-center gap-1.5 ${
                    formatFilter === 'templates'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow-sm'
                      : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Plantillas</span>
                </button>

                {user && (
                  <button
                    type="button"
                    onClick={() => setFormatFilter('cloud')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[34px] flex items-center gap-1.5 ${
                      formatFilter === 'cloud'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm'
                        : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nube ({cloudProjectIds.size})</span>
                  </button>
                )}

                {/* Sort selector */}
                <div className="ml-auto flex-shrink-0 pl-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-studio-950 border border-studio-800 rounded-xl px-2.5 py-1.5 text-xs text-studio-300 focus:outline-none min-h-[34px]"
                  >
                    <option value="recent">Más recientes</option>
                    <option value="name">Nombre (A-Z)</option>
                    <option value="stops">Más paradas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Main Body: Project Cards Grid */}
            <div
              data-scrollable="true"
              className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar touch-pan-y overscroll-contain"
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain',
              }}
            >
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-studio-400">
                  <Compass className="w-8 h-8 animate-spin text-accent-400" />
                  <span className="text-xs font-mono">Cargando biblioteca de proyectos...</span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="h-72 border border-dashed border-studio-800 rounded-2xl flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-studio-900 border border-studio-800 flex items-center justify-center text-studio-500">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">No se encontraron proyectos</h4>
                    <p className="text-xs text-studio-400 mt-1 max-w-sm">
                      {searchQuery
                        ? `No hay proyectos que coincidan con "${searchQuery}".`
                        : 'Aún no tienes proyectos guardados con los filtros seleccionados.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFormatFilter('all');
                      setIsCreatingNew(true);
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Crear Nuevo Proyecto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                  {filteredProjects.map((p) => {
                    const isActive = activeProject.metadata.id === p.id;
                    const isConfirming = confirmDeleteId === p.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleOpenProject(p.id)}
                        className={`group relative rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden ${
                          isActive
                            ? 'bg-studio-900/95 border-emerald-700/80 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                            : 'bg-studio-900/60 hover:bg-studio-900 border-white/[0.08] hover:border-white/[0.18] shadow-md hover:shadow-xl'
                        }`}
                      >
                        {/* Top Row: Title, Badges */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm text-white truncate group-hover:text-accent-300 transition-colors">
                                  {p.name}
                                </h3>
                                {isActive && (
                                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/70 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Activo</span>
                                  </span>
                                )}
                                {p.isTemplate && (
                                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                                    Plantilla
                                  </span>
                                )}
                                {cloudProjectIds.has(p.id) && (
                                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                                    <Cloud className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>Nube</span>
                                  </span>
                                )}
                              </div>
                              {p.description && (
                                <p className="text-[11px] text-studio-400 truncate mt-0.5">
                                  {p.description}
                                </p>
                              )}
                            </div>

                            {/* Aspect Ratio Badge */}
                            <span
                              className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border flex items-center gap-1 ${
                                p.aspectRatio === '9:16'
                                  ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                                  : p.aspectRatio === '1:1'
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                                  : 'bg-studio-800 text-studio-300 border-studio-700'
                              }`}
                            >
                              {p.aspectRatio === '9:16' ? (
                                <Smartphone className="w-3 h-3 text-sky-400" />
                              ) : p.aspectRatio === '1:1' ? (
                                <Square className="w-3 h-3 text-amber-400" />
                              ) : (
                                <Monitor className="w-3 h-3 text-studio-400" />
                              )}
                              <span>{p.aspectRatio}</span>
                            </span>
                          </div>

                          {/* Route Path visual indicator */}
                          <div className="bg-studio-950/80 border border-studio-800/80 rounded-xl p-2.5 my-2.5">
                            <div className="flex items-center justify-between text-xs text-white font-medium gap-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-accent-400 flex-shrink-0" />
                                <span className="truncate">{p.originName || 'Inicio'}</span>
                              </div>

                              <ArrowRight className="w-3.5 h-3.5 text-studio-500 flex-shrink-0" />

                              <div className="flex items-center gap-1.5 truncate justify-end text-right">
                                <span className="truncate">{p.destinationName || 'Destino'}</span>
                                <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                              </div>
                            </div>

                            {/* Transport indicators */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-studio-800/60 text-[10px] text-studio-400 font-mono">
                              <div className="flex items-center gap-1">
                                <span>Transporte:</span>
                                {p.transportIcons.includes('plane') && <span>✈️ Avión</span>}
                                {p.transportIcons.includes('vintageCar') && <span>🚗 Coche</span>}
                                {p.transportIcons.includes('car') && <span>🚗 Coche</span>}
                                {p.transportIcons.includes('motorcycle') && <span>🏍️ Moto</span>}
                                {p.transportIcons.includes('bus') && <span>🚐 Camper</span>}
                              </div>
                              <span>Estilo: {p.stylePreset || 'vintage'}</span>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono text-[10px] text-studio-400 bg-studio-950/40 rounded-lg p-1.5 border border-studio-800/40">
                            <div>
                              <span className="text-white font-bold block">{p.stopsCount}</span>
                              <span>Paradas</span>
                            </div>
                            <div className="border-x border-studio-800/60">
                              <span className="text-white font-bold block">{p.durationSeconds}s</span>
                              <span>Duración</span>
                            </div>
                            <div>
                              <span className="text-white font-bold block">
                                {p.totalDistanceKm ? `${p.totalDistanceKm.toLocaleString()} km` : '---'}
                              </span>
                              <span>Distancia</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Last modified & Actions */}
                        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                          <span className="text-[10px] text-studio-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(p.updatedAt)}</span>
                          </span>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Duplicate Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDuplicate(p.id, e)}
                              className="w-9 h-9 rounded-xl bg-studio-800 hover:bg-studio-700 active:scale-95 text-studio-300 hover:text-white flex items-center justify-center transition-all"
                              title="Duplicar proyecto"
                              aria-label="Duplicar proyecto"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Export JSON Button */}
                            <button
                              type="button"
                              onClick={(e) => handleExportJson(p.id, e)}
                              className="w-9 h-9 rounded-xl bg-studio-800 hover:bg-studio-700 active:scale-95 text-studio-300 hover:text-white flex items-center justify-center transition-all"
                              title="Descargar archivo JSON del proyecto"
                              aria-label="Descargar archivo JSON del proyecto"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button (with inline confirm) */}
                            {!p.isTemplate && projects.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => handleDelete(p.id, e)}
                                className={`h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                                  isConfirming
                                    ? 'bg-red-600 text-white font-bold text-xs px-3 animate-pulse'
                                    : 'w-9 bg-studio-800 hover:bg-red-950/80 text-studio-400 hover:text-red-300'
                                }`}
                                title={isConfirming ? 'Click de nuevo para confirmar eliminación' : 'Eliminar proyecto'}
                                aria-label={isConfirming ? 'Confirmar eliminación' : 'Eliminar proyecto'}
                              >
                                {isConfirming ? '¿Borrar?' : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {/* Open Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenProject(p.id)}
                              className={`ml-1 px-4 h-9 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                                isActive
                                  ? 'bg-studio-800/90 text-emerald-300 border border-emerald-700/50 shadow-sm'
                                  : 'bg-accent-600 hover:bg-accent-500 text-white shadow-md shadow-accent-600/20'
                              }`}
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>{isActive ? 'Abierto' : 'Abrir'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* New Project Creator Overlay Modal */}
        {isCreatingNew && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-studio-950 border border-white/[0.12] rounded-2xl w-full max-w-md shadow-2xl shadow-black max-h-[92vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-studio-900/60">
                <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-accent-400" />
                  </div>
                  <span>Crear Nuevo Proyecto</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="w-8 h-8 rounded-xl bg-studio-900 hover:bg-studio-800 border border-studio-800 text-studio-400 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewProject} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-studio-400 mb-1.5 font-bold">
                    Nombre del Viaje / Proyecto
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ej: Ruta Costa Oeste, Viaje por Japón..."
                    className="w-full bg-studio-900 border border-studio-750 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-studio-500 focus:outline-none focus:border-accent-500 transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-studio-400 mb-1.5 font-bold">
                    Formato de Vídeo
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewProjectAspect('16:9')}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center active:scale-95 ${
                        newProjectAspect === '16:9'
                          ? 'bg-purple-950/70 border-purple-500 text-white font-bold ring-1 ring-purple-500/40 shadow-md'
                          : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-white hover:border-studio-700'
                      }`}
                    >
                      <Monitor className="w-5 h-5 mb-1 text-purple-400" />
                      <div className="font-bold text-xs">16:9</div>
                      <div className="text-[9px] text-studio-400 mt-0.5">Horizontal</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewProjectAspect('9:16')}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center active:scale-95 ${
                        newProjectAspect === '9:16'
                          ? 'bg-sky-950/70 border-sky-500 text-white font-bold ring-1 ring-sky-500/40 shadow-md'
                          : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-white hover:border-studio-700'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 mb-1 text-sky-400" />
                      <div className="font-bold text-xs">9:16</div>
                      <div className="text-[9px] text-studio-400 mt-0.5">Reels / TikTok</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewProjectAspect('1:1')}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center active:scale-95 ${
                        newProjectAspect === '1:1'
                          ? 'bg-amber-950/70 border-amber-500 text-white font-bold ring-1 ring-amber-500/40 shadow-md'
                          : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-white hover:border-studio-700'
                      }`}
                    >
                      <Square className="w-5 h-5 mb-1 text-amber-400" />
                      <div className="font-bold text-xs">1:1</div>
                      <div className="text-[9px] text-studio-400 mt-0.5">Cuadrado</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-studio-400 mb-1.5 font-bold">
                    Plantilla de inicio
                  </label>
                  <div className="space-y-2">
                    <div
                      onClick={() => setNewProjectTemplate('blank')}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
                        newProjectTemplate === 'blank'
                          ? 'bg-studio-850/90 border-accent-500/60 ring-1 ring-accent-500/30 shadow-sm'
                          : 'bg-studio-900/60 border-studio-800 hover:border-studio-700'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            newProjectTemplate === 'blank'
                              ? 'border-accent-500 bg-accent-600'
                              : 'border-studio-600 bg-studio-950'
                          }`}
                        >
                          {newProjectTemplate === 'blank' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs">Lienzo en blanco</div>
                        <div className="text-[11px] text-studio-400 mt-0.5">
                          Comienza con un proyecto vacío y añade tus paradas a mano o con el Copiloto IA.
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setNewProjectTemplate('route66')}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
                        newProjectTemplate === 'route66'
                          ? 'bg-studio-850/90 border-accent-500/60 ring-1 ring-accent-500/30 shadow-sm'
                          : 'bg-studio-900/60 border-studio-800 hover:border-studio-700'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            newProjectTemplate === 'route66'
                              ? 'border-accent-500 bg-accent-600'
                              : 'border-studio-600 bg-studio-950'
                          }`}
                        >
                          {newProjectTemplate === 'route66' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs">Ruta 66 USA (11 paradas)</div>
                        <div className="text-[11px] text-studio-400 mt-0.5">
                          La emblemática ruta clásica de Chicago a Santa Mónica.
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setNewProjectTemplate('europe')}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
                        newProjectTemplate === 'europe'
                          ? 'bg-studio-850/90 border-accent-500/60 ring-1 ring-accent-500/30 shadow-sm'
                          : 'bg-studio-900/60 border-studio-800 hover:border-studio-700'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            newProjectTemplate === 'europe'
                              ? 'border-accent-500 bg-accent-600'
                              : 'border-studio-600 bg-studio-950'
                          }`}
                        >
                          {newProjectTemplate === 'europe' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-xs">Grand Tour de Europa (5 paradas)</div>
                        <div className="text-[11px] text-studio-400 mt-0.5">
                          París, Lyon, Ginebra, Milán y Roma con curvas cinemáticas.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-studio-800">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-800 text-studio-300 hover:text-white text-xs font-semibold active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-accent-600/20 active:scale-95 transition-all"
                  >
                    Crear y Abrir
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

