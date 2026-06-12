import { getBySlug } from "@/lib/content";
import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Essay on ochudi.com";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getBySlug("writing", slug);
  return ogImage({
    title: entry?.frontmatter.title ?? "Writing",
    eyebrow: entry ? `Writing / ${entry.frontmatter.date}` : "Writing",
  });
}
