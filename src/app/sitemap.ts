import { siteConfig } from "@/config/site";
import { mockInitiatives } from "@/data/mocks/initiatives";
import type { MetadataRoute } from "next";

const staticPaths = [
  "",
  "/about",
  "/initiatives",
  "/esports",
  "/esports/rules",
  "/esports/faq",
  "/esports/register",
  "/community",
  "/stories",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const initiativePaths = mockInitiatives.map(
    (initiative) => `/initiatives/${initiative.slug}`,
  );

  return [...staticPaths, ...initiativePaths].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified,
    changeFrequency: path === "" || path.startsWith("/esports") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/esports") ? 0.9 : 0.7,
  }));
}
