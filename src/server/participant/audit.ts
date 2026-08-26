import { getDb } from "@/server/db";
import { participantAuditEvents } from "@/server/db/schema";

export type ParticipantAuditEventType =
  | "PARTICIPANT_ACCOUNT_CREATED"
  | "PARTICIPANT_EMAIL_VERIFIED"
  | "PARTICIPANT_LOGIN_SUCCESS"
  | "PARTICIPANT_LOGIN_FAILURE"
  | "PARTICIPANT_LOGOUT"
  | "PARTICIPANT_PASSWORD_RESET_REQUESTED"
  | "PARTICIPANT_PASSWORD_RESET_COMPLETED"
  | "PARTICIPANT_PROFILE_SUBMITTED"
  | "PARTICIPANT_PROFILE_UPDATED"
  | "PARTICIPANT_PROFILE_APPROVED"
  | "PARTICIPANT_PROFILE_REJECTED";

/**
 * Append-only participant audit writer.
 * Never include passwords, OTP, NIN, passport, email, phone, or guardian contacts.
 */
export async function recordParticipantAuditEvent(input: {
  eventType: ParticipantAuditEventType;
  accountId?: string | null;
  actor?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const db = getDb();
  await db.insert(participantAuditEvents).values({
    eventType: input.eventType,
    accountId: input.accountId ?? null,
    actor: input.actor,
    metadata: input.metadata,
  });
}
