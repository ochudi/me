import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { codeThemeDark, codeThemeLight } from "@/lib/code-theme";

// Shared MDX pipeline. rehype-pretty-code emits both themes as CSS variables;
// globals.css switches them on prefers-color-scheme. The themes are custom and
// monochrome so code stays within the greyscale design system and every token
// clears WCAG AA contrast (the stock coloured themes failed both).
export const mdxOptions: MDXRemoteProps["options"] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        { theme: { light: codeThemeLight, dark: codeThemeDark } },
      ],
    ],
  },
};
