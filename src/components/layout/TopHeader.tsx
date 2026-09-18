import React, { useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Upload,
  Bug,
  Ratio,
  MoreVertical,
  Sparkles,
  Check,
  Plus,
  FolderKanban,
  Cloud,
  Share2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Music,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useEditorStore } from '../../store/useEditorStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSyncStore } from '../../store/useSyncStore';
import { exportProjectToJson, importProjectFromJson } from '../../core/project/storage';
import { AspectRatio } from '../../core/types/project';
import { BrandLogo } from '../common/BrandLogo';
import { CollaboratorsPresenceWidget } from '../collaboration/CollaboratorsPresenceWidget';

const ASPECT_OPTIONS: { ratio: AspectRatio; label: string; desc: string }[] = [
  { ratio: '16:9', label: '16:9', desc: 'Horizontal (YouTube, TV)' },
  { ratio: '9:16', label: '9:16', desc: 'Vertical (Reels, TikTok, Shorts)' },
  { ratio: '1:1', label: '1:1', desc: 'Cuadrado (Instagram Feed)' },
  { ratio: '4:3', label: '4:3', desc: 'Clásico (Presentaciones)' },
  { ratio: '21:9', label: '21:9', desc: 'Cinemático Ultra-Wide' },
];

export const TopHeader: React.FC = () => {
  const {
    project,
    setProject,
    undo,
    redo,
    canUndo,
    canRedo,
    updateVideo,
    isSaved,
    createNewProject,
  } = useProjectStore();

  const {
    showSafeArea,
    setShowSafeArea,
    showDebugOverlay,
    setShowDebugOverlay,
    setIsExportDialogOpen,
    setIsAiChatOpen,
    setIsProjectsManagerOpen,
    setIsThemePickerOpen,
    setIsShareModalOpen,
    setIsAudioModalOpen,
  } = useEditorStore();

  const { user, profile, setIsAuthModalOpen } = useAuthStore();
  const { status: syncStatus, lastSyncedAt } = useSyncStore();

  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isAspectMenuOpen, setIsAspectMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importProjectFromJson(file);
      setProject(imported, true);
    } catch (err) {
      alert('Error al leer el archivo JSON del proyecto.');
    }
  };

  const handleAspectRatioChange = (ratio: AspectRatio) => {
    let width = 1920;
    let height = 1080;
    if (ratio === '9:16') {
      width = 1080;
      height = 1920;
    } else if (ratio === '1:1') {
      width = 1080;
      height = 1080;
    } else if (ratio === '4:3') {
      width = 1440;
      height = 1080;
    } else if (ratio === '21:9') {
      width = 2560;
      height = 1080;
    }
    updateVideo({ aspectRatio: ratio, width, height });
  };

  return (
    <header className="h-12 md:h-13 px-3 sm:px-4 bg-studio-950/95 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between z-40 select-none flex-shrink-0 relative">
      {/* ========================================================
          ZONA 1 (IZQUIERDA): Identidad, Archivo y Guardado
         ======================================================== */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-shrink-0">
        <BrandLogo size="md" />

        {/* Menú Desplegable de Archivo / Proyecto (Desktop) */}
        <div className="hidden lg:block relative">
          <button
            type="button"
            onClick={() => {
              setIsProjectMenuOpen(!isProjectMenuOpen);
              setIsAspectMenuOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-900/90 hover:bg-studio-850 border border-studio-800 text-studio-200 hover:text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            title="Opciones de archivo y proyecto"
          >
            <FolderKanban className="w-3.5 h-3.5 text-accent-400" />
            <span>Archivo</span>
            <ChevronDown className="w-3 h-3 text-studio-400" />
          </button>

          {isProjectMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProjectMenuOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-studio-900 border border-studio-750 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectsManagerOpen(true);
                    setIsProjectMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-studio-800 rounded-lg text-left font-medium transition-colors"
                >
                  <FolderKanban className="w-4 h-4 text-accent-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold">Biblioteca de Proyectos</span>
                    <span className="text-[10px] text-studio-400">Ver y cambiar de viaje</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    if (
                      project.route.stops.length > 0 &&
                      !window.confirm('¿Empezar un nuevo viaje? Los cambios actuales ya están guardados.')
                    ) {
                      return;
                    }
                    createNewProject('Nuevo Viaje');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left font-medium transition-colors"
                >
                  <Plus className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Nuevo Viaje</span>
                </button>

                <div className="h-px bg-studio-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    exportProjectToJson(project);
                    setIsProjectMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left font-medium transition-colors"
                >
                  <Download className="w-4 h-4 text-studio-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span>Descargar copia JSON</span>
                    <span className="text-[10px] text-studio-400">Respaldo local en tu disco</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsProjectMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left font-medium transition-colors"
                >
                  <Upload className="w-4 h-4 text-studio-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span>Abrir archivo JSON</span>
                    <span className="text-[10px] text-studio-400">Cargar proyecto desde tu equipo</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAudioModalOpen(true);
                    setIsProjectMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left font-medium transition-colors"
                >
                  <Music className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span>Música & Efectos Sonoros</span>
                    <span className="text-[10px] text-studio-400">Banda sonora y efectos SFX</span>
                  </div>
                </button>

                <div className="h-px bg-studio-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setShowSafeArea(!showSafeArea);
                    setIsProjectMenuOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Ratio className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Guías de Área Segura</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      showSafeArea
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                        : 'text-studio-500'
                    }`}
                  >
                    {showSafeArea ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDebugOverlay(!showDebugOverlay);
                    setIsProjectMenuOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left font-medium transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bug className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Diagnóstico de Render</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      showDebugOverlay
                        ? 'bg-purple-950 text-purple-300 border border-purple-700/60'
                        : 'text-studio-500'
                    }`}
                  >
                    {showDebugOverlay ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.routevideo"
          onChange={handleImportFile}
          className="hidden"
        />

        {/* Nombre del Proyecto (Editable Inline) */}
        <div className="hidden md:flex items-center gap-1.5 min-w-0">
          <input
            type="text"
            value={project.metadata.name}
            onChange={e =>
              setProject(
                {
                  ...project,
                  metadata: { ...project.metadata, name: e.target.value },
                },
                false
              )
            }
            className="bg-transparent hover:bg-studio-900 focus:bg-studio-900 border border-transparent hover:border-studio-750 focus:border-accent-500/50 text-studio-100 font-bold text-xs px-2 py-1 rounded-md focus:outline-none transition-all w-28 lg:w-44 truncate"
            title="Haz clic para renombrar el viaje"
          />
        </div>

        {/* Live Cloud Sync Indicator */}
        <div className="hidden sm:flex items-center">
          {user ? (
            syncStatus === 'syncing' ? (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono bg-cyan-950/40 border border-cyan-700/50 px-2 py-0.5 rounded-md animate-pulse shadow-sm"
                title="Sincronizando cambios con Supabase Cloud..."
              >
                <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                <span className="hidden lg:inline">Guardando...</span>
              </span>
            ) : syncStatus === 'error' ? (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-amber-300 font-mono bg-amber-950/40 border border-amber-700/50 px-2 py-0.5 rounded-md shadow-sm"
                title="Sin conexión al servidor; cambios guardados en este navegador"
              >
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span className="hidden lg:inline">Guardado local</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-700/50 px-2 py-0.5 rounded-md shadow-sm cursor-default"
                title={
                  lastSyncedAt
                    ? `Sincronizado a las ${lastSyncedAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}`
                    : 'Guardado y sincronizado en la nube'
                }
              >
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden lg:inline">Nube</span>
              </span>
            )
          ) : (
            isSaved && (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true, 'signin')}
                className="inline-flex items-center gap-1.5 text-[10px] text-studio-400 hover:text-studio-200 font-mono bg-studio-900/80 hover:bg-studio-850 border border-studio-800 px-2 py-0.5 rounded-md transition-colors"
                title="Guardado local en este navegador. Inicia sesión para activar el respaldo en la nube."
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="hidden lg:inline">Guardado local</span>
              </button>
            )
          )}
        </div>

        {/* Realtime Collaborators Presence */}
        <div className="hidden sm:flex items-center">
          <CollaboratorsPresenceWidget />
        </div>
      </div>

      {/* ========================================================
          ZONA 2 (CENTRO): Título en Móvil / Lienzo & Selector en Desktop
         ======================================================== */}
      {/* Centro Móvil: Título del Viaje & Estado de Sincronización */}
      <div className="flex lg:hidden items-center justify-center min-w-0 px-2 flex-1">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-studio-900/90 border border-white/[0.08] shadow-sm max-w-[160px] xs:max-w-[220px] active:scale-95 transition-all truncate"
          title="Toca para ver opciones del viaje"
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${syncStatus === 'syncing' ? 'bg-cyan-400 animate-pulse' : syncStatus === 'error' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <span className="text-xs font-bold text-studio-100 truncate">{project.metadata.name}</span>
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-2.5">
        {/* Undo / Redo */}
        <div className="flex items-center bg-studio-900/90 rounded-lg p-0.5 border border-studio-800 shadow-inner">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 rounded text-studio-400 hover:text-studio-100 hover:bg-studio-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded text-studio-400 hover:text-studio-100 hover:bg-studio-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Selector Desplegable de Relación de Aspecto */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsAspectMenuOpen(!isAspectMenuOpen);
              setIsProjectMenuOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-900/90 hover:bg-studio-850 border border-studio-800 hover:border-studio-700 text-studio-200 hover:text-white text-xs font-mono font-bold shadow-sm transition-all"
            title="Cambiar formato del video"
          >
            <span>{project.video.aspectRatio}</span>
            <ChevronDown className="w-3 h-3 text-studio-400" />
          </button>

          {isAspectMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsAspectMenuOpen(false)}
              />
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-64 bg-studio-900 border border-studio-750 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-fade-in font-sans">
                {ASPECT_OPTIONS.map(opt => (
                  <button
                    key={opt.ratio}
                    type="button"
                    onClick={() => {
                      handleAspectRatioChange(opt.ratio);
                      setIsAspectMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                      project.video.aspectRatio === opt.ratio
                        ? 'bg-accent-600/15 border border-accent-500/30 text-white font-bold'
                        : 'text-studio-300 hover:bg-studio-800 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono font-bold">{opt.label}</span>
                      <span className="text-[10px] text-studio-400">{opt.desc}</span>
                    </div>
                    {project.video.aspectRatio === opt.ratio && (
                      <Check className="w-4 h-4 text-accent-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================
          ZONA 3 (DERECHA): Acciones, Compartir, Exportar & Perfil
         ======================================================== */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Audio Studio (Desktop) */}
        <button
          type="button"
          onClick={() => setIsAudioModalOpen(true)}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all active:scale-95 ${
            project.audio?.enabled
              ? 'bg-pink-950/40 border-pink-500/50 text-pink-300 hover:text-white'
              : 'bg-studio-900/90 hover:bg-studio-850 text-studio-300 hover:text-pink-200 border-studio-800 hover:border-pink-500/40'
          }`}
          title="Estudio de audio: música de fondo y efectos SFX"
        >
          <Music className="w-3.5 h-3.5 text-pink-400" />
          <span className="hidden xl:inline">Audio</span>
        </button>

        {/* Temas Visuales (Desktop) */}
        <button
          type="button"
          onClick={() => setIsThemePickerOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-900/90 hover:bg-studio-850 text-studio-300 hover:text-amber-200 text-xs font-semibold border border-studio-800 hover:border-amber-500/40 shadow-sm transition-all active:scale-95"
          title="Explorar temas visuales con 1 clic"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">Temas</span>
        </button>

        {/* Copiloto IA de Rutas (Desktop) */}
        <button
          type="button"
          onClick={() => setIsAiChatOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-900/90 hover:bg-studio-850 text-purple-300 hover:text-white text-xs font-semibold border border-purple-800/40 hover:border-purple-600/60 shadow-sm transition-all active:scale-95"
          title="Abrir Copiloto IA"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="hidden xl:inline">IA Copilot</span>
        </button>

        {/* Compartir Ruta (Desktop/Tablet) */}
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-studio-900/90 hover:bg-studio-850 text-sky-300 hover:text-white text-xs font-bold border border-sky-500/40 hover:border-sky-500/70 shadow-sm transition-all active:scale-95 min-h-[36px]"
          title="Compartir enlace público o código embebible"
        >
          <Share2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Compartir</span>
        </button>

        {/* Botón Héroe Principal: Exportar Video (Siempre visible y prominente) */}
        <button
          type="button"
          onClick={() => setIsExportDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-xl bg-gradient-to-r from-accent-600 via-rose-600 to-amber-600 hover:brightness-110 text-white text-xs font-extrabold shadow-lg shadow-accent-600/30 border border-white/20 transition-all active:scale-95 min-h-[36px]"
          title="Exportar video de la ruta animada"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span>Exportar</span>
        </button>

        {/* Perfil de Usuario / Iniciar Sesión (Desktop/Tablet) */}
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(true, user ? 'profile' : 'signin')}
          className={`hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all active:scale-95 min-h-[36px] ${
            user
              ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
              : 'bg-studio-900/90 hover:bg-studio-850 text-studio-200 hover:text-white border-studio-800'
          }`}
          title={user ? `Mi Cuenta (${user.email})` : 'Iniciar Sesión'}
        >
          {user ? (
            <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[10px] text-white font-bold">
              {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-accent-400" />
              <span className="hidden md:inline">Entrar</span>
            </>
          )}
        </button>

        {/* Menú de Opciones en Móvil */}
        <div className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-studio-900/90 hover:bg-studio-850 border border-studio-750 text-studio-300 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center shadow-sm"
            title="Más Opciones"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-studio-900 border border-studio-750 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1.5 animate-fade-in text-xs">
                {/* Nombre de la ruta en móvil */}
                <div className="px-2 py-1.5 bg-studio-950/80 rounded-lg border border-studio-800">
                  <span className="text-[10px] text-studio-400 uppercase font-mono block mb-1">Nombre del Viaje</span>
                  <input
                    type="text"
                    value={project.metadata.name}
                    onChange={e =>
                      setProject(
                        {
                          ...project,
                          metadata: { ...project.metadata, name: e.target.value },
                        },
                        false
                      )
                    }
                    className="w-full bg-studio-900 border border-studio-750 text-studio-100 font-bold text-xs px-2 py-1 rounded focus:outline-none focus:border-accent-500"
                  />
                </div>

                {/* Colaboradores en móvil */}
                <div className="sm:hidden flex items-center justify-between px-2 py-1.5 bg-studio-950/60 rounded-lg border border-studio-800">
                  <span className="text-[11px] text-studio-400 font-medium">Colaboración</span>
                  <CollaboratorsPresenceWidget />
                </div>

                {/* Deshacer / Rehacer en móvil para pantallas muy estrechas */}
                <div className="xs:hidden flex items-center justify-between px-2 py-1 bg-studio-950/40 rounded-lg border border-studio-800/80">
                  <span className="text-[11px] text-studio-400 font-medium">Historial</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={undo}
                      disabled={!canUndo()}
                      className="p-1 rounded bg-studio-850 hover:bg-studio-800 text-studio-300 disabled:opacity-30"
                      title="Deshacer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={redo}
                      disabled={!canRedo()}
                      className="p-1 rounded bg-studio-850 hover:bg-studio-800 text-studio-300 disabled:opacity-30"
                      title="Rehacer"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Selector de formato para móvil */}
                <div className="px-2.5 py-1.5 border-b border-studio-800 flex items-center justify-between">
                  <span className="text-[11px] text-studio-400 font-medium">Formato</span>
                  <select
                    value={project.video.aspectRatio}
                    onChange={e => {
                      handleAspectRatioChange(e.target.value as AspectRatio);
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-studio-950 border border-studio-800 text-studio-200 text-xs font-mono font-bold rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="16:9">16:9 (Horizontal)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="1:1">1:1 (Cuadrado)</option>
                    <option value="4:3">4:3 (Clásico)</option>
                    <option value="21:9">21:9 (Cine)</option>
                  </select>
                </div>

                {/* Acciones de Proyecto */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectsManagerOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left font-medium"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-accent-400 flex-shrink-0" />
                  <span>Biblioteca de Proyectos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsShareModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-sky-300 hover:bg-studio-800 rounded-lg text-left font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span>Compartir Ruta Pública</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAudioModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-pink-300 hover:bg-studio-800 rounded-lg text-left font-semibold"
                >
                  <Music className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                  <span>Música & SFX</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsThemePickerOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-studio-800 rounded-lg text-left font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Temas Visuales</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAiChatOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-purple-300 hover:bg-studio-800 rounded-lg text-left font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span>IA Copilot</span>
                </button>

                <div className="h-px bg-studio-800 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(true, user ? 'profile' : 'signin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 text-xs text-studio-200 hover:text-white hover:bg-studio-800 rounded-lg text-left"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{user ? `Cuenta (${user.email?.split('@')[0]})` : 'Iniciar Sesión / Nube'}</span>
                  </div>
                  {user && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSafeArea(!showSafeArea);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 text-xs text-studio-300 hover:bg-studio-800 rounded-lg text-left"
                >
                  <div className="flex items-center gap-2">
                    <Ratio className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>Área Segura</span>
                  </div>
                  <span className="text-[10px] text-studio-500 font-mono">
                    {showSafeArea ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowDebugOverlay(!showDebugOverlay);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between px-2.5 py-1.5 text-xs text-studio-300 hover:bg-studio-800 rounded-lg text-left"
                >
                  <div className="flex items-center gap-2">
                    <Bug className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Diagnóstico</span>
                  </div>
                  <span className="text-[10px] text-studio-500 font-mono">
                    {showDebugOverlay ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

