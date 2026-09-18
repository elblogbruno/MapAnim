import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  ExternalLink,
  Code2,
  MessageCircle,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  generateOrGetProjectShareInfo,
  toggleProjectPublicStatus,
} from '../../core/project/cloudStorage';
import { haptics } from '../../utils/haptics';
import { nativeShare, canNativeShare } from '../../utils/nativeShare';

export const ShareModal: React.FC = () => {
  const { isShareModalOpen, setIsShareModalOpen } = useEditorStore();
  const { project } = useProjectStore();
  const { user, setIsAuthModalOpen } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isPublic, setIsPublic] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    if (isShareModalOpen) {
      setCopiedLink(false);
      setCopiedEmbed(false);
      setErrorMessage(null);

      if (user) {
        loadShareInfo();
      }
    }
  }, [isShareModalOpen, user, project.metadata.id]);

  const loadShareInfo = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await generateOrGetProjectShareInfo(project);
      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.shareUrl) {
        setShareUrl(res.shareUrl);
        setIsPublic(res.isPublic);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al generar enlace público');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!project.metadata?.id) return;
    const targetState = !isPublic;
    setIsLoading(true);
    try {
      const res = await toggleProjectPublicStatus(project.metadata.id, targetState);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setIsPublic(res.isPublic);
        if (res.shareUrl) {
          setShareUrl(res.shareUrl);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar visibilidad');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      haptics.light();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
      prompt('Copia el siguiente enlace:', shareUrl);
    }
  };

  const embedCode = `<iframe src="${shareUrl}${shareUrl.includes('?') ? '&' : '?'}embed=1" width="100%" height="600" style="border:0; border-radius: 12px; overflow:hidden;" allow="fullscreen"></iframe>`;

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      haptics.light();
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      prompt('Copia el código iframe:', embedCode);
    }
  };

  const shareText = `¡Mira este viaje cinemático que he animado en MapAnim! 🗺️✨: ${project.metadata.name}`;

  if (!isShareModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="absolute inset-0"
        onClick={() => setIsShareModalOpen(false)}
      />

      <div className="relative w-full max-w-lg bg-studio-900 border border-studio-700/80 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-studio-800 bg-gradient-to-br from-studio-850 to-studio-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Compartir Itinerario</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-950 text-accent-400 border border-accent-800/60 font-mono font-semibold">
                  1-Click Share
                </span>
              </h3>
              <p className="text-xs text-studio-400 truncate max-w-[280px]">
                {project.metadata.name || 'Ruta Cinemática'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsShareModalOpen(false)}
            className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* If NOT logged in */}
          {!user ? (
            <div className="p-5 bg-studio-950/80 rounded-2xl border border-studio-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-accent-600/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Guarda y Comparte en la Nube
                </h4>
                <p className="text-xs text-studio-400 leading-relaxed max-w-sm mx-auto">
                  Para generar un enlace público interactivo y permanente para tus amigos o clientes, inicia sesión en tu cuenta gratuita de MapAnim.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsShareModalOpen(false);
                  setIsAuthModalOpen(true, 'signin');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition-all active:scale-[0.99]"
              >
                Iniciar Sesión para Compartir
              </button>
            </div>
          ) : (
            <>
              {/* Error alert */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Public Visibility Toggle */}
              <div className="p-3.5 bg-studio-950/70 rounded-xl border border-studio-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isPublic
                        ? 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-400'
                        : 'bg-studio-850 border border-studio-750 text-studio-500'
                    }`}
                  >
                    {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {isPublic ? 'Enlace Público Activo' : 'Ruta Privada'}
                    </p>
                    <p className="text-[11px] text-studio-400">
                      {isPublic
                        ? 'Cualquier persona con el enlace puede reproducir la animación'
                        : 'Solo tú puedes ver este itinerario en tu cuenta'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  disabled={isLoading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isPublic
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/50'
                      : 'bg-studio-800 text-studio-300 border border-studio-700 hover:bg-studio-750'
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : isPublic ? (
                    'Hacer Privado'
                  ) : (
                    'Hacer Público'
                  )}
                </button>
              </div>

              {/* Share URL Box */}
              {isPublic && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-studio-300">
                    Enlace Directo
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl || 'Generando enlace...'}
                      className="flex-1 bg-studio-950 border border-studio-800 rounded-xl px-3 py-2 text-xs font-mono text-studio-200 focus:outline-none select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      disabled={!shareUrl}
                      className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    {shareUrl && (
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-studio-800 hover:bg-studio-750 border border-studio-700 text-studio-300 hover:text-white transition-colors"
                        title="Abrir en pestaña nueva"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Share buttons */}
              {isPublic && shareUrl && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-studio-400">
                    Compartir Rápido
                  </label>

                  {canNativeShare() && (
                    <button
                      type="button"
                      onClick={async () => {
                        haptics.medium();
                        await nativeShare({
                          title: project.metadata.name || 'Mi ruta de viaje',
                          text: shareText,
                          url: shareUrl,
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-600 via-rose-600 to-amber-500 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-accent-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Compartir en el Teléfono (WhatsApp, Stories...)</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        shareText + ' ' + shareUrl
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold transition-all active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        shareText
                      )}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-sky-300 text-xs font-semibold transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 fill-current text-sky-400" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span>X / Twitter</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Embed in Website / Blog */}
              {isPublic && shareUrl && (
                <div className="pt-2 border-t border-studio-800">
                  <button
                    type="button"
                    onClick={() => setShowEmbed(!showEmbed)}
                    className="flex items-center justify-between w-full text-xs text-studio-400 hover:text-studio-200 transition-colors font-medium py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-accent-400" />
                      <span>Embeber en tu web o blog (&lt;iframe&gt;)</span>
                    </span>
                    <span className="text-[11px] text-accent-400 underline">
                      {showEmbed ? 'Ocultar' : 'Ver código'}
                    </span>
                  </button>

                  {showEmbed && (
                    <div className="mt-2 space-y-2 animate-fade-in">
                      <textarea
                        readOnly
                        rows={3}
                        value={embedCode}
                        className="w-full bg-studio-950 border border-studio-800 rounded-xl p-2.5 text-[11px] font-mono text-studio-300 focus:outline-none resize-none select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyEmbed}
                        className="w-full py-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-studio-200 text-xs font-semibold border border-studio-700 flex items-center justify-center gap-1.5 transition-all"
                      >
                        {copiedEmbed ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>¡Código iframe copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-studio-400" />
                            <span>Copiar código iframe</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
