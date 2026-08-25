import { describe, expect, it } from "vitest";
import { deriveApplicationSocialFollowStatus } from "@/server/registration/social-follow";
import { roleHasPermission } from "@/server/admin/authorization/permissions";

describe("social follow status derivation", () => {
  it("is pending when platforms are incomplete", () => {
    expect(deriveApplicationSocialFollowStatus(["verified", "verified"], 3)).toBe(
      "pending_review",
    );
  });

  it("is pending when any required platform is pending", () => {
    expect(
      deriveApplicationSocialFollowStatus(["verified", "pending", "verified"], 3),
    ).toBe("pending_review");
  });

  it("is rejected when any required platform is rejected", () => {
    expect(
      deriveApplicationSocialFollowStatus(["verified", "rejected", "verified"], 3),
    ).toBe("rejected");
  });

  it("is verified when all three required platforms are verified", () => {
    expect(
      deriveApplicationSocialFollowStatus(["verified", "verified", "verified"], 3),
    ).toBe("verified");
  });
});

describe("social:review permission", () => {
  it("allows SUPER_ADMIN, TOURNAMENT_ADMIN, and REVIEWER", () => {
    expect(roleHasPermission("SUPER_ADMIN", "social:review")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "social:review")).toBe(true);
    expect(roleHasPermission("REVIEWER", "social:review")).toBe(true);
  });

  it("denies SUPPORT", () => {
    expect(roleHasPermission("SUPPORT", "social:review")).toBe(false);
  });
});
