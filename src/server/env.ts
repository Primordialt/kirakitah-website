/**
 * Server-only environment variables.
 * Do not import this module from client components.
 */

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export type NinVerificationProviderMode = "mock" | "authorized";
export type ContactVerificationProviderMode = "mock" | "none" | "http";

export const serverEnv = {
  get databaseUrl() {
    return readEnv("DATABASE_URL");
  },

  get blobReadWriteToken() {
    return readEnv("BLOB_READ_WRITE_TOKEN");
  },

  /** 64-char hex key (32 bytes) for AES-256-GCM encryption of identification numbers */
  get registrationPiiEncryptionKey() {
    return readEnv("REGISTRATION_PII_ENCRYPTION_KEY");
  },

  get ninVerificationProvider(): NinVerificationProviderMode {
    const value = readEnv("NIN_VERIFICATION_PROVIDER");
    if (value === "authorized") return "authorized";
    return "mock";
  },

  get ninVerificationApiUrl() {
    return readEnv("NIN_VERIFICATION_API_URL");
  },

  get ninVerificationApiKey() {
    return readEnv("NIN_VERIFICATION_API_KEY");
  },

  get emailVerificationProvider(): ContactVerificationProviderMode {
    const value = readEnv("EMAIL_VERIFICATION_PROVIDER");
    if (value === "none") return "none";
    if (value === "http") return "http";
    if (value === "mock") return "mock";
    return this.isStrictProduction ? "http" : "mock";
  },

  get emailVerificationApiUrl() {
    return readEnv("EMAIL_VERIFICATION_API_URL");
  },

  get emailVerificationApiKey() {
    return readEnv("EMAIL_VERIFICATION_API_KEY");
  },

  get phoneVerificationProvider(): ContactVerificationProviderMode {
    const value = readEnv("PHONE_VERIFICATION_PROVIDER");
    if (value === "none") return "none";
    if (value === "http") return "http";
    if (value === "mock") return "mock";
    return this.isStrictProduction ? "http" : "mock";
  },

  get phoneVerificationApiUrl() {
    return readEnv("PHONE_VERIFICATION_API_URL");
  },

  get phoneVerificationApiKey() {
    return readEnv("PHONE_VERIFICATION_API_KEY");
  },

  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },

  /** Vercel deployment target when present: production | preview | development */
  get vercelEnv() {
    return readEnv("VERCEL_ENV");
  },

  get isProduction() {
    return this.nodeEnv === "production";
  },

  /**
   * True only on Vercel Production (or forced local production without VERCEL_ENV).
   * Preview may keep development-friendly defaults while still failing closed for mocks
   * when NODE_ENV is production and allowMock* is false via isProduction.
   */
  get isStrictProduction() {
    if (this.vercelEnv === "production") return true;
    if (this.vercelEnv === "preview" || this.vercelEnv === "development") {
      return false;
    }
    return this.isProduction && !this.isTest;
  },

  get isTest() {
    return this.nodeEnv === "test" || process.env.VITEST === "true";
  },

  /**
   * Mock contact providers are allowed outside Vercel Production.
   * NODE_ENV=production on Preview still blocks mocks (safe default).
   */
  get allowMockContactProviders() {
    return !this.isProduction || this.vercelEnv === "preview";
  },

  get adminAuthProvider(): "mock" | "http" | "unavailable" | "database" {
    const value = readEnv("ADMIN_AUTH_PROVIDER");
    if (value === "http") return "http";
    if (value === "mock") return "mock";
    if (value === "database") return "database";
    if (value === "unavailable") return "unavailable";
    // Production defaults to database password auth when DATABASE_URL exists.
    return this.isStrictProduction ? "database" : "mock";
  },

  get adminSessionSecret() {
    return readEnv("ADMIN_SESSION_SECRET");
  },

  get adminAuthApiUrl() {
    return readEnv("ADMIN_AUTH_API_URL");
  },

  get adminAuthApiKey() {
    return readEnv("ADMIN_AUTH_API_KEY");
  },

  /** Mock admin auth is never allowed on Vercel Production. */
  get allowMockAdminAuth() {
    return !this.isStrictProduction;
  },
} as const;

export function isRegistrationBackendConfigured(): boolean {
  return Boolean(
    serverEnv.databaseUrl &&
      serverEnv.blobReadWriteToken &&
      serverEnv.registrationPiiEncryptionKey,
  );
}

export function isVerificationConfigured(): boolean {
  /**
   * Production identity verification is manual (Step 3A).
   * Automated NIN provider credentials are optional future capability only.
   */
  return true;
}

export function isEmailDeliveryConfigured(): boolean {
  return (
    serverEnv.emailVerificationProvider === "http" &&
    Boolean(serverEnv.emailVerificationApiUrl) &&
    Boolean(serverEnv.emailVerificationApiKey)
  );
}

export function isPhoneDeliveryConfigured(): boolean {
  return (
    serverEnv.phoneVerificationProvider === "http" &&
    Boolean(serverEnv.phoneVerificationApiUrl) &&
    Boolean(serverEnv.phoneVerificationApiKey)
  );
}

/**
 * Production admin auth is configured when database password auth can run
 * (DATABASE_URL + session signing secret). Mock is allowed outside Production.
 */
export function isAdminAuthConfigured(): boolean {
  if (serverEnv.allowMockAdminAuth && serverEnv.adminAuthProvider === "mock") {
    return true;
  }

  const provider = serverEnv.adminAuthProvider;
  if (provider === "unavailable" || provider === "http") {
    return false;
  }

  return Boolean(
    serverEnv.databaseUrl &&
      (serverEnv.adminSessionSecret || serverEnv.registrationPiiEncryptionKey),
  );
}
