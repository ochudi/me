import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory would
  // otherwise be inferred as the root and emit a warning on every boot.
  outputFileTracingRoot: import.meta.dirname,
  env: {
    // Evaluated once per build; the footer renders this as the deploy date.
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  },
};

export default nextConfig;
