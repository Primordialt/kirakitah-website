import { randomInt } from "crypto";
import { getDb } from "@/server/db";
import { registrationVerificationChallenges } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { hashSensitiveValue } from "@/server/registration/pii";
import { eq } from "drizzle-orm";
import type { IEmailVerificationProvider, EmailVerificationRequest } from "./types";
import type {
  SendVerificationChallengeResult,
  VerifyChallengeResult,
} from "@/server/verification/types";

const CHALLENGE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export class MockEmailVerificationProvider implements IEmailVerificationProvider {
  readonly providerId = "mock";

  async sendChallenge(
    request: EmailVerificationRequest,
  ): Promise<SendVerificationChallengeResult> {
    const encryptionKey = serverEnv.registrationPiiEncryptionKey;
    if (!encryptionKey) {
      return {
        status: "unavailable",
        provider: this.providerId,
        message: "Verification encryption key is not configured",
      };
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    const db = getDb();

    const [challenge] = await db
      .insert(registrationVerificationChallenges)
      .values({
        applicationId: request.applicationId,
        channel: "email",
        destinationHash: hashSensitiveValue(request.email.toLowerCase(), encryptionKey),
        codeHash: hashSensitiveValue(code, encryptionKey),
        expiresAt,
      })
      .returning({ id: registrationVerificationChallenges.id });

    if (serverEnv.nodeEnv === "development") {
      console.info(
        `[mock-email-verification] reference=${request.referenceId} code=${code}`,
      );
    }

    return {
      status: "sent",
      provider: this.providerId,
      challengeId: challenge.id,
    };
  }

  async verifyChallenge(
    challengeId: string,
    code: string,
  ): Promise<VerifyChallengeResult> {
    const encryptionKey = serverEnv.registrationPiiEncryptionKey;
    if (!encryptionKey) {
      return { status: "invalid", message: "Verification is unavailable" };
    }

    const db = getDb();
    const [challenge] = await db
      .select()
      .from(registrationVerificationChallenges)
      .where(eq(registrationVerificationChallenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      return { status: "invalid", message: "Verification challenge not found" };
    }

    if (challenge.verifiedAt) {
      return { status: "verified" };
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      return { status: "expired", message: "Verification code has expired" };
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      return { status: "too_many_attempts", message: "Too many verification attempts" };
    }

    const codeMatches =
      challenge.codeHash === hashSensitiveValue(code, encryptionKey);

    await db
      .update(registrationVerificationChallenges)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(registrationVerificationChallenges.id, challengeId));

    if (!codeMatches) {
      return { status: "invalid", message: "Invalid verification code" };
    }

    const verifiedAt = new Date().toISOString();
    await db
      .update(registrationVerificationChallenges)
      .set({ verifiedAt })
      .where(eq(registrationVerificationChallenges.id, challengeId));

    return { status: "verified" };
  }
}
