import { describe, expect, it } from "vitest";
import {
  getApplicationStatusPresentation,
  getEligibilityPresentation,
  getIdentityStatusPresentation,
  getSelectionPresentation,
  getSocialAggregatePresentation,
  getSocialPlatformPresentation,
} from "@/lib/participant/tournament-status";

describe("participant tournament status presentation", () => {
  it("maps application statuses without inventing new backend values", () => {
    expect(getApplicationStatusPresentation("received").label).toBe(
      "APPLICATION RECEIVED",
    );
    expect(getApplicationStatusPresentation("under_review").label).toBe(
      "UNDER REVIEW",
    );
    expect(getApplicationStatusPresentation("verified").label).toBe(
      "APPLICATION APPROVED",
    );
    expect(getApplicationStatusPresentation("verified").description).not.toMatch(
      /qualified/i,
    );
  });

  it("distinguishes eligibility from selection language", () => {
    expect(getEligibilityPresentation("ELIGIBLE").label).toBe("ELIGIBLE");
    expect(getEligibilityPresentation("ELIGIBLE").description).toMatch(
      /Selection is a separate step/i,
    );
    expect(getSelectionPresentation("selected").label).toBe("SELECTED");
    expect(getSelectionPresentation("selected").description).toMatch(
      /Qualification is a separate phase/i,
    );
  });

  it("maps identity and social verification safely", () => {
    expect(getIdentityStatusPresentation("pending_review").label).toBe(
      "Pending review",
    );
    expect(getIdentityStatusPresentation("verified").tone).toBe("verified");
    expect(getSocialAggregatePresentation("pending_review").label).toBe(
      "Pending review",
    );
    expect(getSocialPlatformPresentation("verified").label).toBe("Verified");
  });
});
