import { site, socialLinks } from "@/lib/site";

// Person schema rendered on / and /about (the pages that are about the
// person rather than a document).
export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Chukwudi Ofoma",
  url: "https://ochudi.com",
  image: "https://ochudi.com/images/chudi.jpg",
  email: `mailto:${site.email}`,
  jobTitle: "AI engineer, lecturer, researcher",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Pan-Atlantic University",
  },
  worksFor: [
    {
      "@type": "Organization",
      name: "Plural Health",
    },
    {
      "@type": "Organization",
      name: site.studio.name,
      url: site.studio.url,
      description: "Web design and development studio based in Lagos.",
    },
  ],
  sameAs: socialLinks,
};
