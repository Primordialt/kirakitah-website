export const communityPageContent = {
  hero: {
    eyebrow: "KIRAKITAH",
    headline: "THE KIRAKITAH COMMUNITY",
    supportingCopy:
      "KIRAKITAH is built around people. We are creating spaces where people with different interests, skills and ambitions can discover one another, participate in experiences and become part of something bigger.",
  },
  features: {
    heading: "WHAT YOU'LL FIND HERE",
    items: [
      {
        title: "COMPETITION",
        description: "Take part in challenges and tournaments.",
      },
      {
        title: "CREATIVITY",
        description: "Share and discover creative work.",
      },
      {
        title: "CONNECTION",
        description: "Meet people with shared interests.",
      },
      {
        title: "OPPORTUNITY",
        description: "Discover ways to participate and contribute.",
      },
      {
        title: "EXPERIENCE",
        description: "Be part of what KIRAKITAH is building.",
      },
    ],
  },
  status: {
    heading: "COMMUNITY PLATFORM",
    copy: "The dedicated KIRAKITAH community platform is in development. As new initiatives launch, the community will grow around them — starting with KIRAKITAH Gaming and expanding across the ecosystem.",
  },
  cta: {
    label: "STAY CONNECTED",
    href: "/contact",
  },
} as const;

export const storiesPageContent = {
  hero: {
    eyebrow: "KIRAKITAH",
    headline: "STORIES FROM KIRAKITAH",
    supportingCopy:
      "Every competition has a story. Every creator has an idea. Every community has people worth knowing. The KIRAKITAH Stories platform documents the people, ideas, moments and experiences shaping the ecosystem.",
    detail:
      "From tournament highlights and player journeys to creative projects and the ideas behind new initiatives, this is where the KIRAKITAH story unfolds.",
  },
} as const;

export const contactPageContent = {
  hero: {
    eyebrow: "KIRAKITAH",
    headline: "LET'S CONNECT",
    supportingCopy:
      "Have a question about KIRAKITAH? Interested in a partnership, collaboration or future initiative? Need help with a KIRAKITAH competition? We'd like to hear from you.",
  },
  subjects: [
    { value: "general", label: "General Enquiry" },
    { value: "gaming", label: "Gaming & eSports" },
    { value: "partnership", label: "Partnership" },
    { value: "collaboration", label: "Collaboration" },
    { value: "media", label: "Media" },
    { value: "community", label: "Community" },
    { value: "other", label: "Other" },
  ],
} as const;
