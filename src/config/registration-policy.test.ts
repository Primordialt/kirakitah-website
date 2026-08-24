import { describe, expect, it } from "vitest";
import {
  REGISTRATION_OPERATING_MODE,
  registrationPolicy,
} from "@/config/registration-policy";

describe("registration policy — KG926 MVP", () => {
  it("uses explicit MVP_MANUAL_REVIEW mode (not a hidden env flag)", () => {
    expect(REGISTRATION_OPERATING_MODE).toBe("MVP_MANUAL_REVIEW");
    expect(registrationPolicy.mode).toBe("MVP_MANUAL_REVIEW");
  });

  it("defers contact verification and keeps identity manual", () => {
    expect(registrationPolicy.contactVerification).toBe("DEFERRED");
    expect(registrationPolicy.identityVerification).toBe("MANUAL");
    expect(registrationPolicy.adminWorkflow).toBe("MANUAL_DEFERRED_AUTH");
    expect(registrationPolicy.initiateContactVerificationOnSubmit).toBe(false);
  });
});
