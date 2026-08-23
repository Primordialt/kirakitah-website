import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  registrationVerificationChallenges,
} from "@/server/db/schema";
import { getVerificationProviders } from "@/server/verification";

export async function initiateContactVerification(options: {
  applicationId: string;
  referenceId: string;
  email: string;
  phone: string;
}): Promise<void> {
  const providers = getVerificationProviders();
  const db = getDb();

  const emailResult = await providers.email.sendChallenge({
    applicationId: options.applicationId,
    referenceId: options.referenceId,
    email: options.email,
  });

  const phoneResult = await providers.phone.sendChallenge({
    applicationId: options.applicationId,
    referenceId: options.referenceId,
    phone: options.phone,
  });

  await db
    .update(registrationApplications)
    .set({
      emailVerificationStatus:
        emailResult.status === "sent" ? "pending" : "skipped",
      phoneVerificationStatus:
        phoneResult.status === "sent" ? "pending" : "skipped",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(registrationApplications.id, options.applicationId));
}

export async function verifyContactChallenge(options: {
  referenceId: string;
  channel: "email" | "phone";
  challengeId: string;
  code: string;
}): Promise<{ verified: boolean; message?: string }> {
  const db = getDb();
  const [application] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, options.referenceId))
    .limit(1);

  if (!application) {
    return { verified: false, message: "Application not found" };
  }

  const [challenge] = await db
    .select()
    .from(registrationVerificationChallenges)
    .where(eq(registrationVerificationChallenges.id, options.challengeId))
    .limit(1);

  if (!challenge || challenge.applicationId !== application.id) {
    return { verified: false, message: "Verification challenge not found" };
  }

  if (challenge.channel !== options.channel) {
    return { verified: false, message: "Verification channel mismatch" };
  }

  const providers = getVerificationProviders();
  const provider =
    options.channel === "email" ? providers.email : providers.phone;
  const result = await provider.verifyChallenge(options.challengeId, options.code);

  if (result.status !== "verified") {
    return { verified: false, message: result.message ?? "Verification failed" };
  }

  await db
    .update(registrationApplications)
    .set({
      ...(options.channel === "email"
        ? { emailVerificationStatus: "verified" as const }
        : { phoneVerificationStatus: "verified" as const }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(registrationApplications.id, application.id));

  return { verified: true };
}
