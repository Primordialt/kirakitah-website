import { describe, expect, it } from "vitest";
import { getProfileApplicationBlock } from "@/server/participant/application-gate";

describe("getProfileApplicationBlock", () => {
  it("blocks missing or incomplete profiles", () => {
    expect(getProfileApplicationBlock(null)?.code).toBe("PROFILE_INCOMPLETE");
    expect(getProfileApplicationBlock("incomplete")?.code).toBe(
      "PROFILE_INCOMPLETE",
    );
  });

  it("blocks needs_correction with reason", () => {
    const block = getProfileApplicationBlock(
      "needs_correction",
      "Photo is unclear.",
    );
    expect(block?.code).toBe("PROFILE_REQUIRES_CORRECTION");
    expect(block?.message).toBe("Photo is unclear.");
  });

  it("blocks submitted_for_review", () => {
    expect(getProfileApplicationBlock("submitted_for_review")?.code).toBe(
      "PROFILE_NOT_VERIFIED",
    );
  });

  it("allows verified profiles", () => {
    expect(getProfileApplicationBlock("verified")).toBeNull();
  });
});

describe("dashboard status labels", () => {
  it("maps all profile statuses", async () => {
    const { getProfileStatusLabel, getDashboardProfileCta } = await import(
      "@/lib/participant/dashboard-status"
    );
    expect(getProfileStatusLabel("incomplete")).toMatch(/Incomplete/i);
    expect(getProfileStatusLabel("submitted_for_review")).toMatch(/Submitted/i);
    expect(getProfileStatusLabel("needs_correction")).toMatch(/correction/i);
    expect(getProfileStatusLabel("verified")).toMatch(/Verified/i);
    expect(getDashboardProfileCta("incomplete").headline).toMatch(/COMPLETE/i);
    expect(getDashboardProfileCta("submitted_for_review").headline).toMatch(
      /PENDING/i,
    );
    expect(getDashboardProfileCta("needs_correction").headline).toMatch(
      /UPDATE REQUIRED/i,
    );
    expect(getDashboardProfileCta("verified").headline).toMatch(/READY TO APPLY/i);
  });
});
