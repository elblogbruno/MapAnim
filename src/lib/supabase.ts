import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wbdrnqilmqpokmhebvms.supabase.co';

const supabasePublicKey: string =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  '';

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublicKey && supabasePublicKey.trim().length > 10);
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabasePublicKey || 'placeholder-anon-key-unconfigured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
