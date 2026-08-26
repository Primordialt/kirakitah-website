import { serverEnv } from "@/server/env";
import { AuthorizedHttpNinVerificationProvider } from "@/server/verification/nin/authorized-http";
import { MockNinVerificationProvider } from "@/server/verification/nin/mock";
import type { INinVerificationProvider } from "@/server/verification/nin/types";
import type { NinLookupResult } from "@/server/verification/types";
import { StubPassportVerificationProvider } from "@/server/verification/passport/stub";
import type { IPassportVerificationProvider } from "@/server/verification/passport/types";
import {
  HttpEmailDeliveryProvider,
  SkippedEmailDeliveryProvider,
  UnavailableEmailDeliveryProvider,
} from "@/server/verification/email/http";
import { MockEmailDeliveryProvider } from "@/server/verification/email/mock";
import { ResendEmailDeliveryProvider } from "@/server/verification/email/resend";
import type { IEmailDeliveryProvider } from "@/server/verification/email/types";
import {
  HttpPhoneDeliveryProvider,
  SkippedPhoneDeliveryProvider,
  UnavailablePhoneDeliveryProvider,
} from "@/server/verification/phone/http";
import { MockPhoneDeliveryProvider } from "@/server/verification/phone/mock";
import type { IPhoneDeliveryProvider } from "@/server/verification/phone/types";

export interface VerificationProviders {
  nin: INinVerificationProvider;
  passport: IPassportVerificationProvider;
  email: IEmailDeliveryProvider;
  phone: IPhoneDeliveryProvider;
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
  if (serverEnv.isProduction && serverEnv.ninVerificationProvider !== "authorized") {
    return new DisabledNinVerificationProvider();
  }

  if (serverEnv.ninVerificationProvider === "authorized") {
    return new AuthorizedHttpNinVerificationProvider();
  }

  return new MockNinVerificationProvider();
}

/**
 * Production must NOT use mock contact providers.
 * Missing/incomplete production configuration fails closed.
 */
function resolveEmailProvider(): IEmailDeliveryProvider {
  const mode = serverEnv.emailVerificationProvider;

  if (mode === "none") {
    return new SkippedEmailDeliveryProvider();
  }

  if (mode === "mock") {
    if (!serverEnv.allowMockContactProviders) {
      return new UnavailableEmailDeliveryProvider();
    }
    return new MockEmailDeliveryProvider();
  }

  if (mode === "resend") {
    if (!serverEnv.resendApiKey) {
      return new UnavailableEmailDeliveryProvider();
    }
    return new ResendEmailDeliveryProvider();
  }

  if (mode === "http") {
    if (!serverEnv.emailVerificationApiUrl || !serverEnv.emailVerificationApiKey) {
      return new UnavailableEmailDeliveryProvider();
    }
    return new HttpEmailDeliveryProvider();
  }

  return new UnavailableEmailDeliveryProvider();
}

function resolvePhoneProvider(): IPhoneDeliveryProvider {
  const mode = serverEnv.phoneVerificationProvider;

  if (mode === "none") {
    return new SkippedPhoneDeliveryProvider();
  }

  if (mode === "mock") {
    if (!serverEnv.allowMockContactProviders) {
      return new UnavailablePhoneDeliveryProvider();
    }
    return new MockPhoneDeliveryProvider();
  }

  if (mode === "http") {
    if (!serverEnv.phoneVerificationApiUrl || !serverEnv.phoneVerificationApiKey) {
      return new UnavailablePhoneDeliveryProvider();
    }
    return new HttpPhoneDeliveryProvider();
  }

  return new UnavailablePhoneDeliveryProvider();
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
