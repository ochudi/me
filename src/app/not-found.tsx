import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404",
  description: "No such page.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 text-center">
      <p className="font-mono text-label uppercase text-muted">404</p>
      <h1 className="mt-4 font-serif text-h1">No such page.</h1>
      <p className="mt-5 max-w-prose text-body text-muted">
        The page moved, or it never existed. The command palette knows
        everything that does: press Cmd K.
      </p>
      <Link
        href="/"
        className="mt-10 border border-rule px-5 py-3 font-mono text-label uppercase text-ink transition-colors duration-200 hover:border-ink"
      >
        Back home
      </Link>
    </main>
  );
}
