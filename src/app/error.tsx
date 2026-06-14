"use client";

import { useEffect } from "react";
import Link from "next/link";
import ErrorScreen from "@/components/ErrorScreen";

const ghostLinkDark =
  "border border-rule-dark px-5 py-3 font-mono text-label uppercase text-page transition-colors duration-200 hover:border-page/70 focus-visible:outline-page";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the digest in the console so a production crash is traceable
  // from the report id without exposing the stack to the visitor.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen code="Error" title="Something broke.">
      <p
        className="hero-rise mt-6 max-w-prose text-body text-page/70"
        style={{ animationDelay: "200ms" }}
      >
        Not your fault. Try again, or head home and pretend this never
        happened.
      </p>
      <div
        className="hero-rise mt-10 flex flex-wrap justify-center gap-4"
        style={{ animationDelay: "280ms" }}
      >
        <button type="button" onClick={reset} className={ghostLinkDark}>
          Try again
        </button>
        <Link href="/" className={ghostLinkDark}>
          Back home
        </Link>
      </div>
      {error.digest && (
        <p
          className="hero-rise mt-8 font-mono text-label uppercase text-page/40"
          style={{ animationDelay: "360ms" }}
        >
          Reference {error.digest}
        </p>
      )}
    </ErrorScreen>
  );
}
