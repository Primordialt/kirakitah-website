import { describe, expect, it } from "vitest";
import {
  KIRAKITAH_YOUTUBE_CHANNEL_URL,
  OFFICIAL_SOCIAL_ACCOUNTS,
  REQUIRED_FOLLOW_ACCOUNTS,
  REQUIRED_SOCIAL_ACCOUNTS,
  REQUIRED_SOCIAL_PLATFORMS,
  REQUIRED_SUBSCRIPTION_ACCOUNTS,
} from "@/config/social";

describe("KG926 social configuration", () => {
  it("requires X, Instagram, TikTok, and YouTube for KG926", () => {
    expect(REQUIRED_SOCIAL_PLATFORMS).toEqual([
      "x",
      "instagram",
      "tiktok",
      "youtube",
    ]);
    expect(REQUIRED_SOCIAL_ACCOUNTS).toHaveLength(4);
  });

  it("keeps existing follow platform URLs unchanged", () => {
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

  it("uses the official KIRAKITAH YouTube channel URL", () => {
    const youtube = OFFICIAL_SOCIAL_ACCOUNTS.find(
      (account) => account.platform === "youtube",
    );
    expect(youtube?.requiredForKg926).toBe(true);
    expect(youtube?.href).toBe(KIRAKITAH_YOUTUBE_CHANNEL_URL);
    expect(youtube?.requirementKind).toBe("subscription");
  });

  it("separates follow handles from YouTube subscription", () => {
    expect(REQUIRED_FOLLOW_ACCOUNTS.map((account) => account.platform)).toEqual([
      "x",
      "instagram",
      "tiktok",
    ]);
    expect(REQUIRED_SUBSCRIPTION_ACCOUNTS.map((account) => account.platform)).toEqual(
      ["youtube"],
    );
  });
});
