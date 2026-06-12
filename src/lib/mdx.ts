import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

// Shared MDX pipeline. rehype-pretty-code emits both themes as CSS
// variables; globals.css switches them on prefers-color-scheme.
export const mdxOptions: MDXRemoteProps["options"] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [rehypePrettyCode, { theme: { light: "min-light", dark: "min-dark" } }],
    ],
  },
};
