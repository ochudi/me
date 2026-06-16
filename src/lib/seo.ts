import type { Metadata } from "next";
import { site } from "@/lib/site";

// One source for per-page metadata. Next does NOT copy the page `title` and
// `description` into openGraph/twitter, and a child page that omits openGraph
// inherits the layout's (which describes the homepage), so shared links to any
// inner page would otherwise carry the wrong title and URL. buildMetadata sets
// title, description, canonical, openGraph, and twitter together so every
// route shares one correct shape. It deliberately does not set openGraph.images
// so the file-based opengraph-image for each route still applies.
export function buildMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
}: {
  title: string;
  description: string;
  /** Absolute path from the site root, e.g. "/work/whitesands". */
  path: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
}): Metadata {
  const url = path === "/" ? site.url : `${site.url}${path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      title,
      description,
      url,
      siteName: site.siteName,
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
