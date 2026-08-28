import { siteConfig } from "@/config/site";
import type { MetadataRoute } from "next";

/** Paths that must not be crawled or indexed as public website content. */
export const ROBOTS_DISALLOW_PATHS = [
  "/dev/",
  "/dev",
  "/admin/",
  "/admin",
  "/api/",
  "/dashboard",
  "/profile",
  "/tournaments",
  "/matches",
  "/notifications",
  "/account",
  "/register/username",
  "/register/password",
] as const;

export function buildRobotsConfig(siteUrl: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobotsConfig(siteConfig.url);
}
