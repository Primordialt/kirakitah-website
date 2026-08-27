import { afterEach, describe, expect, it, vi } from "vitest";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("prefers NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://preview.example.com/");
    vi.stubEnv("VERCEL_URL", "preview.vercel.app");
    const { getSiteUrl } = await import("./site-url");
    expect(getSiteUrl()).toBe("https://preview.example.com");
  });

  it("normalizes bare production domain to www canonical", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://kirakitah.com");
    const { getSiteUrl } = await import("./site-url");
    expect(getSiteUrl()).toBe("https://www.kirakitah.com");
  });

  it("uses production canonical when env is unset on production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { getSiteUrl } = await import("./site-url");
    expect(getSiteUrl()).toBe("https://www.kirakitah.com");
  });

  it("falls back to VERCEL_URL when site URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "kirakitah-website.vercel.app");
    const { getSiteUrl } = await import("./site-url");
    expect(getSiteUrl()).toBe("https://kirakitah-website.vercel.app");
  });

  it("defaults to localhost in local development", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    const { getSiteUrl } = await import("./site-url");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
