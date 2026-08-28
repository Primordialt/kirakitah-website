import { mockInitiatives } from "@/data/mocks/initiatives";
import { mockStories } from "@/data/mocks/stories";
import type { MetadataRoute } from "next";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export interface PublicSitemapEntry {
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
  lastModified: string;
}

/**
 * Stable revision dates for static public pages.
 * Update a date only when that page's published content materially changes.
 */
export const PUBLIC_STATIC_SITEMAP_ENTRIES: readonly PublicSitemapEntry[] = [
  { path: "", priority: 1, changeFrequency: "weekly", lastModified: "2026-08-01" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-01" },
  { path: "/initiatives", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-01" },
  { path: "/esports", priority: 0.9, changeFrequency: "weekly", lastModified: "2026-08-26" },
  { path: "/esports/rules", priority: 0.8, changeFrequency: "weekly", lastModified: "2026-08-26" },
  { path: "/esports/faq", priority: 0.8, changeFrequency: "weekly", lastModified: "2026-08-26" },
  { path: "/register", priority: 0.9, changeFrequency: "weekly", lastModified: "2026-08-26" },
  { path: "/login", priority: 0.5, changeFrequency: "monthly", lastModified: "2026-08-26" },
  {
    path: "/forgot-password",
    priority: 0.4,
    changeFrequency: "monthly",
    lastModified: "2026-08-20",
  },
  {
    path: "/reset-password",
    priority: 0.4,
    changeFrequency: "monthly",
    lastModified: "2026-08-20",
  },
  { path: "/community", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-01" },
  { path: "/stories", priority: 0.8, changeFrequency: "weekly", lastModified: "2026-08-22" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-01" },
  { path: "/terms", priority: 0.5, changeFrequency: "yearly", lastModified: "2026-08-01" },
  { path: "/privacy", priority: 0.5, changeFrequency: "yearly", lastModified: "2026-08-01" },
  {
    path: "/code-of-conduct",
    priority: 0.6,
    changeFrequency: "yearly",
    lastModified: "2026-08-01",
  },
] as const;

/** Routes that must never appear in the public sitemap. */
export const SITEMAP_EXCLUDED_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/dashboard",
  "/profile",
  "/tournaments",
  "/matches",
  "/notifications",
  "/account",
  "/dev",
  "/register/username",
  "/register/password",
  "/esports/register",
] as const;

const INITIATIVE_LAST_MODIFIED = "2026-08-01";

function toSitemapUrl(siteUrl: string, path: string): string {
  return path === "" ? siteUrl : `${siteUrl}${path}`;
}

function toSitemapItem(
  siteUrl: string,
  entry: PublicSitemapEntry,
): MetadataRoute.Sitemap[number] {
  return {
    url: toSitemapUrl(siteUrl, entry.path),
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  };
}

export function buildPublicSitemap(siteUrl: string): MetadataRoute.Sitemap {
  const initiativeEntries: PublicSitemapEntry[] = mockInitiatives.map(
    (initiative) => ({
      path: `/initiatives/${initiative.slug}`,
      priority: 0.7,
      changeFrequency: "monthly",
      lastModified: INITIATIVE_LAST_MODIFIED,
    }),
  );

  const storyEntries: PublicSitemapEntry[] = mockStories.map((story) => ({
    path: `/stories/${story.slug}`,
    priority: 0.7,
    changeFrequency: "monthly",
    lastModified: story.publishedAt,
  }));

  return [...PUBLIC_STATIC_SITEMAP_ENTRIES, ...initiativeEntries, ...storyEntries].map(
    (entry) => toSitemapItem(siteUrl, entry),
  );
}

export function getPublicSitemapPaths(): string[] {
  return [
    ...PUBLIC_STATIC_SITEMAP_ENTRIES.map((entry) => entry.path),
    ...mockInitiatives.map((initiative) => `/initiatives/${initiative.slug}`),
    ...mockStories.map((story) => `/stories/${story.slug}`),
  ];
}

export function isExcludedFromPublicSitemap(path: string): boolean {
  return SITEMAP_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
