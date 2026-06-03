import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in."
  );
}

// Use `||` (not `??`) so an empty-string env var (e.g. an unset GitHub secret
// expands to "") also falls back to a dummy client instead of throwing
// "supabaseUrl is required". When keys are missing the app runs in demo mode.
export const supabase = createClient(url || "http://localhost", anonKey || "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const hasSupabaseConfig = Boolean(url && anonKey);
