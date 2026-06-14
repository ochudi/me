import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Cookieless anon client for PUBLIC reads. Because it never touches request
// cookies, pages that use it stay statically cacheable / ISR-friendly rather
// than being forced to dynamic rendering. Row-level security still limits it
// to published rows, so it is safe to read with the publishable key.
export function createSupabasePublicClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
