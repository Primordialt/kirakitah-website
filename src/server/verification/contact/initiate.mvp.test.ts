import { beforeEach, describe, expect, it, vi } from "vitest";
import { registrationPolicy } from "@/config/registration-policy";

const updateSet = vi.fn();
const updateWhere = vi.fn();

vi.mock("@/server/db", () => ({
  getDb: () => ({
    update: () => ({
      set: (values: unknown) => {
        updateSet(values);
        return {
          where: (...args: unknown[]) => {
            updateWhere(...args);
            return Promise.resolve();
          },
        };
      },
    }),
  }),
}));

const createAndDeliverChallenge = vi.fn();

vi.mock("@/server/verification/contact/challenges", () => ({
  ContactVerificationError: class ContactVerificationError extends Error {},
  createAndDeliverChallenge: (...args: unknown[]) =>
    createAndDeliverChallenge(...args),
  verifyContactChallenge: vi.fn(),
  resendContactChallenge: vi.fn(),
}));

import { initiateContactVerification } from "@/server/verification/contact/initiate";

describe("initiateContactVerification — MVP deferred", () => {
  beforeEach(() => {
    updateSet.mockClear();
    updateWhere.mockClear();
    createAndDeliverChallenge.mockClear();
  });

  it("does not generate or deliver OTP when contact verification is deferred", async () => {
    expect(registrationPolicy.initiateContactVerificationOnSubmit).toBe(false);

    const result = await initiateContactVerification({
      applicationId: "00000000-0000-4000-8000-000000000001",
      referenceId: "KG926-2026-ABCDEF",
      email: "applicant@example.com",
      phone: "08012345678",
    });

    expect(createAndDeliverChallenge).not.toHaveBeenCalled();
    expect(result.email.status).toBe("pending");
    expect(result.phone.status).toBe("pending");
    expect(result.email.challengeId).toBeUndefined();
    expect(result.phone.challengeId).toBeUndefined();
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationStatus: "pending",
        phoneVerificationStatus: "pending",
      }),
    );
  });
});
