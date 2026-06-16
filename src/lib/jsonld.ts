import { site, socialLinks } from "@/lib/site";

// Person schema rendered on / and /about (the pages that are about the person
// rather than a document). The richer the entity, the more confidently a
// search engine treats ochudi.com as the canonical source for "Chudi Ofoma"
// and ranks it above the social profiles it links out to via sameAs.
export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${site.url}/#person`,
  name: site.name,
  alternateName: site.alternateName,
  givenName: "Chukwudi",
  familyName: "Ofoma",
  url: site.url,
  mainEntityOfPage: site.url,
  image: `${site.url}/images/chudi.jpg`,
  email: `mailto:${site.email}`,
  description:
    "AI engineer at Plural Health, lecturer in computer science at Pan-Atlantic University, and researcher in unsupervised clustering. Based in Lagos, Nigeria.",
  jobTitle: ["AI engineer", "Lecturer", "Researcher"],
  knowsAbout: [
    "Artificial intelligence",
    "Machine learning",
    "Large language models",
    "Unsupervised clustering",
    "Software engineering",
    "Computer science education",
    "Web development",
  ],
  knowsLanguage: ["English"],
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
  homeLocation: {
    "@type": "Place",
    name: "Lagos, Nigeria",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Lagos",
    addressCountry: "NG",
  },
  sameAs: socialLinks,
};

// WebSite entity for the domain, tied to the person as author and publisher.
// Helps a search engine understand the site name ("ochudi") and the person
// behind it, reinforcing the same entity the Person node describes.
export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  url: site.url,
  name: site.siteName,
  alternateName: site.name,
  inLanguage: "en",
  author: { "@id": `${site.url}/#person` },
  publisher: { "@id": `${site.url}/#person` },
};
