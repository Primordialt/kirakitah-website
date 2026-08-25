import { describe, expect, it } from "vitest";
import {
  OFFICIAL_SOCIAL_ACCOUNTS,
  REQUIRED_SOCIAL_ACCOUNTS,
  REQUIRED_SOCIAL_PLATFORMS,
  officialSocialFooterLinks,
} from "@/config/social";

describe("official social configuration", () => {
  it("requires exactly X, Instagram, and TikTok for KG926", () => {
    expect(REQUIRED_SOCIAL_PLATFORMS).toEqual(["x", "instagram", "tiktok"]);
    expect(REQUIRED_SOCIAL_ACCOUNTS).toHaveLength(3);
  });

  it("uses the Product Owner official account URLs", () => {
    expect(
      REQUIRED_SOCIAL_ACCOUNTS.find((account) => account.platform === "x")?.href,
    ).toBe("https://x.com/Kirakitah");
    expect(
      REQUIRED_SOCIAL_ACCOUNTS.find((account) => account.platform === "instagram")
        ?.href,
    ).toBe("https://www.instagram.com/kirakitah");
    expect(
      REQUIRED_SOCIAL_ACCOUNTS.find((account) => account.platform === "tiktok")
        ?.href,
    ).toBe("https://www.tiktok.com/@kirakitah926");
  });

  it("does not require YouTube and does not invent a YouTube URL", () => {
    const youtube = OFFICIAL_SOCIAL_ACCOUNTS.find(
      (account) => account.platform === "youtube",
    );
    expect(youtube?.requiredForKg926).toBe(false);
    expect(youtube?.href).toBeNull();
    expect(REQUIRED_SOCIAL_PLATFORMS).not.toContain("youtube");
  });

  it("exposes only configured official URLs in footer links", () => {
    const links = officialSocialFooterLinks();
    expect(links.map((link) => link.label)).toEqual(["X", "Instagram", "TikTok"]);
    expect(links.every((link) => Boolean(link.href))).toBe(true);
  });
});
