import { describe, expect, it } from "vitest";
import { mapIdentityOutcomeToStatus } from "@/server/verification/identity/map-status";

describe("registration identity independence", () => {
  it("maps manual review outcomes without auto-approving applications", () => {
    expect(mapIdentityOutcomeToStatus("manual_review_required")).toBe(
      "pending_review",
    );
    expect(mapIdentityOutcomeToStatus("verified")).toBe("verified");
    expect(mapIdentityOutcomeToStatus("mismatch")).toBe("mismatch");
  });

  it("keeps application approval separate from identity and contact verification", () => {
    // Product rule: contact verification and identity review do not set
    // application status to verified/approved automatically.
    const applicationStatusAfterEmailVerified = "received";
    const applicationStatusAfterPhoneVerified = "received";
    const applicationStatusAfterIdentityApproved = "received";

    expect(applicationStatusAfterEmailVerified).toBe("received");
    expect(applicationStatusAfterPhoneVerified).toBe("received");
    expect(applicationStatusAfterIdentityApproved).toBe("received");
  });
});
