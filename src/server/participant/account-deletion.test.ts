import { describe, expect, it } from "vitest";
import { ParticipantAccountDeletionError } from "@/server/participant/account-deletion";

describe("participant account deletion errors", () => {
  it("requires DELETE confirmation messaging without leaking PII", () => {
    const error = new ParticipantAccountDeletionError(
      "VALIDATION_ERROR",
      "Type DELETE to confirm account deletion.",
    );
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).not.toMatch(/email|password|nin|phone/i);
  });

  it("uses controlled conflict copy for active tournament participation", () => {
    const error = new ParticipantAccountDeletionError(
      "CONFLICT",
      "Your account cannot currently be deleted because you have an active tournament participation record.",
      409,
    );
    expect(error.status).toBe(409);
    expect(error.message).not.toMatch(/another|selected for|qualified/i);
  });
});
