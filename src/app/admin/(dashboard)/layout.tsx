import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminUser } from "@/lib/supabase/session";
import { supabaseConfigured } from "@/lib/supabase/env";
import { signOut } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const navLink =
  "font-mono text-label uppercase text-muted transition-colors duration-200 hover:text-ink focus-visible:outline-ink";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!supabaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-32">
        <h1 className="font-serif text-h2">Admin is not configured.</h1>
        <p className="mt-4 text-body text-muted">
          Add your Supabase keys to <code>.env.local</code> and run the
          migration in <code>supabase/migrations</code>, then reload.
        </p>
      </main>
    );
  }

  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <Link href="/admin" className="font-serif text-h3">
            Admin
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/admin/work" className={navLink}>
              Work
            </Link>
            <Link href="/admin/writing" className={navLink}>
              Writing
            </Link>
            <Link href="/admin/teaching" className={navLink}>
              Teaching
            </Link>
            <Link href="/admin/now" className={navLink}>
              Now
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-5">
            <Link href="/" className={navLink}>
              View site
            </Link>
            <form action={signOut}>
              <button type="submit" className={navLink}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  );
}
