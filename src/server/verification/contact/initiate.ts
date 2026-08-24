import { eq } from "drizzle-orm";
import { registrationPolicy } from "@/config/registration-policy";
import { getDb } from "@/server/db";
import { registrationApplications } from "@/server/db/schema";
import {
  ContactVerificationError,
  createAndDeliverChallenge,
} from "@/server/verification/contact/challenges";
import type { ContactChannelInitResult } from "@/server/verification/types";

export interface InitiateContactVerificationResult {
  email: ContactChannelInitResult;
  phone: ContactChannelInitResult;
}

/**
 * Starts email and phone ownership challenges after registration persistence.
 * Identity verification remains independent (pending_review / manual).
 *
 * MVP_MANUAL_REVIEW: contact verification is DEFERRED — statuses stay pending,
 * no OTP is generated or delivered, architecture remains for later activation.
 */
export async function initiateContactVerification(options: {
  applicationId: string;
  referenceId: string;
  email: string;
  phone: string;
}): Promise<InitiateContactVerificationResult> {
  const db = getDb();

  if (!registrationPolicy.initiateContactVerificationOnSubmit) {
    const deferred: ContactChannelInitResult = {
      status: "pending",
      provider: "deferred",
      message:
        "Contact verification is deferred for MVP_MANUAL_REVIEW. The KIRAKITAH team will contact you with next steps.",
    };

    await db
      .update(registrationApplications)
      .set({
        emailVerificationStatus: "pending",
        phoneVerificationStatus: "pending",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(registrationApplications.id, options.applicationId));

    return { email: deferred, phone: deferred };
  }

  let emailResult: ContactChannelInitResult;
  try {
    emailResult = await createAndDeliverChallenge({
      applicationId: options.applicationId,
      referenceId: options.referenceId,
      channel: "email",
      email: options.email,
      phone: options.phone,
      supersedePrevious: true,
    });
  } catch (error) {
    if (error instanceof ContactVerificationError) {
      emailResult = {
        status: "unavailable",
        provider: "rate-limited",
        message: error.message,
        resendAvailableAt: error.resendAvailableAt,
      };
    } else {
      emailResult = {
        status: "unavailable",
        provider: "error",
        message: "Unable to start email verification.",
      };
    }
  }

  let phoneResult: ContactChannelInitResult;
  try {
    phoneResult = await createAndDeliverChallenge({
      applicationId: options.applicationId,
      referenceId: options.referenceId,
      channel: "phone",
      email: options.email,
      phone: options.phone,
      supersedePrevious: true,
    });
  } catch (error) {
    if (error instanceof ContactVerificationError) {
      phoneResult = {
        status: "unavailable",
        provider: "rate-limited",
        message: error.message,
        resendAvailableAt: error.resendAvailableAt,
      };
    } else {
      phoneResult = {
        status: "unavailable",
        provider: "error",
        message: "Unable to start phone verification.",
      };
    }
  }

  // DB enum is pending | verified | skipped — never persist "unavailable".
  await db
    .update(registrationApplications)
    .set({
      emailVerificationStatus: toPersistedContactStatus(emailResult.status),
      phoneVerificationStatus: toPersistedContactStatus(phoneResult.status),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(registrationApplications.id, options.applicationId));

  return { email: emailResult, phone: phoneResult };
}

function toPersistedContactStatus(
  status: ContactChannelInitResult["status"],
): "pending" | "verified" | "skipped" {
  if (status === "verified") return "verified";
  if (status === "skipped") return "skipped";
  return "pending";
}

export {
  verifyContactChallenge,
  resendContactChallenge,
  ContactVerificationError,
} from "@/server/verification/contact/challenges";
