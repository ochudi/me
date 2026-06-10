import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory would
  // otherwise be inferred as the root and emit a warning on every boot.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
