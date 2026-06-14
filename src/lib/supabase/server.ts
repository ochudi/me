import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Server-side Supabase client bound to the request cookies, so it reads the
// signed-in admin's session. Used by server components and server actions.
// next/headers cookies() is async in Next 15, hence the awaited helper.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll throws when called from a Server Component (read-only
          // cookies); middleware refreshes the session, so this is safe to
          // ignore here.
        }
      },
    },
  });
}
