import { describe, expect, it } from "vitest";
import {
  applicationNeedsYouTubeSubscriptionAttestation,
  deriveApplicationSocialFollowStatus,
} from "@/server/registration/social-follow";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { YOUTUBE_SUBSCRIPTION_PENDING_HANDLE } from "@/config/social";

describe("social follow status derivation", () => {
  it("is pending when platforms are incomplete", () => {
    expect(
      deriveApplicationSocialFollowStatus(["verified", "verified", "verified"], 4),
    ).toBe("pending_review");
  });

  it("is pending when any required platform is pending", () => {
    expect(
      deriveApplicationSocialFollowStatus(
        ["verified", "pending", "verified", "verified"],
        4,
      ),
    ).toBe("pending_review");
  });

  it("is rejected when any required platform is rejected", () => {
    expect(
      deriveApplicationSocialFollowStatus(
        ["verified", "rejected", "verified", "verified"],
        4,
      ),
    ).toBe("rejected");
  });

  it("is verified when all four required platforms are verified", () => {
    expect(
      deriveApplicationSocialFollowStatus(
        ["verified", "verified", "verified", "verified"],
        4,
      ),
    ).toBe("verified");
  });

  it("is not eligible when YouTube is missing from a three-platform verified set", () => {
    expect(
      deriveApplicationSocialFollowStatus(
        ["verified", "verified", "verified"],
        4,
      ),
    ).toBe("pending_review");
  });
});

describe("YouTube subscription attestation detection", () => {
  it("requires attestation when YouTube row is missing", () => {
    expect(
      applicationNeedsYouTubeSubscriptionAttestation([
        { platform: "x", applicantHandle: "player" },
      ]),
    ).toBe(true);
  });

  it("requires attestation when YouTube is pending attestation", () => {
    expect(
      applicationNeedsYouTubeSubscriptionAttestation([
        {
          platform: "youtube",
          applicantHandle: YOUTUBE_SUBSCRIPTION_PENDING_HANDLE,
        },
      ]),
    ).toBe(true);
  });

  it("does not require attestation after participant attests", () => {
    expect(
      applicationNeedsYouTubeSubscriptionAttestation([
        {
          platform: "youtube",
          applicantHandle: "Subscription attested — pending review",
        },
      ]),
    ).toBe(false);
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
