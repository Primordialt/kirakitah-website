import { serverEnv } from "@/server/env";
import type { INinVerificationProvider, NinVerificationRequest } from "./types";
import type { NinLookupResult } from "@/server/verification/types";

/**
 * HTTP client for an authorized NIN verification API.
 *
 * Does NOT scrape POSSAP or automate third-party websites.
 * Expects a licensed provider endpoint configured via environment variables.
 *
 * Expected JSON response shape (provider-specific mapping may be adjusted
 * when official credentials and API documentation are available):
 * { "found": true, "fullName": "Registered Full Name" }
 */
export class AuthorizedHttpNinVerificationProvider implements INinVerificationProvider {
  readonly providerId = "authorized-http";

  async lookupByNin(request: NinVerificationRequest): Promise<NinLookupResult> {
    const apiUrl = serverEnv.ninVerificationApiUrl;
    const apiKey = serverEnv.ninVerificationApiKey;

    if (!apiUrl || !apiKey) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Authorized NIN provider credentials are not configured",
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          nin: request.nin,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        return {
          status: "error",
          provider: this.providerId,
          message: `NIN provider returned HTTP ${response.status}`,
        };
      }

      const payload = (await response.json()) as {
        found?: boolean;
        fullName?: string;
      };

      if (!payload.found || !payload.fullName) {
        return {
          status: "not_found",
          provider: this.providerId,
        };
      }

      return {
        status: "found",
        verifiedFullName: payload.fullName,
        provider: this.providerId,
      };
    } catch {
      return {
        status: "error",
        provider: this.providerId,
        message: "NIN provider request failed",
      };
    }
  }
}
