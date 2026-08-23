import { describe, expect, it } from "vitest";
import { getSocialLogoUrl, getDefaultSocialImages } from "@/lib/social-metadata";

describe("social-metadata", () => {
  it("uses the purple brand mark path for social previews", () => {
    expect(getSocialLogoUrl()).toContain("/brand/logo-mark.png");
    expect(getDefaultSocialImages()[0]).toMatchObject({
      type: "image/png",
      alt: "KIRAKITAH",
    });
  });
});
