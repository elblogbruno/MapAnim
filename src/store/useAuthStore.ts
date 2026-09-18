import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'profile';

  // Actions
  initialize: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
  setIsAuthModalOpen: (open: boolean, mode?: 'signin' | 'signup' | 'profile') => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthModalOpen: false,
  authModalMode: 'signin',

  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: false, user: null, session: null, profile: null });
      return;
    }

    try {
      set({ isLoading: true });
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('Supabase getSession:', error.message);
        set({ user: null, session: null, profile: null, isLoading: false });
        return;
      }

      if (session?.user) {
        set({ user: session.user, session });
        await get().fetchProfile(session.user.id);
      } else {
        set({ user: null, session: null, profile: null });
      }

      // Listen to auth state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          set({ user: newSession.user, session: newSession });
          await get().fetchProfile(newSession.user.id);
        } else {
          set({ user: null, session: null, profile: null });
        }
      });
    } catch (err) {
      console.error('Failed to initialize Supabase auth:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch profile:', error.message);
        return;
      }

      if (data) {
        set({ profile: data as UserProfile });
      }
    } catch (err) {
      console.warn('Error fetching profile:', err);
    }
  },

  signInWithPassword: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let friendly = error.message;
        if (error.message.includes('Invalid login credentials')) {
          friendly = 'Correo o contraseña incorrectos. Si no tienes una cuenta registrada, haz clic en «Crear Cuenta».';
        } else if (error.message.includes('Email not confirmed')) {
          friendly = 'Tu correo electrónico aún no ha sido verificado. Revisa tu bandeja de entrada o spam.';
        }
        return { error: friendly };
      }

      set({ user: data.user, session: data.session });
      if (data.user) {
        await get().fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error al iniciar sesión' };
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    try {
      set({ isLoading: true });
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName?.trim() || '',
          },
        },
      });

      if (error) {
        let friendly = error.message;
        if (error.message.includes('User already registered')) {
          friendly = 'Este correo ya tiene una cuenta. Haz clic en «Iniciar Sesión».';
        } else if (error.message.includes('Password should be at least')) {
          friendly = 'La contraseña debe tener al menos 6 caracteres.';
        }
        return { error: friendly };
      }

      if (data.user) {
        set({ user: data.user, session: data.session });
        await get().fetchProfile(data.user.id);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error al registrarse' };
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithOAuth: async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error al conectar proveedor' };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null });
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const user = get().user;
    if (!user) return { error: 'No autenticado' };

    try {
      set({ isLoading: true });
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      set(state => ({
        profile: state.profile ? { ...state.profile, ...updates } : null,
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Error al actualizar perfil' };
    } finally {
      set({ isLoading: false });
    }
  },

  setIsAuthModalOpen: (open: boolean, mode = 'signin') => {
    set({ isAuthModalOpen: open, authModalMode: mode });
  },
}));
