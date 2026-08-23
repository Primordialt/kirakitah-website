import { getDb } from "@/server/db";
import { adminAuditEvents } from "@/server/db/schema";
import type { AdminRole } from "@/server/admin/authorization/permissions";

export type AdminAuditEventType =
  | "ADMIN_LOGIN"
  | "IDENTITY_REVIEW_APPROVED"
  | "IDENTITY_REVIEW_REJECTED"
  | "APPLICATION_STATUS_CHANGED"
  | "SENSITIVE_IDENTITY_VIEWED"
  | "GUARDIAN_DATA_VIEWED"
  | "PLAYER_PHOTO_VIEWED"
  | "ELIGIBILITY_EVALUATED"
  | "PARTICIPANT_SELECTED"
  | "PARTICIPANT_WITHDRAWN"
  | "PARTICIPANT_DISQUALIFIED"
  | "PHASE_CREATED"
  | "PHASE_STARTED"
  | "PHASE_COMPLETED"
  | "MATCH_CREATED"
  | "MATCH_SCHEDULED"
  | "MATCH_RESULT_RECORDED"
  | "MATCH_RESULT_CORRECTED"
  | "MATCH_DISPUTED"
  | "MATCH_FORFEITED"
  | "QUALIFIER_ADVANCED"
  | "QUALIFICATION_POD_CREATED"
  | "QUALIFICATION_PARTICIPANT_ASSIGNED"
  | "QUALIFICATION_PARTICIPANT_REASSIGNED"
  | "QUALIFICATION_MATCH_CREATED"
  | "QUALIFICATION_MATCH_RESOLVED"
  | "QUALIFICATION_AUTO_ADVANCED"
  | "QUALIFICATION_POD_COMPLETED"
  | "QUALIFICATION_TOP32_ADVANCED"
  | "KNOCKOUT_PAIRINGS_CONFIGURED"
  | "KNOCKOUT_PAIRINGS_REVISED"
  | "KNOCKOUT_BRACKET_GENERATED"
  | "KNOCKOUT_MATCH_CREATED"
  | "KNOCKOUT_RESULT_RECORDED"
  | "KNOCKOUT_MATCH_RESOLVED"
  | "KNOCKOUT_RESULT_CORRECTED"
  | "KNOCKOUT_MATCH_DISPUTED"
  | "KNOCKOUT_FORFEIT_RECORDED"
  | "KNOCKOUT_ROUND_COMPLETED"
  | "TOURNAMENT_COMPLETED"
  | "CHAMPION_RECORDED";

/**
 * Append-only admin audit writer.
 * Never include NIN, passport, OTP, email, phone, or guardian contacts.
 */
export async function recordAdminAuditEvent(input: {
  eventType: AdminAuditEventType;
  actorId?: string;
  actorRole?: AdminRole;
  applicationId?: string;
  applicationReference?: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const db = getDb();
  await db.insert(adminAuditEvents).values({
    eventType: input.eventType,
    actorId: input.actorId,
    actorRole: input.actorRole,
    applicationId: input.applicationId,
    applicationReference: input.applicationReference,
    requestId: input.requestId,
    metadata: input.metadata,
  });
}
