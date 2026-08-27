import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DUPLICATE_EMAIL_MESSAGE,
  normalizeRegistrationEmail,
  PreRegistrationEmailError,
} from "@/server/verification/email/pre-registration";

describe("pre-registration email helpers", () => {
  it("normalizes email for binding", () => {
    expect(normalizeRegistrationEmail("  Ada@Example.COM ")).toBe(
      "ada@example.com",
    );
  });

  it("uses the approved duplicate email message", () => {
    expect(DUPLICATE_EMAIL_MESSAGE).toBe(
      "This email is already registered for KIRAKITAH GAMING 926. Please log in to continue.",
    );
  });

  it("maps EMAIL_VERIFICATION_REQUIRED", () => {
    const error = new PreRegistrationEmailError(
      "EMAIL_VERIFICATION_REQUIRED",
      "Verify your email address before submitting your application.",
    );
    expect(error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
  });
});

describe("pre-registration email service (mocked provider)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("REGISTRATION_PII_ENCRYPTION_KEY", "a".repeat(64));
    vi.stubEnv("EMAIL_VERIFICATION_PROVIDER", "mock");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("rejects submission assertion without a token", async () => {
    const { assertPreRegistrationEmailVerified } = await import(
      "@/server/verification/email/pre-registration"
    );

    await expect(
      assertPreRegistrationEmailVerified({
        email: "player@example.com",
        emailVerificationToken: undefined,
      }),
    ).rejects.toMatchObject({ code: "EMAIL_VERIFICATION_REQUIRED" });
  });
});
