import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Create a singleton Supabase client. If env is missing, export a dummy that throws on use.
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    // Return nullish to allow app to run without Supabase in dev or local previews
    return null as unknown as ReturnType<typeof createClient>;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
})();


