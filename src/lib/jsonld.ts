// Person schema rendered on / and /about (the pages that are about the
// person rather than a document).
export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Chukwudi Ofoma",
  url: "https://ochudi.com",
  image: "https://ochudi.com/images/chudi.jpg",
  email: "mailto:ofoma.chudi@gmail.com",
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
      name: "Greyform",
      url: "https://www.greyform.org",
      description: "Web design and development studio based in Lagos.",
    },
  ],
  sameAs: [
    "https://github.com/ochudi",
    "https://www.linkedin.com/in/ochudi",
    "https://x.com/ochudi",
  ],
};
