import { afterEach, describe, expect, it, vi } from "vitest";

describe("contact verification provider resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows mock providers outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_VERIFICATION_PROVIDER", "mock");
    vi.stubEnv("PHONE_VERIFICATION_PROVIDER", "mock");

    const { resetVerificationProvidersForTests, getVerificationProviders } =
      await import("@/server/verification");
    resetVerificationProvidersForTests();

    const providers = getVerificationProviders();
    expect(providers.email.providerId).toBe("mock");
    expect(providers.phone.providerId).toBe("mock");
  });

  it("fails closed when mock is requested in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_VERIFICATION_PROVIDER", "mock");
    vi.stubEnv("PHONE_VERIFICATION_PROVIDER", "mock");

    const { resetVerificationProvidersForTests, getVerificationProviders } =
      await import("@/server/verification");
    resetVerificationProvidersForTests();

    const providers = getVerificationProviders();
    expect(providers.email.providerId).toBe("unavailable");
    expect(providers.phone.providerId).toBe("unavailable");
  });

  it("fails closed for http mode without credentials", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_VERIFICATION_PROVIDER", "http");
    vi.stubEnv("PHONE_VERIFICATION_PROVIDER", "http");
    vi.stubEnv("EMAIL_VERIFICATION_API_URL", "");
    vi.stubEnv("EMAIL_VERIFICATION_API_KEY", "");
    vi.stubEnv("PHONE_VERIFICATION_API_URL", "");
    vi.stubEnv("PHONE_VERIFICATION_API_KEY", "");

    const { resetVerificationProvidersForTests, getVerificationProviders } =
      await import("@/server/verification");
    resetVerificationProvidersForTests();

    const providers = getVerificationProviders();
    expect(providers.email.providerId).toBe("unavailable");
    expect(providers.phone.providerId).toBe("unavailable");

    const email = await providers.email.sendVerificationEmail({
      email: "player@example.com",
      referenceId: "KG926-2026-TEST01",
      code: "123456",
      expiresInMinutes: 15,
    });
    expect(email.status).toBe("unavailable");
  });

  it("never returns OTP in delivery failure responses", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_VERIFICATION_PROVIDER", "http");

    const { resetVerificationProvidersForTests, getVerificationProviders } =
      await import("@/server/verification");
    resetVerificationProvidersForTests();

    const result = await getVerificationProviders().email.sendVerificationEmail({
      email: "player@example.com",
      referenceId: "KG926-2026-TEST01",
      code: "999888",
      expiresInMinutes: 15,
    });

    expect(JSON.stringify(result)).not.toContain("999888");
  });
});
