import { getDb } from "@/server/db";
import { registrationAuditEvents } from "@/server/db/schema";

export type AuditEventType =
  | "EMAIL_VERIFIED"
  | "PHONE_VERIFIED"
  | "IDENTITY_REVIEW_APPROVED"
  | "IDENTITY_REVIEW_REJECTED"
  | "APPLICATION_STATUS_CHANGED";

/**
 * Records administrative / verification audit events.
 * Never include OTP, NIN, passport, email, phone, or guardian contacts in metadata.
 */
export async function recordAuditEvent(input: {
  applicationId: string;
  eventType: AuditEventType;
  actor?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const db = getDb();
  await db.insert(registrationAuditEvents).values({
    applicationId: input.applicationId,
    eventType: input.eventType,
    actor: input.actor,
    metadata: input.metadata,
  });
}
