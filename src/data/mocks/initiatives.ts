import type { Initiative } from "@/domain/initiative";

const placeholderImage = (alt: string) => ({
  src: "",
  alt,
});

export const mockInitiatives: Initiative[] = [
  {
    id: "init-gaming",
    slug: "kirakitah-gaming",
    name: "KIRAKITAH Gaming",
    tagline: "Competitive gaming experiences, tournaments and challenges.",
    description:
      "KIRAKITAH Gaming is the competitive side of the KIRAKITAH ecosystem, bringing players together through organised gaming experiences, tournaments and challenges.",
    body: [
      "The inaugural KIRAKITAH Gaming competition is an eFootball Mobile championship designed to give players an opportunity to compete, be recognised and experience organised online competition.",
    ],
    status: "active",
    category: "competition",
    featured: true,
    featuredImage: placeholderImage("KIRAKITAH Gaming"),
    cta: {
      label: "Explore KIRAKITAH Gaming",
      href: "/esports",
    },
    sortOrder: 1,
  },
  {
    id: "init-innovation",
    slug: "innovation",
    name: "Innovation",
    tagline: "Technology-driven ideas, digital products and experiments.",
    description:
      "KIRAKITAH Innovation explores what happens when ideas meet technology. This area will focus on digital products, technology-driven experiments, problem solving and new ways of using technology to create useful experiences.",
    body: [
      "It is being developed with a simple approach: Build. Test. Learn. Improve.",
    ],
    status: "in-development",
    category: "technology",
    featuredImage: placeholderImage("Innovation initiative"),
    sortOrder: 2,
  },
  {
    id: "init-creativity",
    slug: "creativity",
    name: "Creativity",
    tagline: "Content, design, storytelling and creative expression.",
    description:
      "Creativity is one of the ways people make ideas visible. KIRAKITAH Creativity will provide space for storytelling, content, design, collaboration and other forms of creative expression.",
    body: [
      "From individual creators to collaborative projects, this part of the ecosystem will explore what people can build when imagination meets opportunity.",
    ],
    status: "in-development",
    category: "creativity",
    featuredImage: placeholderImage("Creativity initiative"),
    sortOrder: 3,
  },
  {
    id: "init-community",
    slug: "community",
    name: "Community",
    tagline: "People, connection, participation and shared interests.",
    description:
      "KIRAKITAH is ultimately about people. The KIRAKITAH community is being developed as a place where people can discover shared interests, meet others, participate in experiences and contribute to what KIRAKITAH becomes.",
    body: [
      "Players. Creators. Builders. Competitors. Collaborators. Curious minds.",
      "As new initiatives launch, the community will grow around them.",
    ],
    status: "in-development",
    category: "community",
    featuredImage: placeholderImage("Community initiative"),
    cta: {
      label: "Explore Community",
      href: "/community",
    },
    sortOrder: 4,
  },
  {
    id: "init-experiences",
    slug: "experiences",
    name: "Experiences",
    tagline: "New events, challenges and experiences built around participation.",
    description:
      "KIRAKITAH Experiences will bring together challenges, events and platform-wide participation opportunities as the ecosystem grows.",
    status: "coming-next",
    category: "experiences",
    featuredImage: placeholderImage("Experiences initiative"),
    sortOrder: 5,
  },
];
