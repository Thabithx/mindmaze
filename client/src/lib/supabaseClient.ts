import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True when Supabase credentials are configured.
 * When false the app runs in local-only (offline) mode using localStorage.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      // Persist the session in localStorage so students stay logged in across visits.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else if (import.meta.env.DEV) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Running in local-only mode.'
  );
}

/**
 * Supabase client. Null when credentials are missing (local-only mode).
 * Always guard usage with `isSupabaseConfigured` / null check.
 */
export const supabase = client;
