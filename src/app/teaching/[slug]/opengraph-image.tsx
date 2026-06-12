import { getBySlug } from "@/lib/content";
import { courseCode } from "@/content/teaching-calendar";
import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Lesson notes on ochudi.com";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getBySlug("teaching", slug);
  return ogImage({
    title: entry?.frontmatter.title ?? "Teaching",
    eyebrow: entry
      ? `${courseCode} / Week ${String(entry.frontmatter.week).padStart(2, "0")}`
      : courseCode,
  });
}
