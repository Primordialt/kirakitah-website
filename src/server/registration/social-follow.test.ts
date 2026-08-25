import { describe, expect, it } from "vitest";
import { deriveApplicationSocialFollowStatus } from "@/server/registration/social-follow";
import { roleHasPermission } from "@/server/admin/authorization/permissions";

describe("social follow status derivation", () => {
  it("is pending when platforms are incomplete", () => {
    expect(deriveApplicationSocialFollowStatus(["verified", "verified"])).toBe(
      "pending_review",
    );
  });

  it("is pending when any platform is pending", () => {
    expect(
      deriveApplicationSocialFollowStatus(["verified", "pending", "verified"]),
    ).toBe("pending_review");
  });

  it("is rejected when any platform is rejected", () => {
    expect(
      deriveApplicationSocialFollowStatus(["verified", "rejected", "verified"]),
    ).toBe("rejected");
  });

  it("is verified when all required platforms are verified", () => {
    expect(
      deriveApplicationSocialFollowStatus(["verified", "verified", "verified"]),
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
