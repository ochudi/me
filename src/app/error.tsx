"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 text-center">
      <p className="font-mono text-label uppercase text-muted">Error</p>
      <h1 className="mt-4 font-serif text-h1">Something broke.</h1>
      <p className="mt-5 max-w-prose text-body text-muted">
        Not your fault. Try again, or head home and pretend this never
        happened.
      </p>
      <div className="mt-10 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="border border-rule px-5 py-3 font-mono text-label uppercase text-ink transition-colors duration-200 hover:border-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-rule px-5 py-3 font-mono text-label uppercase text-ink transition-colors duration-200 hover:border-ink"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
