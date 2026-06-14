"use client";

import { useEffect } from "react";

// Last-resort boundary: this replaces the root layout, so it renders its own
// <html>/<body> and cannot rely on the webfonts or Tailwind layer that the
// layout wires up. Everything here is inline and self-contained with the
// design tokens hard-coded, so it renders even when the rest of the app and
// its CSS have failed to load.
const INK = "#0A0A0A";
const PAGE = "#FAFAFA";
const RULE_DARK = "#2A2A2A";
const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "0 1.5rem",
          textAlign: "center",
          background: INK,
          color: PAGE,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: MONO,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "rgba(250,250,250,0.6)",
          }}
        >
          Error
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: SERIF,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
          }}
        >
          Something broke.
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: "40ch",
            fontSize: 17,
            lineHeight: 1.7,
            color: "rgba(250,250,250,0.7)",
          }}
        >
          The page failed to load. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem 1.25rem",
            background: "transparent",
            color: PAGE,
            border: `1px solid ${RULE_DARK}`,
            fontFamily: MONO,
            fontSize: 13,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p
            style={{
              margin: 0,
              fontFamily: MONO,
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "rgba(250,250,250,0.4)",
            }}
          >
            Reference {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
