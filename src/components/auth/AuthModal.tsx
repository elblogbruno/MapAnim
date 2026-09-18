import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  LogOut,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  UploadCloud,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { syncAllLocalProjectsToCloud } from '../../core/project/cloudStorage';
import { supabase } from '../../lib/supabase';
import { BrandLogo } from '../common/BrandLogo';

export const AuthModal: React.FC = () => {
  const {
    user,
    profile,
    isLoading,
    isAuthModalOpen,
    authModalMode,
    setIsAuthModalOpen,
    signInWithPassword,
    signUp,
    signOut,
  } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup' | 'profile'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setAuthError(null);
      setAuthSuccess(null);
      setSyncMessage(null);

      if (authModalMode) {
        setMode(authModalMode);
      } else if (user) {
        setMode('profile');
      } else {
        setMode('signin');
      }
    }
  }, [isAuthModalOpen, authModalMode, user]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const res = await signInWithPassword(email, password);
        if (res.error) {
          setAuthError(res.error);
        } else {
          setAuthSuccess('¡Sesión iniciada con éxito!');
          setTimeout(() => setIsAuthModalOpen(false), 800);
        }
      } else if (mode === 'signup') {
        const res = await signUp(email, password, fullName);
        if (res.error) {
          setAuthError(res.error);
        } else {
          setAuthSuccess('¡Cuenta creada correctamente! Bienvenido a MapAnim.');
          setTimeout(() => setIsAuthModalOpen(false), 1200);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncProjects = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncAllLocalProjectsToCloud();
      setSyncMessage(`Se han sincronizado ${res.synced} proyectos en tu cuenta.`);
    } catch (err: any) {
      setSyncMessage(`No se pudo sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={() => setIsAuthModalOpen(false)}
      />

      <div className="relative w-full max-w-md bg-studio-900 border border-studio-700/80 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-studio-800 bg-gradient-to-br from-studio-850 to-studio-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>MapAnim Cloud</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-950/80 text-accent-300 border border-accent-800/60 font-mono font-bold">
                    Pro
                  </span>
                </h3>
                <p className="text-xs text-studio-400">
                  {mode === 'profile' && 'Tu cuenta y almacenamiento en la nube'}
                  {mode === 'signin' && 'Accede a todas tus rutas y videos guardados'}
                  {mode === 'signup' && 'Empieza a crear y guardar tus animaciones'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          {!user && (
            <div className="flex items-center gap-1 mt-4 p-1 bg-studio-950/80 rounded-xl border border-studio-800">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-studio-800 text-white shadow-sm border border-studio-700/70'
                    : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-studio-800 text-white shadow-sm border border-studio-700/70'
                    : 'text-studio-400 hover:text-studio-200'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Alerts */}
          {authError && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* MODE: PROFILE */}
          {mode === 'profile' && user && (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-3.5 bg-studio-950/70 rounded-xl border border-studio-800">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-inner">
                  {profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate">
                      {profile?.full_name || 'Creador de Rutas'}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono font-semibold">
                      Sincronizado
                    </span>
                  </div>
                  <p className="text-xs text-studio-400 font-mono truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Cloud Sync Status */}
              <div className="p-4 bg-studio-950/60 rounded-xl border border-studio-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-studio-200">
                    <Cloud className="w-4 h-4 text-emerald-400" />
                    <span>Respaldo en la Nube</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    Activo
                  </span>
                </div>
                <p className="text-xs text-studio-400 leading-relaxed">
                  Tus proyectos se guardan en la nube para que nunca pierdas tu trabajo y puedas acceder desde cualquier navegador.
                </p>

                <button
                  type="button"
                  onClick={handleSyncProjects}
                  disabled={isSyncing}
                  className="w-full py-2 px-3 rounded-lg bg-studio-800 hover:bg-studio-750 border border-studio-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <UploadCloud className={`w-3.5 h-3.5 text-accent-400 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar proyectos con mi cuenta'}</span>
                </button>

                {syncMessage && (
                  <p className="text-xs text-emerald-300 bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-800/50">
                    {syncMessage}
                  </p>
                )}
              </div>

              {/* Sign Out Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    setMode('signin');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 text-xs font-semibold text-rose-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE: SIGN IN / SIGN UP */}
          {(mode === 'signin' || mode === 'signup') && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-studio-300 mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-studio-500" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Martín Viajes"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-studio-950 border border-studio-800 focus:border-accent-500/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-studio-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-studio-500" />
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-800 focus:border-accent-500/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-studio-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-studio-300 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-studio-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-studio-950 border border-studio-800 focus:border-accent-500/60 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-studio-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-studio-500 hover:text-studio-300 transition-colors"
                    tabIndex={-1}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signin' && (
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email.trim()) {
                          setAuthError('Escribe tu correo arriba para recibir el enlace de recuperación.');
                          return;
                        }
                        setIsSubmitting(true);
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                            redirectTo: window.location.origin,
                          });
                          if (error) {
                            setAuthError(error.message);
                          } else {
                            setAuthSuccess('Te hemos enviado un enlace de recuperación. Revisa tu correo.');
                          }
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="text-[11px] text-studio-400 hover:text-accent-400 transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-accent-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>
                  {mode === 'signin' ? 'Iniciar Sesión' : 'Crear mi Cuenta Gratis'}
                </span>
              </button>

              <div className="pt-2 text-center">
                {mode === 'signin' ? (
                  <p className="text-xs text-studio-400">
                    ¿Aún no tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-accent-400 hover:text-accent-300 font-semibold underline"
                    >
                      Regístrate gratis
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-studio-400">
                    ¿Ya tienes una cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-accent-400 hover:text-accent-300 font-semibold underline"
                    >
                      Inicia sesión
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
