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
