import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        page: "#FAFAFA",
        "page-dark": "#1F1F1F",
        muted: "#6B6B6B",
        rule: "#E5E5E5",
        "rule-dark": "#2A2A2A",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["clamp(3.5rem, 9vw, 7.5rem)", { lineHeight: "1", letterSpacing: "-0.02em" }],
        h1: ["clamp(2.5rem, 5vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        h2: ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        h3: ["1.25rem", { lineHeight: "1.3" }],
        body: ["17px", { lineHeight: "1.7" }],
        label: ["13px", { lineHeight: "1.2", letterSpacing: "0.04em" }],
      },
      maxWidth: {
        prose: "65ch",
      },
    },
  },
  plugins: [],
};

export default config;
