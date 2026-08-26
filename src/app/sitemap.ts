import { siteConfig } from "@/config/site";
import { mockInitiatives } from "@/data/mocks/initiatives";
import { mockStories } from "@/data/mocks/stories";
import type { MetadataRoute } from "next";

const staticPaths = [
  "",
  "/about",
  "/initiatives",
  "/esports",
  "/esports/rules",
  "/esports/faq",
  "/register",
  "/login",
  "/tournaments",
  "/community",
  "/stories",
  "/contact",
  "/terms",
  "/privacy",
  "/code-of-conduct",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const initiativePaths = mockInitiatives.map(
    (initiative) => `/initiatives/${initiative.slug}`,
  );
  const storyPaths = mockStories.map((story) => `/stories/${story.slug}`);

  return [...staticPaths, ...initiativePaths, ...storyPaths].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified,
    changeFrequency: path === "" || path.startsWith("/esports") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/esports") ? 0.9 : 0.7,
  }));
}
