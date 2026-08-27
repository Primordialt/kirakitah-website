import { describe, expect, it } from "vitest";
import { getProfileApplicationBlock } from "@/server/participant/application-gate";

describe("application preflight helpers", () => {
  it("blocks incomplete profiles", () => {
    const block = getProfileApplicationBlock("incomplete");
    expect(block?.code).toBe("PROFILE_INCOMPLETE");
  });

  it("blocks profiles awaiting verification", () => {
    const block = getProfileApplicationBlock("submitted_for_review");
    expect(block?.code).toBe("PROFILE_NOT_VERIFIED");
  });

  it("allows verified profiles through the profile gate", () => {
    expect(getProfileApplicationBlock("verified")).toBeNull();
  });
});
