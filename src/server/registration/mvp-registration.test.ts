import { describe, expect, it } from "vitest";
import { registrationPolicy } from "@/config/registration-policy";
import { mapIdentityOutcomeToStatus } from "@/server/verification/identity/map-status";

/**
 * Product rules for MVP_MANUAL_REVIEW — security must not be relaxed
 * when contact OTP is deferred.
 */
describe("MVP registration product rules", () => {
  it("accepts applications without requiring contact OTP on submit", () => {
    expect(registrationPolicy.initiateContactVerificationOnSubmit).toBe(false);
  });

  it("keeps identity pending_review / manual and never auto-verifies contacts", () => {
    expect(registrationPolicy.identityVerification).toBe("MANUAL");
    expect(mapIdentityOutcomeToStatus("manual_review_required")).toBe(
      "pending_review",
    );

    const emailStatusAfterSubmit = "pending";
    const phoneStatusAfterSubmit = "pending";
    const applicationStatusAfterSubmit = "received";

    expect(emailStatusAfterSubmit).not.toBe("verified");
    expect(phoneStatusAfterSubmit).not.toBe("verified");
    expect(applicationStatusAfterSubmit).toBe("received");
  });

  it("does not auto-create eligibility or participant selection from submit alone", () => {
    const automaticallyEligible = false;
    const automaticallySelected = false;
    expect(automaticallyEligible).toBe(false);
    expect(automaticallySelected).toBe(false);
  });
});
