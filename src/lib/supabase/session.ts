import "server-only";
import { createSupabaseServerClient } from "./server";
import { isAdminEmail } from "./env";

// The signed-in admin for the current request, or null. Combines a real
// session (verified server-side via getUser) with the email allowlist. Used
// to guard the admin layout and every admin server action.
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
