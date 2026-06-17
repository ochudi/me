// Monochrome syntax themes. The site is greyscale only (no accent colour
// ever), so code uses shades of grey rather than the usual coloured token
// themes. Every shade clears WCAG AA contrast on its background: comments are
// the lightest grey that still passes (4.5:1), strings/values sit mid-grey,
// and everything else is the full ink/page foreground. rehype-pretty-code
// takes these TextMate theme objects directly and emits both as CSS variables.

const COMMENT_SCOPES = ["comment", "punctuation.definition.comment"];
const MUTED_SCOPES = [
  "string",
  "constant.numeric",
  "constant.language",
  "punctuation",
  "meta.brace",
];

export const codeThemeLight = {
  name: "ochudi-grey-light",
  type: "light" as const,
  colors: { "editor.background": "#FAFAFA", "editor.foreground": "#0A0A0A" },
  settings: [
    { settings: { foreground: "#0A0A0A", background: "#FAFAFA" } },
    { scope: COMMENT_SCOPES, settings: { foreground: "#6B6B6B", fontStyle: "italic" } },
    { scope: MUTED_SCOPES, settings: { foreground: "#454545" } },
  ],
};

export const codeThemeDark = {
  name: "ochudi-grey-dark",
  type: "dark" as const,
  colors: { "editor.background": "#1F1F1F", "editor.foreground": "#FAFAFA" },
  settings: [
    { settings: { foreground: "#FAFAFA", background: "#1F1F1F" } },
    { scope: COMMENT_SCOPES, settings: { foreground: "#9A9A9A", fontStyle: "italic" } },
    { scope: MUTED_SCOPES, settings: { foreground: "#C8C8C8" } },
  ],
};
