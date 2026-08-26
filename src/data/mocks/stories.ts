import type { Story } from "@/domain/story";

export const mockStories: Story[] = [
  {
    id: "story-001",
    slug: "introducing-kirakitah",
    title: "Introducing KIRAKITAH",
    excerpt: "Why KIRAKITAH exists and what we're building.",
    content: `KIRAKITAH is a growing platform built around competition, creativity, technology, community and experiences that bring people together.

The world is full of people with different interests, different talents and different ways of expressing themselves. KIRAKITAH exists to create spaces where people can pursue those interests, challenge themselves, connect with others and turn ideas into experiences.

We are not building a platform that asks people to fit into one category. Instead, KIRAKITAH creates room for competition, creativity, technology, community and whatever comes next.

Today, KIRAKITAH Gaming is our most developed initiative — but it is one part of a broader ecosystem designed to grow over time.`,
    publishedAt: "2026-08-01T00:00:00.000Z",
    category: "Platform",
    featured: true,
    cta: { label: "Explore KIRAKITAH", href: "/about" },
  },
  {
    id: "story-002",
    slug: "kirakitah-gaming-926",
    title: "KIRAKITAH GAMING 926",
    excerpt: "The first major KIRAKITAH competition begins September 14, 2026.",
    content: `The first major KIRAKITAH competition is taking shape.

The inaugural KIRAKITAH Gaming championship brings players together for an online eFootball Mobile competition beginning September 14, 2026.

128 players. 32 qualifiers. 1 champion. US$100 grand prize.

KIRAKITAH GAMING 926 is an online 1v1 eFootball Mobile championship open to players aged 10 and above. Registration is now open — submit your application and KIRAKITAH will review your information before competition stages begin.

This is the first edition of KIRAKITAH Gaming, and the beginning of competitive experiences on the platform.`,
    publishedAt: "2026-08-15T00:00:00.000Z",
    category: "Tournament",
    featured: true,
    cta: { label: "Explore the Competition", href: "/esports" },
  },
  {
    id: "story-003",
    slug: "why-competitive-gaming-matters",
    title: "Why Competitive Gaming Matters",
    excerpt:
      "Gaming is more than entertainment. For many people, it is competition, skill, community and a genuine passion worth taking seriously.",
    content: `Gaming is more than entertainment.

For many people, it is competition, skill, community and a genuine passion worth taking seriously. Competitive gaming brings together players who want to test themselves, improve and be recognised for what they can do.

KIRAKITAH Gaming exists to give players an opportunity to compete in organised online experiences — starting with KIRAKITAH GAMING 926, an eFootball Mobile championship designed for players who want to take their game to the next level.

Whether you are playing for the experience, the recognition or the prize, competitive gaming is a legitimate arena for skill, dedication and community.`,
    publishedAt: "2026-08-20T00:00:00.000Z",
    category: "Gaming",
    featured: false,
    cta: { label: "Register Now", href: "/register" },
  },
  {
    id: "story-004",
    slug: "building-whats-next",
    title: "Building What's Next",
    excerpt:
      "KIRAKITAH is expanding beyond gaming, with new ideas and experiences being developed across technology, creativity, community and culture.",
    content: `KIRAKITAH is expanding beyond gaming.

While KIRAKITAH Gaming is the first major public-facing programme, the platform is being developed across multiple areas — innovation, creativity, community and experiences.

Some initiatives are actively operating. Others are in development. Each one is designed to create room for people to participate, connect and contribute.

The KIRAKITAH ecosystem is built to grow. New ideas, experiences and communities will take shape as the platform evolves.`,
    publishedAt: "2026-08-22T00:00:00.000Z",
    category: "Platform",
    featured: true,
    cta: { label: "Explore Initiatives", href: "/initiatives" },
  },
];
