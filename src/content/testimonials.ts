// Source of truth + fallback for testimonials. The data lives in
// testimonials.json so the plain-node seed script can read the same file.
// The DB table ochudi_testimonials (after migration 0002 + seeding) takes
// precedence and is editable in /admin.
//
// The Whitesands quote is verbatim from the client. The Iphe and NeoScribe
// lines are drafted from feedback notes; refine the wording in /admin.
import data from "./testimonials.json";

export type Testimonial = {
  slug: string;
  quote: string;
  author: string;
  role?: string;
  company?: string;
  url?: string;
};

export const testimonials: Testimonial[] = (data as Testimonial[])
  .slice()
  .sort(
    (a, b) =>
      ((a as { sort_order?: number }).sort_order ?? 0) -
      ((b as { sort_order?: number }).sort_order ?? 0),
  );
