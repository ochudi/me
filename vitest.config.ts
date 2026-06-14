import path from "node:path";
import { defineConfig } from "vitest/config";

// Mirror the "@/*" -> "src/*" path alias from tsconfig so unit tests can
// import modules the same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
