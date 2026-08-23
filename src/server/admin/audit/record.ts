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
  | "PLAYER_PHOTO_VIEWED";

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
