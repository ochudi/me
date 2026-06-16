import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

// Shared MDX pipeline. rehype-pretty-code emits both themes as CSS
// variables; globals.css switches them on prefers-color-scheme.
// github-light/github-dark (not min-light) so syntax tokens clear WCAG AA
// contrast: min-light renders punctuation near #c2c3c5 (1.76:1 on white).
export const mdxOptions: MDXRemoteProps["options"] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        { theme: { light: "github-light", dark: "github-dark" } },
      ],
    ],
  },
};
