import { getBySlug } from "@/lib/content";
import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Case study on ochudi.com";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getBySlug("work", slug);
  return ogImage({
    title: entry?.frontmatter.title ?? "Work",
    eyebrow: entry
      ? `Case study / ${entry.frontmatter.client} / ${entry.frontmatter.year}`
      : "Work",
  });
}
