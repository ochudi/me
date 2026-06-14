import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory would
  // otherwise be inferred as the root and emit a warning on every boot.
  outputFileTracingRoot: import.meta.dirname,
  env: {
    // Evaluated once per build; the footer renders this as the deploy date.
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
  images: {
    // Cover images uploaded through the admin live in Supabase Storage.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
  async headers() {
    // Baseline security headers on every response. A strict CSP is left out
    // on purpose: the site uses inline JSON-LD and a pre-hydration script, so
    // a real CSP needs nonces (a separate hardening pass). These headers are
    // safe and add no breakage.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
