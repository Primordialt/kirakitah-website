import type { Story } from "@/domain/story";

export const mockStories: Story[] = [
  {
    id: "story-001",
    slug: "meet-kirakitah",
    title: "Meet KIRAKITAH",
    excerpt:
      "Introducing a platform built for competition, creativity, technology, and community.",
    content: "Placeholder story content.",
    publishedAt: "2026-02-01T00:00:00.000Z",
    category: "Announcement",
    featured: true,
  },
  {
    id: "story-002",
    slug: "gaming-2026-registration",
    title: "KIRAKITAH Gaming 2026 Registration Is Coming",
    excerpt:
      "The inaugural eFootball Mobile tournament opens soon. Stay tuned for registration details.",
    content: "Placeholder story content.",
    publishedAt: "2026-02-15T00:00:00.000Z",
    category: "Tournament",
    featured: true,
  },
  {
    id: "story-003",
    slug: "what-we-are-building-next",
    title: "What We're Building Next",
    excerpt:
      "From gaming to experiences — a look at the initiatives shaping the KIRAKITAH platform.",
    content: "Placeholder story content.",
    publishedAt: "2026-03-01T00:00:00.000Z",
    category: "Platform",
    featured: false,
  },
];
