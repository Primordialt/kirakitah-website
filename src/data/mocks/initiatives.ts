import type { Initiative } from "@/domain/initiative";

export const mockInitiatives: Initiative[] = [
  {
    id: "init-gaming",
    slug: "gaming",
    name: "KIRAKITAH Gaming",
    tagline: "Competition at the intersection of culture and technology.",
    description:
      "The gaming initiative of KIRAKITAH, launching with eFootball Mobile competitions.",
    status: "active",
    category: "competition",
    featuredImage: {
      src: "/images/placeholders/initiative-gaming.jpg",
      alt: "KIRAKITAH Gaming",
    },
    cta: {
      label: "Explore Gaming",
      href: "/esports",
    },
    sortOrder: 1,
  },
];
