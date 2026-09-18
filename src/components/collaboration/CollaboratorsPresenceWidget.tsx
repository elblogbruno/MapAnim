import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertCircle, RefreshCw, X, Sparkles } from 'lucide-react';
import { useRealtimeRoomStore } from '../../store/useRealtimeRoomStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { loadCloudProject } from '../../core/project/cloudStorage';
import { haptics } from '../../utils/haptics';

export const CollaboratorsPresenceWidget: React.FC = () => {
  const { project, setProject } = useProjectStore();
  const { user, profile } = useAuthStore();
  const {
    collaborators,
    isConnected,
    hasRemoteChanges,
    joinRoom,
    clearRemoteChangesFlag,
  } = useRealtimeRoomStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const projectId = project.metadata?.id || 'default_project';

  // Join or switch room when project ID or user changes
  useEffect(() => {
    if (projectId) {
      joinRoom(projectId, {
        userId: user?.id,
        name: profile?.full_name || user?.email?.split('@')[0] || 'Tú',
        avatarUrl: profile?.avatar_url,
      });
    }
  }, [projectId, user?.id, profile?.full_name, profile?.avatar_url, joinRoom]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleReloadRemote = async () => {
    if (!projectId) return;
    setIsReloading(true);
    haptics.medium();
    try {
      const res = await loadCloudProject(projectId);
      if (res.project) {
        setProject(res.project, true);
        clearRemoteChangesFlag();
      }
    } catch (err) {
      console.error('Error reloading remote project:', err);
    } finally {
      setIsReloading(false);
      setIsOpen(false);
    }
  };

  const count = collaborators.length;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Presence Trigger Button */}
      <button
        type="button"
        onClick={() => {
          haptics.light();
          setIsOpen(!isOpen);
        }}
        className={`h-8 sm:h-7.5 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-semibold select-none ${
          hasRemoteChanges
            ? 'bg-amber-950/80 border-amber-500 text-amber-200 animate-pulse'
            : count > 1
            ? 'bg-purple-950/80 border-purple-700/80 text-purple-200 hover:bg-purple-900/60 shadow-sm'
            : isConnected
            ? 'bg-studio-900/80 border-studio-800 text-studio-300 hover:text-white hover:bg-studio-850'
            : 'bg-studio-900/50 border-studio-800/60 text-studio-500'
        }`}
        title="Colaboradores en tiempo real (Supabase Realtime)"
      >
        {/* Connection status dot */}
        <span className="relative flex h-2 w-2">
          {hasRemoteChanges ? (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          ) : count > 1 ? (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
          ) : null}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              hasRemoteChanges
                ? 'bg-amber-400'
                : count > 1
                ? 'bg-purple-400'
                : isConnected
                ? 'bg-emerald-400'
                : 'bg-studio-600'
            }`}
          />
        </span>

        {/* Stacked collaborator avatars preview */}
        {count > 1 ? (
          <div className="flex -space-x-1.5 items-center overflow-hidden">
            {collaborators.slice(0, 3).map((collab, i) => (
              <div
                key={collab.clientId || i}
                className="w-4 h-4 rounded-full border border-studio-950 flex items-center justify-center text-[8px] font-bold text-white shadow-xs overflow-hidden"
                style={{ backgroundColor: collab.color }}
              >
                {collab.avatarUrl ? (
                  <img src={collab.avatarUrl} alt={collab.userName} className="w-full h-full object-cover" />
                ) : (
                  collab.userName.slice(0, 1).toUpperCase()
                )}
              </div>
            ))}
          </div>
        ) : (
          <Users className="w-3.5 h-3.5 text-studio-400" />
        )}

        <span className="text-[11px] font-mono hidden md:inline">
          {hasRemoteChanges
            ? 'Cambios remotos'
            : count > 1
            ? `${count} en vivo`
            : isConnected
            ? 'En línea'
            : 'Modo local'}
        </span>
      </button>

      {/* Collaborators Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-studio-950/95 border border-white/[0.14] shadow-2xl backdrop-blur-xl p-3.5 z-[80] animate-fade-in text-xs space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Users className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="font-bold text-white text-xs">Colaboración en Tiempo Real</h4>
                <p className="text-[10px] text-studio-400 font-mono">
                  {isConnected ? 'Supabase Realtime activo' : 'Conectando al canal...'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-studio-500 hover:text-white p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Remote change alert banner */}
          {hasRemoteChanges && (
            <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Nueva versión en la nube</span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-tight">
                Otro colaborador acaba de guardar cambios para esta ruta.
              </p>
              <button
                type="button"
                onClick={handleReloadRemote}
                disabled={isReloading}
                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3 h-3 ${isReloading ? 'animate-spin' : ''}`} />
                <span>{isReloading ? 'Cargando cambios...' : 'Actualizar mi ruta'}</span>
              </button>
            </div>
          )}

          {/* Collaborator List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-studio-400 font-mono tracking-wider block">
              En esta ruta ({count})
            </span>
            {collaborators.map(collab => (
              <div
                key={collab.clientId}
                className="flex items-center justify-between p-2 rounded-xl bg-studio-900/60 border border-studio-800/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: collab.color }}
                  >
                    {collab.avatarUrl ? (
                      <img src={collab.avatarUrl} alt={collab.userName} className="w-full h-full object-cover" />
                    ) : (
                      collab.userName.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white text-xs truncate block">
                      {collab.userName}
                    </span>
                    <span className="text-[9px] text-studio-500 font-mono block">
                      {collab.clientId.slice(0, 8)} • activo
                    </span>
                  </div>
                </div>

                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/[0.08] text-[10px] text-studio-500 flex items-center justify-between font-mono">
            <span>Canal: {projectId.slice(0, 12)}...</span>
            <span className="text-purple-400 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Presence Sync</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
