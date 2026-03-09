import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'Supabase URL or Anon Key is missing. If this is a Vercel deployment, ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are added to your environment variables.';
    console.error(errorMsg);
    // In many cases, we want to throw to fail fast if the core dependency is missing
    // especially since the error reported by the user came from within supabase-js
    throw new Error(errorMsg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
