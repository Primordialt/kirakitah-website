import { getSiteUrl } from "@/lib/site-url";
import { describe, expect, it, vi } from "vitest";

describe("getSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://kirakitah.com/");
    vi.stubEnv("VERCEL_URL", "preview.vercel.app");
    expect(getSiteUrl()).toBe("https://kirakitah.com");
    vi.unstubAllEnvs();
  });

  it("falls back to VERCEL_URL when site URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "kirakitah-website.vercel.app");
    expect(getSiteUrl()).toBe("https://kirakitah-website.vercel.app");
    vi.unstubAllEnvs();
  });

  it("defaults to localhost in local development", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getSiteUrl()).toBe("http://localhost:3000");
    vi.unstubAllEnvs();
  });
});
