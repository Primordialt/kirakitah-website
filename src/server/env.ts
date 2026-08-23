/**
 * Server-only environment variables.
 * Do not import this module from client components.
 */

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export type NinVerificationProviderMode = "mock" | "authorized";
export type ContactVerificationProviderMode = "mock" | "none";

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
    return value === "none" ? "none" : "mock";
  },

  get phoneVerificationProvider(): ContactVerificationProviderMode {
    const value = readEnv("PHONE_VERIFICATION_PROVIDER");
    return value === "none" ? "none" : "mock";
  },

  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },

  get isProduction() {
    return this.nodeEnv === "production";
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
