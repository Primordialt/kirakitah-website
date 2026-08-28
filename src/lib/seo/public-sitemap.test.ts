import { describe, expect, it } from "vitest";
import robots, { ROBOTS_DISALLOW_PATHS, buildRobotsConfig } from "@/app/robots";
import sitemap from "@/app/sitemap";
import { siteConfig } from "@/config/site";
import {
  SITEMAP_EXCLUDED_PATH_PREFIXES,
  buildPublicSitemap,
  getPublicSitemapPaths,
  isExcludedFromPublicSitemap,
} from "@/lib/seo/public-sitemap";

const CANONICAL_ORIGIN = "https://www.kirakitah.com";

describe("public sitemap", () => {
  it("uses the canonical production origin for every URL", () => {
    const entries = buildPublicSitemap(CANONICAL_ORIGIN);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith(`${CANONICAL_ORIGIN}/`) || entry.url === CANONICAL_ORIGIN).toBe(
        true,
      );
      expect(entry.url).not.toContain("localhost");
      expect(entry.url).not.toContain("vercel.app");
      expect(entry.url).not.toMatch(/^http:/);
    }
  });

  it("includes core public indexable pages", () => {
    const paths = getPublicSitemapPaths();
    expect(paths).toEqual(
      expect.arrayContaining([
        "",
        "/about",
        "/initiatives",
        "/esports",
        "/esports/rules",
        "/esports/faq",
        "/register",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/community",
        "/stories",
        "/contact",
        "/terms",
        "/privacy",
        "/code-of-conduct",
        "/initiatives/kirakitah-gaming",
        "/stories/kirakitah-gaming-926",
      ]),
    );
  });

  it("excludes participant, admin, API, and redirect-only routes", () => {
    const paths = getPublicSitemapPaths();
    for (const prefix of SITEMAP_EXCLUDED_PATH_PREFIXES) {
      expect(paths).not.toContain(prefix);
      expect(paths.some((path) => path.startsWith(`${prefix}/`))).toBe(false);
    }

    expect(paths).not.toContain("/tournaments");
    expect(paths).not.toContain("/esports/register");
    expect(isExcludedFromPublicSitemap("/dashboard")).toBe(true);
    expect(isExcludedFromPublicSitemap("/admin/users")).toBe(true);
    expect(isExcludedFromPublicSitemap("/api/health")).toBe(true);
  });

  it("does not contain duplicate URLs", () => {
    const entries = buildPublicSitemap(CANONICAL_ORIGIN);
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("uses stable lastModified values instead of request-time dates", () => {
    const first = buildPublicSitemap(CANONICAL_ORIGIN);
    const second = buildPublicSitemap(CANONICAL_ORIGIN);
    expect(first.map((entry) => entry.lastModified)).toEqual(
      second.map((entry) => entry.lastModified),
    );

    const storyEntry = first.find((entry) =>
      entry.url.endsWith("/stories/kirakitah-gaming-926"),
    );
    expect(storyEntry?.lastModified).toBe("2026-08-15T00:00:00.000Z");
  });

  it("exports a sitemap route", () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.url).toBe(siteConfig.url);
  });
});

describe("robots", () => {
  it("references the canonical sitemap URL", () => {
    const config = buildRobotsConfig(CANONICAL_ORIGIN);
    expect(config.sitemap).toBe(`${CANONICAL_ORIGIN}/sitemap.xml`);
  });

  it("allows public pages while restricting private areas", () => {
    const config = buildRobotsConfig(CANONICAL_ORIGIN);
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(expect.arrayContaining([...ROBOTS_DISALLOW_PATHS]));
    expect(rules?.disallow).toEqual(
      expect.arrayContaining([
        "/api/",
        "/admin/",
        "/dashboard",
        "/profile",
        "/tournaments",
      ]),
    );
  });

  it("exports a robots route", () => {
    const config = robots();
    expect(config.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });
});

describe("canonical consistency", () => {
  it("aligns sitemap paths with public canonical routes", () => {
    const paths = getPublicSitemapPaths();
    expect(paths).toContain("/esports");
    expect(paths).toContain("/register");
    expect(paths).not.toContain("/esports/register");
  });
});
