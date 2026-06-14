"use client";

// Admin-only error boundary. Save actions throw a plain Error with a useful
// message (duplicate slug, failed upload, etc.); show it instead of a crash.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <p className="font-mono text-label uppercase text-muted">
        Something went wrong
      </p>
      <h1 className="mt-3 font-serif text-h2">That did not save.</h1>
      <p className="mt-5 break-words text-body text-ink">{error.message}</p>
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="border border-ink bg-ink px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:bg-page hover:text-ink focus-visible:outline-ink"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
