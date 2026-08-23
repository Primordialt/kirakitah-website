import { serverEnv } from "@/server/env";
import { AuthorizedHttpNinVerificationProvider } from "@/server/verification/nin/authorized-http";
import { MockNinVerificationProvider } from "@/server/verification/nin/mock";
import type { INinVerificationProvider } from "@/server/verification/nin/types";
import type { NinLookupResult } from "@/server/verification/types";
import { StubPassportVerificationProvider } from "@/server/verification/passport/stub";
import type { IPassportVerificationProvider } from "@/server/verification/passport/types";
import { MockEmailVerificationProvider } from "@/server/verification/email/mock";
import type { IEmailVerificationProvider } from "@/server/verification/email/types";
import { MockPhoneVerificationProvider } from "@/server/verification/phone/mock";
import type { IPhoneVerificationProvider } from "@/server/verification/phone/types";

export interface VerificationProviders {
  nin: INinVerificationProvider;
  passport: IPassportVerificationProvider;
  email: IEmailVerificationProvider;
  phone: IPhoneVerificationProvider;
}

/**
 * Production registration does not call NIN providers (manual review).
 * This stub exists so factory resolution never accidentally enables lookups.
 */
class DisabledNinVerificationProvider implements INinVerificationProvider {
  readonly providerId = "disabled";

  async lookupByNin(): Promise<NinLookupResult> {
    return {
      status: "unavailable",
      provider: this.providerId,
      message:
        "Automated NIN verification is not enabled for production. Use manual review.",
    };
  }
}

function resolveNinProvider(): INinVerificationProvider {
  // Production registration uses manual identity review (Step 3A).
  // Automated providers remain available only when explicitly authorized.
  if (serverEnv.isProduction && serverEnv.ninVerificationProvider !== "authorized") {
    return new DisabledNinVerificationProvider();
  }

  const mode = serverEnv.ninVerificationProvider;

  if (mode === "authorized") {
    return new AuthorizedHttpNinVerificationProvider();
  }

  return new MockNinVerificationProvider();
}

function resolveEmailProvider(): IEmailVerificationProvider {
  const mode = serverEnv.emailVerificationProvider;

  if (mode === "mock") {
    return new MockEmailVerificationProvider();
  }

  if (mode === "none") {
    return {
      providerId: "none",
      async sendChallenge() {
        return { status: "skipped", provider: "none" };
      },
      async verifyChallenge() {
        return { status: "invalid", message: "Email verification is disabled" };
      },
    };
  }

  throw new Error(
    "Email verification provider is not configured. Set EMAIL_VERIFICATION_PROVIDER.",
  );
}

function resolvePhoneProvider(): IPhoneVerificationProvider {
  const mode = serverEnv.phoneVerificationProvider;

  if (mode === "mock") {
    return new MockPhoneVerificationProvider();
  }

  if (mode === "none") {
    return {
      providerId: "none",
      async sendChallenge() {
        return { status: "skipped", provider: "none" };
      },
      async verifyChallenge() {
        return { status: "invalid", message: "Phone verification is disabled" };
      },
    };
  }

  throw new Error(
    "Phone verification provider is not configured. Set PHONE_VERIFICATION_PROVIDER.",
  );
}

let cachedProviders: VerificationProviders | null = null;

export function getVerificationProviders(): VerificationProviders {
  if (!cachedProviders) {
    cachedProviders = {
      nin: resolveNinProvider(),
      passport: new StubPassportVerificationProvider(),
      email: resolveEmailProvider(),
      phone: resolvePhoneProvider(),
    };
  }
  return cachedProviders;
}

/** Resets cached providers — for tests only. */
export function resetVerificationProvidersForTests(): void {
  cachedProviders = null;
}
