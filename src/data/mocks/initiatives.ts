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
    tagline: "Competitive gaming experiences and tournaments.",
    description:
      "The gaming initiative of KIRAKITAH — competitive mobile football and eSports experiences at the intersection of culture and technology.",
    status: "active",
    category: "competition",
    featured: true,
    featuredImage: placeholderImage("KIRAKITAH Gaming"),
    cta: {
      label: "Explore Initiative",
      href: "/initiatives/kirakitah-gaming",
    },
    sortOrder: 1,
  },
  {
    id: "init-innovation",
    slug: "innovation",
    name: "Innovation",
    tagline: "Technology-driven ideas and experiments.",
    description:
      "A future KIRAKITAH initiative focused on technology, experimentation and digital innovation.",
    status: "coming-soon",
    category: "technology",
    featuredImage: placeholderImage("Innovation initiative"),
    sortOrder: 2,
  },
  {
    id: "init-creativity",
    slug: "creativity",
    name: "Creativity",
    tagline: "Creative projects, content and experiences.",
    description:
      "A future KIRAKITAH initiative for creative expression, storytelling and collaborative projects.",
    status: "coming-soon",
    category: "creativity",
    featuredImage: placeholderImage("Creativity initiative"),
    sortOrder: 3,
  },
  {
    id: "init-community",
    slug: "community",
    name: "Community",
    tagline: "Connecting people around shared interests.",
    description:
      "A future KIRAKITAH initiative for building community, collaboration and shared opportunities.",
    status: "coming-soon",
    category: "community",
    featuredImage: placeholderImage("Community initiative"),
    sortOrder: 4,
  },
  {
    id: "init-experiences",
    slug: "experiences",
    name: "Experiences",
    tagline: "Challenges, events and future initiatives.",
    description:
      "A future KIRAKITAH initiative for live experiences, challenges and platform-wide events.",
    status: "coming-soon",
    category: "experiences",
    featuredImage: placeholderImage("Experiences initiative"),
    sortOrder: 5,
  },
];
