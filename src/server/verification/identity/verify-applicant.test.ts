import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  assertIdentityVerificationAllowed,
  IdentityVerificationError,
  verifyApplicantIdentity,
} from "@/server/verification/identity/verify-applicant";
import { resetVerificationProvidersForTests } from "@/server/verification";

vi.mock("@/server/verification", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/verification")>();
  return {
    ...actual,
    getVerificationProviders: vi.fn(),
  };
});

import { getVerificationProviders } from "@/server/verification";

const mockGetProviders = vi.mocked(getVerificationProviders);

describe("verifyApplicantIdentity", () => {
  beforeEach(() => {
    resetVerificationProvidersForTests();
    mockGetProviders.mockReset();
  });

  it("verifies matching NIN identity", async () => {
    mockGetProviders.mockReturnValue({
      nin: {
        providerId: "mock",
        lookupByNin: vi.fn().mockResolvedValue({
          status: "found",
          verifiedFullName: "Chidi Okafor",
          provider: "mock",
        }),
      },
      passport: { providerId: "manual-review", assess: vi.fn() },
      email: { providerId: "none", sendVerificationEmail: vi.fn() },
      phone: { providerId: "none", sendVerificationSms: vi.fn() },
    });

    const result = await verifyApplicantIdentity({
      identificationType: "nin",
      identificationNumber: "12345678901",
      fullName: "Chidi Okafor",
    });

    expect(result.outcome).toBe("verified");
  });

  it("rejects mismatched NIN names", async () => {
    mockGetProviders.mockReturnValue({
      nin: {
        providerId: "mock",
        lookupByNin: vi.fn().mockResolvedValue({
          status: "found",
          verifiedFullName: "Different Person",
          provider: "mock",
        }),
      },
      passport: { providerId: "manual-review", assess: vi.fn() },
      email: { providerId: "none", sendVerificationEmail: vi.fn() },
      phone: { providerId: "none", sendVerificationSms: vi.fn() },
    });

    const result = await verifyApplicantIdentity({
      identificationType: "nin",
      identificationNumber: "12345678901",
      fullName: "Chidi Okafor",
    });

    expect(result.outcome).toBe("mismatch");
    expect(() => assertIdentityVerificationAllowed(result)).toThrow(IdentityVerificationError);
  });

  it("flags passport applications for manual review without claiming verification", async () => {
    mockGetProviders.mockReturnValue({
      nin: { providerId: "mock", lookupByNin: vi.fn() },
      passport: {
        providerId: "manual-review",
        assess: vi.fn().mockResolvedValue({
          status: "manual_review_required",
          provider: "manual-review",
          message: "Manual review required",
        }),
      },
      email: { providerId: "none", sendVerificationEmail: vi.fn() },
      phone: { providerId: "none", sendVerificationSms: vi.fn() },
    });

    const result = await verifyApplicantIdentity({
      identificationType: "passport",
      identificationNumber: "A1234567",
      fullName: "Chidi Okafor",
    });

    expect(result.outcome).toBe("manual_review_required");
    expect(() => assertIdentityVerificationAllowed(result)).not.toThrow();
  });
});
