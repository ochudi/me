// Single source of truth for whether Supabase is wired up. Every client
// helper checks this first, so the whole app degrades gracefully (the read
// path falls back to the bundled MDX files) when the env is absent — which
// is what keeps local builds and CI green without any secrets.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Emails allowed into /admin, from the ADMIN_EMAILS env (comma-separated). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

// Table names are prefixed so this database can be shared across projects
// without collisions, per the single-DB setup.
export const TABLE = {
  work: "ochudi_work",
  writing: "ochudi_writing",
  teaching: "ochudi_teaching",
  now: "ochudi_now",
  settings: "ochudi_settings",
} as const;

export const MEDIA_BUCKET = "ochudi-media";
